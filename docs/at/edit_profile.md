# Arachne Acceptance Tests

## TEST: Reject changing email to email in use by another user.

* 1) Create an account with email abc@trash-mail.com
* 2) Create a second account with email abc2@trash-mail.com
* 3) Log in as user using the second account.
* 4) Visit the update profile page.
* 5) Change the email to abc@trash-mail.com
* 6) If the change is successful, the test is FAILED.
* 7) If the change gets rejected with a proper message, the test is PASSED.

## TEST: Reject changing username to username in use by another user.

* 1) Visit the update profile page.
* 2) The username must not be editable.
* 3) If it is, the test ist FAILED.