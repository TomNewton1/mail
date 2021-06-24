import sys
import os
import uuid
import json
from typing import Any
import threading
import subprocess
from appdirs import user_data_dir
from pathlib import Path
import sqlite3
import time
import logging

from django.utils import timezone
from django.db import connection
from django.conf import settings

from . import __version__

logger = logging.getLogger("kolo")


cwd = os.getcwd()


def serialize_frame_locals(frame) -> str:
    frame_locals = frame.f_locals
    serialized_locals = {}
    for key in frame_locals.keys():
        try:
            json.dumps(frame_locals[key])
        except (TypeError, OverflowError):
            try:
                str(frame_locals[key])
            except AttributeError:
                value = "SerializationError"
            else:
                value = str(frame_locals[key])
        else:
            value = frame_locals[key]

        serialized_locals[key] = value

    return json.dumps(serialized_locals, indent=2)


def serialize_potential_json(arg: Any) -> str:
    if arg is None:
        return str(arg)

    try:
        return json.dumps(arg)
    except (TypeError, OverflowError):
        return str(arg)


class KoloMiddleware:
    def should_enable(self) -> bool:
        if settings.DEBUG is False:
            return False

        if os.environ.get("KOLO_DISABLE", "false").lower() not in ["false", "0"]:
            return False

        return True

    def get_db_path(self) -> str:
        data_directory = user_data_dir(appname="kolo", appauthor="kolo")

        storage_path = os.path.join(data_directory, "storage")
        Path(storage_path).mkdir(parents=True, exist_ok=True)

        custom_database_name = os.environ.get("KOLO_PROJECT_NAME")

        if custom_database_name is not None:
            database_name = custom_database_name.lower()
        else:
            current_folder_name = os.path.basename(cwd).lower()
            database_name = current_folder_name

        return os.path.join(storage_path, f"{database_name}.sqlite3")

    def create_invocations_table(self) -> None:
        create_table_query = """
        CREATE TABLE IF NOT EXISTS invocations (
            id text PRIMARY KEY NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            data text NOT NULL
        );
        """

        create_timestamp_index_query = """
            CREATE INDEX IF NOT EXISTS
            idx_invocations_created_at
            ON invocations (created_at);
            """

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(create_table_query)
        cursor.execute(create_timestamp_index_query)
        cursor.close()
        conn.close()

    def save_invocation_in_sqlite(self, json_string: str) -> None:
        insert_sql = """
            INSERT OR IGNORE INTO invocations(id, data)
            VALUES(?,?)
            """

        # We can't reuse a connection
        # because we're in a new thread
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(insert_sql, (self.invocation_id, json_string))
        conn.commit()
        cursor.close()
        conn.close()

    def __init__(self, get_response):
        self.get_response = get_response

        if self.should_enable():
            self.db_path = self.get_db_path()

            self.create_invocations_table()

    def __call__(self, request, *args, **kwargs):
        if not self.should_enable():
            return self.get_response(request)

        if "kolo" in request.path_info:
            return self.get_response(request)

        start_time = timezone.now()

        self.invocation_id = f"inv_{uuid.uuid4()}"
        self.timestamp = timezone.now()
        self.frames_of_interest = []
        self.request = {
            "method": request.method,
            "path_info": request.path_info,
            "body": request.body.decode("utf-8"),
            "headers": {key: value for key, value in request.headers.items()},
        }
        self.api_requests_made = []
        self.jobs_enqueued = []

        sys.setprofile(self.generate_profile_callback_function())  # type: ignore # make this function typed

        response = self.get_response(request)

        duration = timezone.now() - start_time

        self.response = {
            "ms_duration": round(duration.total_seconds() * 1000, 2),
            "status_code": response.status_code,
            "content": response.content.decode(response.charset),
            "headers": {key: value for key, value in response.items()},
        }
        self.sql_queries_made = connection.queries

        threading.Thread(target=self._save_request_in_db).start()

        # eventual todo: restore previously set profile
        return response

    def _save_request_in_db(self) -> None:
        current_commit_sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], stdout=subprocess.PIPE
        ).stdout.decode("utf-8")
        if current_commit_sha.endswith("\n"):
            # Remove \n (which is considered to be one character)
            current_commit_sha = current_commit_sha[:-1]

        json_data = {
            "request_id": self.invocation_id,
            "invocation_id": self.invocation_id,
            "current_commit_sha": current_commit_sha,
            "request": self.request,
            "response": self.response,
            "timestamp": str(self.timestamp),
            "sql_queries_made": self.sql_queries_made,
            "api_requests_made": self.api_requests_made,
            "jobs_enqueued": self.jobs_enqueued,
            "frames_of_interest": self.frames_of_interest,
            "meta": {"version": __version__},
        }

        self.save_invocation_in_sqlite(json.dumps(json_data))

    def process_api_request_made(self, frame, event) -> None:
        if event == "return":
            return

        frame_locals = frame.f_locals

        scheme = frame_locals["self"].scheme
        host = frame_locals["self"].host
        url = frame_locals["url"]
        full_url = f"{scheme}://{host}{url}"

        request_headers = frame_locals["headers"]

        request_body = frame_locals["body"]

        if isinstance(request_body, bytes):
            body = request_body.decode("utf-8")
        else:
            body = request_body

        method = frame_locals["method"].upper()
        method_and_full_url = f"{method} {full_url}"

        api_request = {
            "request": {
                "method": method,
                "url": full_url,
                "method_and_full_url": method_and_full_url,
                "body": body,
                "headers": dict(request_headers),
                "timestamp": timezone.now().isoformat(),
            }
        }

        self.api_requests_made.append(api_request)

    def process_api_response(self, frame, event) -> None:
        if event == "call":
            return

        frame_locals = frame.f_locals

        method = frame_locals["method"].upper()
        url = frame_locals["prep"].url
        method_and_full_url = f"{method} {url}"

        relevant_api_request = None
        negative_target_index = None

        for index, api_request in enumerate(reversed(self.api_requests_made)):
            negative_index = 1 + index

            if method_and_full_url == api_request["request"]["method_and_full_url"]:
                if "response" not in api_request.keys():
                    relevant_api_request = api_request
                    negative_target_index = negative_index

        if relevant_api_request is not None:
            response = frame_locals["resp"]

            relevant_api_request["response"] = {
                "timestamp": timezone.now().isoformat(),
                "body": response.text,
                "status_code": response.status_code,
                "headers": dict(response.headers),
            }

            assert negative_target_index is not None
            self.api_requests_made[-negative_target_index] = relevant_api_request
        else:
            logger.debug(f"No matching request found for {method_and_full_url}")

    def process_celery_task(self, frame, event) -> None:
        if event == "return":
            return

        frame_locals = frame.f_locals
        task_name = frame_locals["self"].name
        task_args = frame_locals["args"]
        task_kwargs = frame_locals["kwargs"]

        job = {"name": task_name, "args": task_args, "kwargs": task_kwargs}

        self.jobs_enqueued.append(job)

    def generate_profile_callback_function(self):
        def profile_callback(frame, event, arg):
            if event in ["c_call", "c_return"]:
                return

            if frame.f_code.co_name in [
                "_output_to_append_to_file",
                "process_view",
                "generate_profile_callback_function",
            ]:
                return

            filepath = frame.f_code.co_filename

            if "main/middleware" in filepath:
                return

            external_http_request_condition = (
                "urllib" in filepath
                and "connection" in filepath
                and frame.f_code.co_name == "urlopen"
            )
            requests_library_condition = (
                "requests/sessions" in filepath and "request" == frame.f_code.co_name
            )

            celery_condition = (
                "celery" in filepath
                and "apply_async" in frame.f_code.co_name
                and "sentry_sdk" not in filepath
            )

            library_conditions = [
                external_http_request_condition,
                requests_library_condition,
                celery_condition,
            ]

            if "lib/python" in filepath and not any(library_conditions):
                # If the virtualenv is stored within the cwd
                # then library calls would be within the cwd.
                # We want to not show library calls, so attempt to
                # filter them out here
                return

            log_conditions = [filepath.startswith(cwd), *library_conditions]
            if any(log_conditions):
                relative_path = frame.f_code.co_filename.replace(f"{cwd}/", "")

                self.frames_of_interest.append(
                    {
                        "path": f"{relative_path}:{frame.f_lineno}",
                        "co_name": frame.f_code.co_name,
                        "event": event,
                        "arg": serialize_potential_json(arg),
                        "locals": serialize_frame_locals(frame),
                        "timestamp": time.time(),
                    }
                )

                if external_http_request_condition:
                    self.process_api_request_made(frame, event)

                if requests_library_condition:
                    self.process_api_response(frame, event)

                if celery_condition:
                    self.process_celery_task(frame, event)

        return profile_callback
