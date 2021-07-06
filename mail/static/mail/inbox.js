document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Assign the compose from to a variable 
  document.getElementById('submit-button').addEventListener('click', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'none'; // Hides the emails inbox  view. 
  document.querySelector('#compose-view').style.display = 'block'; // Shows block where you compose email.
  document.querySelector('#email-view').style.display = 'none'; // Hides individual email view. 


  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

// POSTS email to our /emails route. 
const send_email = (ev) => {
  ev.preventDefault(); //stops the form from submitting

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: document.querySelector('#compose-recipients').value,
        subject: document.querySelector('#compose-subject').value, 
        body: document.querySelector('#compose-body').value, 
    })
  })
  .then(response => response.json())
  .then(result => {
      // Print result
      console.log(result);
  });

  document.querySelector('#compose-form').reset(); //Clears the form for the next entry.

  load_mailbox('sent') // Loads the users sent mailbox by executing the load_mailbox function

}

function load_mailbox(mailbox) {
  
  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Show and hide neccessary views.
  document.querySelector('#compose-view').style.display = 'none'; // Hides the compose view HTML div.
  document.querySelector('#emails-view').style.display = 'block'; // Shows the emails inbox view.
  document.querySelector('#email-view').style.display = 'none'; // Hidees the individual email view. 



  // Gets all the emails in the given mailbox


  fetch(`/emails/${mailbox}`, {
    method: 'GET',
  })
  .then(response => response.json())
  .then(emails => {
    // Print emails to consol
    console.log(emails);
    // Create div for each email
    emails.forEach(email => {
      // Create a new div element
      const div = document.createElement('div');
      div.innerHTML = `
              <span style="width: 240px; display: inline-block">${email.sender}</span>
              <span>${email.subject}</span>
              <span style="float: right;" >${email.timestamp}</span>`;
              
      div.className = "email-inbox";
      // Append emails inbox to the emails-view
      document.getElementById("emails-view").appendChild(div);

      // Check if email has been read or not and assign appropriate color. 
      if (email.read) {
        div.style.backgroundColor = "grey";
      } else {
        div.style.backgroundColor = "white";
      }

      // Add event listener on click to open a new email. 
      div.addEventListener('click', function (){
        
        // Get the specifc email id.
        var email_id = email.id
        console.log(email.id)

        fetch(`/emails/${email_id}`, {
          method: 'GET',
        })
        .then(response => response.json())
        .then(email => {

          // Update the email as read on click via a PUT request. 

          fetch(`/emails/${email_id}`, {
            method: 'PUT',
            body: JSON.stringify({
              read: true
            })
          })

          // Load function that displays the email contents.
          load_email(email, mailbox)
        })
      });
    });
  });

  // Function needs to take in what inbox it is in to then render different views if the email is in the inbox or the archive box. 
  function load_email(email_info, inbox){

  // Show and hide neccessary views.
  document.querySelector('#compose-view').style.display = 'none'; // Hides the compose view HTML div.
  document.querySelector('#emails-view').style.display = 'none'; // Shows the emails inbox view.
  document.querySelector('#email-view').style.display = 'block'; // Shows the individual email view.


  // Show and hidde items depending on inbox 

  if (mailbox == "inbox"){

  } else if (mailbox = "archive"){

  } else if (mailbox = "sent"){

  }
  

  const email_subject = document.createElement('h3');
  email_subject.innerHTML = `${email_info.subject}`;

  const email_contents = document.createElement('ul');
  email_contents.style = "list-style-type:none; padding: 0; list-style-type: none;"
  email_contents.innerHTML = `
                    <li><b>From:</b> ${email_info.sender}</li>
                    <li><b>To:</b> ${email_info.recipients}</li>
                    <li><b>Subject:</b> ${email_info.subject}</li>
                    <li><b>Date:</b> ${email_info.timestamp}</li>`;

  const email_body = document.createElement('p');  
  email_body.innerHTML = `${email_info.body}`

  const reply_button = document.createElement('button');
  reply_button.innerHTML = `<i class="fas fa-reply"></i>`

  const archive_button = document.createElement('button');
  archive_button.innerHTML = `<i class="fas fa-archive"></i>`

  const move_to_inbox = document.createElement('button');
  move_to_inbox.innerHTML = `<i class="fas fa-inbox"></i>`


  function move_to_inbox_or_archive (put_variable){

    // Add event listener on click to archive mail
    archive_button.addEventListener('click', function (){

    // Update the email as read on click via a PUT request. 

    fetch(`/emails/${email_info.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: put_variable
      })
    })

    // Load function that displays the email contents.
    load_mailbox('inbox')
  });

  }
  


  // Load components to be displayed
  document.querySelector('#email-view').innerHTML = "";
  document.querySelector("#email-view").append(email_contents);
  document.querySelector('#email-view').append(email_subject);
  document.querySelector('#email-view').append(email_body);
  document.querySelector('#email-view').append(reply_button);

  if (mailbox == "archive") {
    document.querySelector('#email-view').append(move_to_inbox);
    move_to_inbox_or_archive (put_variable=false)

  } else if (mailbox == "inbox") {
    document.querySelector('#email-view').append(archive_button);
    move_to_inbox_or_archive (put_variable=true);
  }

  }

}


