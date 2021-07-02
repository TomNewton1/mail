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
    document.querySelector('#emails-view').style.display = 'none'; //hides the emails-view div (inbox titlename). 
    document.querySelector('#compose-view').style.display = 'block'; // Shows block where you compose email. 

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
  document.querySelector('#email-table').style.display = 'block'; // Hides the compose view HTML div.

  // Gets all the emails in the given mailbox


  fetch(`/emails/${mailbox}`, {
    method: 'GET',
  })
  .then(response => response.json())
  .then(result => {
    // Build email row item
    buildTable(result)
    // Print result
    console.log(result);
  });


  function buildTable(data){
    var email_item = document.getElementById('emailTable')
    email_item.innerHTML = ''

    for (var i = 0; i < data.length; i++){
      if(mailbox == 'inbox' || 'archive'){
        if(data.read = 'true'){
      var row = `<tr class="read">
                  <td class="action"><input type="checkbox" /></td>
                  <td class="action"><i class="fa fa-star-o"></i></td>
                  <td class="name" <a href="#">${data[i].recipients}</td>
                  <td class="subject" <a href="#">${data[i].subject}</td>
                  <td class="time" <a href="#">${data[i].timestamp}</td>
                </tr>`
      email_item.innerHTML += row}
          else {
            var row = `<tr class="read" >
                  <td class="action"><input type="checkbox" /></td>
                  <td class="action"><i class="fa fa-star-o"></i></td>
                  <td class="name" <a href="#">${data[i].recipients}</td>
                  <td class="subject" <a href="#">${data[i].subject}</td>
                  <td class="time" <a href="#">${data[i].timestamp}</td>
                </tr>`
          }
      } else if (mailbox == 'sent'){
        var row = `<tr>
                  <td class="action"><input type="checkbox" /></td>
                  <td class="action"><i class="fa fa-star-o"></i></td>
                  <td class="name" <a href="#">${data[i].sender}</td>
                  <td class="subject" <a href="#">${data[i].subject}</td>
                  <td class="time" <a href="#">${data[i].timestamp}</td>
                </tr>`
      email_item.innerHTML += row
      }

      }
    }


}


