@auth @activate-account
Feature: Activate an account
  In order to use the account I registered
  As a new user
  I want to confirm my email with the token from the activation email

  Scenario: Activate a pending account with its token
    Given a pending account exists with email "activate@aa.com"
    When the activation token is posted
    Then the response status code should be 204
    And the response body should be empty
    And response matches OpenAPI contract
    And the stored user "activate@aa.com" should be validated
    And the account "activate@aa.com" should log in with password "Abcdef1!"

  Scenario: The token of an account that is already active is refused
    Given a pending account exists with email "activate.twice@aa.com"
    And the activation token of "activate.twice@aa.com" has been used
    When the activation token is posted
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract

  Scenario Outline: A changed token is refused like any other
    Given a pending account exists with email "activate.changed@aa.com"
    When the activation token is posted <change>
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract
    And the stored user "activate.changed@aa.com" should be pending

    Examples:
      | change    |
      | truncated |
      | padded    |

  Scenario: An unknown token
    When a POST request to "/api/v1/auth/activate" with body
      """
      {
        "token": "bm90LWEtcmVhbC10b2tlbi1hdC1hbGwtMDEyMzQ1Njc4OWFi"
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

  Scenario: An expired token
    Given a pending account with an expired activation token exists with email "activate.expired@aa.com"
    When the activation token is posted
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract
    And the stored user "activate.expired@aa.com" should be pending

  Scenario: A session token is not an activation token
    Given a pending account exists with email "activate.session@aa.com"
    And a session token for the account "activate.session@aa.com"
    When the session token is posted as activation token
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Invalid or expired token"
      }
      """
    And response matches OpenAPI contract
    And the stored user "activate.session@aa.com" should be pending

  Scenario: Missing token
    When a POST request to "/api/v1/auth/activate" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "token"
    And response matches OpenAPI contract

  Scenario: Token with the wrong type
    When a POST request to "/api/v1/auth/activate" with body
      """
      {
        "token": 123
      }
      """
    Then the response status code should be 400
    And the response errors should include "token"
    And response matches OpenAPI contract

  Scenario: Unknown body field
    When a POST request to "/api/v1/auth/activate" with body
      """
      {
        "token": "any-token",
        "extra": true
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.extra"
    And response matches OpenAPI contract
