document.addEventListener("DOMContentLoaded", function () {
	// Use buttons to toggle between views
	document
		.querySelector("#inbox")
		.addEventListener("click", () => load_mailbox("inbox"));
	document
		.querySelector("#sent")
		.addEventListener("click", () => load_mailbox("sent"));
	document
		.querySelector("#archived")
		.addEventListener("click", () => load_mailbox("archive"));
	document.querySelector("#compose").addEventListener("click", compose_email);

	// Assign the compose from to a variable
	document
		.getElementById("submit-button")
		.addEventListener("click", send_email);

	// By default, load the inbox
	load_mailbox("inbox");
});

function compose_email(recipients, subject, body, timestamp, email_reply) {
	// Show the mailbox and hide other views
	document.querySelector("#emails-view").style.display = "none"; // Hides the emails inbox  view.
	document.querySelector("#compose-view").style.display = "block"; // Shows block where you compose email.
	document.querySelector("#email-view").style.display = "none"; // Hides individual email view.

	if (email_reply) {
		// Clear out composition fields
		document.querySelector("#compose-recipients").value = "";
		document.querySelector("#compose-subject").value = "";
		document.querySelector("#compose-body").value = "";

		// Reply to email paramaters
		document.querySelector("#compose-recipients").value = recipients;

		// Check if Re: in subject title, if not then append Re: to subject title.
		if (subject.includes("Re:")) {
			document.querySelector("#compose-subject").value = subject;
			document.querySelector("#compose-body").value = body;
		} else {
			re_subject = "Re: " + subject;
			document.querySelector("#compose-subject").value = re_subject;

			// Pre-fill email with previous date sent.
			var new_body =
				`On ${timestamp}` +
				` ${recipients}` +
				" wrote: \n \n" +
				body +
				"\n ------ \n";
			document.querySelector("#compose-body").value = new_body;
		}
	} else {
		// Clear out composition fields
		document.querySelector("#compose-recipients").value = "";
		document.querySelector("#compose-subject").value = "";
		document.querySelector("#compose-body").value = "";
	}
}

// POSTS email to our /emails route.
const send_email = (ev) => {
	ev.preventDefault(); //stops the form from submitting

	fetch("/emails", {
		method: "POST",
		body: JSON.stringify({
			recipients: document.querySelector("#compose-recipients").value,
			subject: document.querySelector("#compose-subject").value,
			body: document.querySelector("#compose-body").value,
		}),
	})
		.then((response) => response.json())
		.then((result) => {
			// Print result
			console.log(result);
		});

	document.querySelector("#compose-form").reset(); //Clears the form for the next entry.

	load_mailbox("sent"); // Loads the users sent mailbox by executing the load_mailbox function
};

function load_mailbox(mailbox) {
	// Show the mailbox name
	document.querySelector(
		"#emails-view"
	).innerHTML = `<h3 style="border-bottom: 1px solid lightgrey; margin: 0; padding: 10px;">${
		mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
	}</h3>`;

	// Show and hide neccessary views.
	document.querySelector("#compose-view").style.display = "none"; // Hides the compose view HTML div.
	document.querySelector("#emails-view").style.display = "block"; // Shows the emails inbox view.
	document.querySelector("#email-view").style.display = "none"; // Hidees the individual email view.

	// Gets all the emails in the given mailbox

	fetch(`/emails/${mailbox}`, {
		method: "GET",
	})
		.then((response) => response.json())
		.then((emails) => {
			// Print emails to consol
			console.log(emails);
			// Create div for each email
			emails.forEach((email) => {
				// Create a new div element
				const div = document.createElement("div");
				div.innerHTML = `<div class="row">
                          <div class="col-sm">
                            ${email.sender}
                          </div>
                          <div class="col-sm">
                            ${email.subject}
                          </div>
                          <div class="col-sm">
                            ${email.timestamp}
                          </div>
                        </div>`;

				div.className = "email-inbox";
				// Append emails inbox to the emails-view
				document.getElementById("emails-view").appendChild(div);

				// Check if email has been read or not and assign appropriate color.
				if (email.read) {
					div.style.backgroundColor = "rgba(242,245,245,0.8)";
					div.style.fontWeight = "normal";
				} else {
					div.style.backgroundColor = "white";
					div.style.fontWeight = "bold";
				}

				// Add event listener on click to open a new email.
				div.addEventListener("click", function () {
					// Get the specifc email id.
					var email_id = email.id;
					console.log(email.id);

					fetch(`/emails/${email_id}`, {
						method: "GET",
					})
						.then((response) => response.json())
						.then((email) => {
							// Update the email as read on click via a PUT request.

							fetch(`/emails/${email_id}`, {
								method: "PUT",
								body: JSON.stringify({
									read: true,
								}),
							});

							// Load function that displays the email contents.
							load_email(email, mailbox);
						});
				});
			});
		});

	// Function needs to take in what inbox it is in to then render different views if the email is in the inbox or the archive box.
	function load_email(email_info, inbox) {
		// Show and hide neccessary views.
		document.querySelector("#compose-view").style.display = "none"; // Hides the compose view HTML div.
		document.querySelector("#emails-view").style.display = "none"; // Shows the emails inbox view.
		document.querySelector("#email-view").style.display = "block"; // Shows the individual email view.

		// Show and hidde items depending on inbox

		if (mailbox == "inbox") {
		} else if ((mailbox = "archive")) {
		} else if ((mailbox = "sent")) {
		}

		const email_subject = document.createElement("h3");
		email_subject.style = "margin-top: 20px; margin-left: 20px;";
		email_subject.innerHTML = `${email_info.subject}`;

		const email_contents = document.createElement("ul");
		email_contents.style =
			"list-style-type:none; padding: 0; list-style-type: none; margin-left: 20px;";
		email_contents.innerHTML = `
                    <li><b>From:</b> ${email_info.sender}</li>
                    <li><b>To:</b> ${email_info.recipients}</li>
                    <li><b>Subject:</b> ${email_info.subject}</li>
                    <li><b>Date:</b> ${email_info.timestamp}</li>`;

		const email_body = document.createElement("p");
		email_body.style = "margin-left: 20px;";
		email_body.innerHTML = `${email_info.body}`;

		const reply_button = document.createElement("button");
		reply_button.innerHTML = `<i class="fas fa-reply"></i> Reply`;
		reply_button.className = "btn btn-lg btn-outline-secondary reply-btn ";

		reply_button.addEventListener("click", function () {
			var email_reply = "true";
			compose_email(
				email_info.sender,
				email_info.subject,
				email_info.body,
				email_info.timestamp,
				email_reply
			);
		});

		const move_to_archive_button = document.createElement("button");
		move_to_archive_button.innerHTML = `<i class="fas fa-archive"></i> Archive`;
		move_to_archive_button.className =
			"btn btn-lg btn-outline-secondary inbox-archive-btn";

		const move_to_inbox_button = document.createElement("button");
		move_to_inbox_button.innerHTML = `<i class="fas fa-inbox"></i> Move to Inbox`;
		move_to_inbox_button.className =
			"btn btn-lg btn-outline-secondary inbox-archive-btn";

		// Enables the user to add or remove email from archive
		function move_to_inbox_or_archive(put_variable, button_type) {
			// Change button depending on if the email is in archive or not.
			button_type.addEventListener("click", function () {
				// Update the email as read on click via a PUT request.
				fetch(`/emails/${email_info.id}`, {
					method: "PUT",
					body: JSON.stringify({
						archived: put_variable,
					}),
				}).then((response) => {
					console.log(`Status code: ${response.status}`);
					load_mailbox("inbox");
				});
			});
		}

		// Load components to be displayed
		document.querySelector("#email-view").innerHTML = "";
		document.querySelector("#email-view").append(email_subject);
		document.querySelector("#email-view").append(email_contents);
		document.querySelector("#email-view").append(email_body);
		document.querySelector("#email-view").append(reply_button);

		// Load the add to archive or add to inbox button.
		if (mailbox == "archive") {
			document.querySelector("#email-view").append(move_to_inbox_button);
			move_to_inbox_or_archive(
				(put_variable = false),
				(button_type = move_to_inbox_button)
			);
		} else if (mailbox == "inbox") {
			document.querySelector("#email-view").append(move_to_archive_button);
			move_to_inbox_or_archive(
				(put_variable = true),
				(button_type = move_to_archive_button)
			);
		}
	}
}
