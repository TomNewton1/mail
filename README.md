# Mail (Gmail clone)

[![](mail/static/mail/mail.gif)](https://www.youtube.com/watch?v=Sj5qgODQ0ro&t=12s&ab_channel=TomasNewton)

Mail is an email client that makes API calls to the send and receive emails.  The backend of the site is built using Django and the frontend is build using HTML, Bootstrap CSS and vanilla JavaScript. 

**Backend (Python):** Two models are used to represent Users and Emails. Recipients are assigned a ManyToMany relationship between Users and Emails. There are standard url routes for authentication (register, login, logout) and API routes for composing emails, viewing individual emails and viewing emails based on their mailbox (inbox, sent, archived). These API views are hidden behind a @login_required decorator and defined using function based views. There are 4 possible HTML templates to render. When a specific enpoint is hit like *path("emails/int:email_id")* it calls a view function which depending on the Request (get or put will return and email or update an email)

**Frontend (JavaScript):** Most of the frontend logic for this project consists of interacting with the API using the fetch method to send GET, POST and PUT requests. The main functions defined on the frontend are compose_mail which allows user to fill out a form like email, send_email to "POST" a new email, load_mail to load and display various mailboxes (inbox, send, archived) and load_email to load an individual email. 
