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

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none'; // Hides the emails view HTML div. 
  document.querySelector('#compose-view').style.display = 'block'; //shows block of the compose email view div html. 

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

  load_mailbox('sent') // Loads the users sent mailbox

}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block'; //shows block of the emails view id HTML div. 
  document.querySelector('#compose-view').style.display = 'none'; // Hides the compose view HTML div. 

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Gets all the emails in the given mailbox
  fetch(`/emails/${mailbox}`, {
    method: 'GET',
  })
  .then(response => response.json())
  .then(result => {
    // Print result
    console.log(result);
  });

}


