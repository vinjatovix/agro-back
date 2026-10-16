@auth @password-reset
Feature: Password Reset by Email
  In order to regain access to my account when I forgot my password
  As a registered user
  I want to receive a reset link by email and set a new password

  Scenario: Requesting a reset emails a link that sets a new password
    Given an active account exists with email "alice@example.com" and password "OldPassword1!"
    When I request a password reset for "alice@example.com"
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And 1 email should have been sent to "alice@example.com"
    And the last email to "alice@example.com" should have subject "Restablece tu contraseña de MiBancal"
    And the last email to "alice@example.com" should link to the password reset page
    And the stored user "alice@example.com" should hold only a password reset token hash
    And the reset link emailed to "alice@example.com" should set the password "NewPassword1!"
    And the account "alice@example.com" should log in with password "NewPassword1!"
    And the account "alice@example.com" should not log in with password "OldPassword1!"

  Scenario: Request password reset for an unknown email returns 202 and sends no email
    When I request a password reset for "nobody@example.com"
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: A request within 2 minutes of the last reset token issues and sends nothing
    Given an active account exists with email "throttle@example.com" and a recent password reset token
    And the stored user "throttle@example.com" is recorded
    When I request a password reset for "throttle@example.com"
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And no email should have been sent
    And the stored user "throttle@example.com" should be unchanged

  Scenario: A later request replaces the previous reset token
    Given an active account exists with email "again@example.com", password "OldPassword1!" and a password reset token
    When I request a password reset for "again@example.com"
    Then the response status code should be 202
    And 1 email should have been sent to "again@example.com"
    And the stored user "again@example.com" should hold only a password reset token hash
    And the reset token seeded for "again@example.com" should be refused

  Scenario: A valid reset token sets the new password once and notifies the owner
    Given an active account exists with email "reset@example.com", password "OldPassword1!" and a password reset token
    When I reset the password using the seeded reset token for "reset@example.com" with password "NewPassword1!" and repeat password "NewPassword1!"
    Then the response status code should be 204
    And the response body should be empty
    And response matches OpenAPI contract
    And 1 email should have been sent to "reset@example.com"
    And the last email to "reset@example.com" should have subject "Tu contraseña de MiBancal ha sido cambiada"
    And the stored user "reset@example.com" should be validated
    And the account "reset@example.com" should log in with password "NewPassword1!"
    And the account "reset@example.com" should not log in with password "OldPassword1!"
    And the reset token seeded for "reset@example.com" should be refused

  Scenario: A Google-only account gains a password and keeps its Google identity
    Given a Google-only account with Google identity "google-sub-007" exists with email "carol@example.com" and a password reset token
    When I reset the password using the seeded reset token for "carol@example.com" with password "NewPassword1!" and repeat password "NewPassword1!"
    Then the response status code should be 204
    And response matches OpenAPI contract
    And the account "carol@example.com" should log in with password "NewPassword1!"
    And the stored user "carol@example.com" should keep Google identity "google-sub-007"

  Scenario: An unvalidated pending account is reclaimed and validated by reset
    Given a pending account exists with email "pending.reclaim@example.com", password "SquatterPass1!" and a password reset token
    When I reset the password using the seeded reset token for "pending.reclaim@example.com" with password "OwnerPass1!" and repeat password "OwnerPass1!"
    Then the response status code should be 204
    And response matches OpenAPI contract
    And the stored user "pending.reclaim@example.com" should be validated
    And the account "pending.reclaim@example.com" should log in with password "OwnerPass1!"
    And the account "pending.reclaim@example.com" should not log in with password "SquatterPass1!"
    And the activation token seeded for "pending.reclaim@example.com" should be refused

  Scenario: An expired reset token is refused
    Given an active account exists with email "expired@example.com" and an expired password reset token
    When I reset the password using the seeded reset token for "expired@example.com" with password "NewPass1!" and repeat password "NewPass1!"
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract

  Scenario: An unknown reset token is refused
    When a POST request to "/api/v1/auth/password/reset" with body
      """
      {
        "token": "bm90LWEtcmVhbC10b2tlbi1hdC1hbGwtMDEyMzQ1Njc4OWFi",
        "password": "NewPassword1!",
        "repeatPassword": "NewPassword1!"
      }
      """
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract

  Scenario: An activation token cannot be used to reset a password
    Given a pending account exists with email "cross.purpose@example.com"
    When the activation token is posted as reset token with password "NewPassword1!" and repeat password "NewPassword1!"
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract

  Scenario: An invalid password does not use up the reset token
    Given an active account exists with email "preserve.token@example.com", password "OldPass1!" and a password reset token
    And the stored user "preserve.token@example.com" is recorded
    When I reset the password using the seeded reset token for "preserve.token@example.com" with password "weak" and repeat password "weak"
    Then the response status code should be 400
    And response matches OpenAPI contract
    And the stored user "preserve.token@example.com" should be unchanged
