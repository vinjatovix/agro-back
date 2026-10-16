@auth @register-user
Feature: Register a new user
  In order to use the application
  I want to register a new user

  Scenario: Register with a new email
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "f7b8fce8-0a57-431a-b81e-4f1cc196412a",
        "username": "register1",
        "email": "register@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And 1 email should have been sent to "register@aa.com"
    And the last email to "register@aa.com" should have subject "Activa tu cuenta de MiBancal"
    And the last email to "register@aa.com" should link to the activation page
    And the last email to "register@aa.com" should contain "Si no has creado esta cuenta, no abras el enlace: alguien ha usado tu email sin tu permiso."
    And the stored user "register@aa.com" should be pending
    And the stored user "register@aa.com" should hold only an activation token hash
    And the account "register@aa.com" should not log in with password "#aD3fe2.0%"
    And the activation link emailed to "register@aa.com" should activate the account
    And the account "register@aa.com" should log in with password "#aD3fe2.0%"

  Scenario: The email of an active account gets the same answer and its owner is told
    Given an active account exists with email "owner@aa.com"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "082e014a-e718-4df5-a6a2-6f463e4b9ab3",
        "username": "notowner",
        "email": "owner@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And 1 user should be stored with email "owner@aa.com"
    And 1 email should have been sent to "owner@aa.com"
    And the last email to "owner@aa.com" should have subject "Alguien ha intentado registrarse con tu email"

  Scenario: The email of a pending account with a valid link changes nothing
    Given a pending account exists with email "waiting@aa.com"
    And the stored user "waiting@aa.com" is recorded
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "9b2fddbd-3ef4-406d-a2e5-de781af1b2ae",
        "username": "waiting2",
        "email": "waiting@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And no email should have been sent
    And the stored user "waiting@aa.com" should be unchanged

  Scenario: A pending account whose link expired is replaced
    Given a pending account with an expired activation token exists with email "expired@aa.com", id "1c9e5b7a-3d2f-4e6a-8b1c-0d9e8f7a6b5c" and username "expired1"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "2d0f6c8b-4e3a-4f7b-9c2d-1e0f9a8b7c6d",
        "username": "replacer1",
        "email": "expired@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 202
    And the response body should be empty
    And response matches OpenAPI contract
    And the user seeded with email "expired@aa.com" should no longer be stored
    And 1 user should be stored with email "expired@aa.com"
    And the stored user "expired@aa.com" should be pending
    And 1 email should have been sent to "expired@aa.com"
    And the last email to "expired@aa.com" should have subject "Activa tu cuenta de MiBancal"
    And the activation token seeded for "expired@aa.com" should be refused

  Scenario: A pending account that never got a link is replaced
    Given a pending account without activation token exists with email "tokenless@aa.com", id "3e1a7d9c-5f4b-4a8c-8d3e-2f1a0b9c8d7e" and username "tokenless1"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "4f2b8e0d-6a5c-4b9d-9e4f-3a2b1c0d9e8f",
        "username": "replacer2",
        "email": "tokenless@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 202
    And response matches OpenAPI contract
    And the user seeded with email "tokenless@aa.com" should no longer be stored
    And 1 user should be stored with email "tokenless@aa.com"
    And 1 email should have been sent to "tokenless@aa.com"

  Scenario: Replacing an expired account cannot reuse its username
    Given a pending account with an expired activation token exists with email "expired2@aa.com", id "5a3c9f1e-7b6d-4cae-8f5a-4b3c2d1e0f9a" and username "expired2"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "6b4d0a2f-8c7e-4dbf-9a6b-5c4d3e2f1a0b",
        "username": "expired2",
        "email": "expired2@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Username already in use"
      }
      """
    And response matches OpenAPI contract
    And the user seeded with email "expired2@aa.com" should still be stored
    And no email should have been sent

  Scenario: Existing id
    Given an active account exists with email "idowner@aa.com", id "f7b8fce8-0a57-431a-b81e-4f1cc196412b" and username "idowner"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "f7b8fce8-0a57-431a-b81e-4f1cc196412b",
        "username": "patatillas",
        "email": "patatillas@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "User with id f7b8fce8-0a57-431a-b81e-4f1cc196412b already exists"
      }
      """
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: Existing id with the email of an existing account
    Given an active account exists with email "idowner2@aa.com", id "7c5e1b3a-9d8f-4ec0-8b7c-6d5e4f3a2b1c" and username "idowner2"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "7c5e1b3a-9d8f-4ec0-8b7c-6d5e4f3a2b1c",
        "username": "someoneelse",
        "email": "idowner2@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "User with id 7c5e1b3a-9d8f-4ec0-8b7c-6d5e4f3a2b1c already exists"
      }
      """
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: Registering a username already in use returns conflict
    Given a user exists with username "takenname"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "4c2a7e91-6b3d-4f58-9a0e-1d2c3b4a5f60",
        "username": "takenname",
        "email": "takenname@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Username already in use"
      }
      """
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: A username already in use is a conflict also with the email of an existing account
    Given an active account exists with email "nameowner@aa.com", id "8d6f2c4b-0e9a-4fd1-9c8d-7e6f5a4b3c2d" and username "nameowner"
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "9e7a3d5c-1f0b-4ae2-8d9e-8f7a6b5c4d3e",
        "username": "nameowner",
        "email": "nameowner@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Username already in use"
      }
      """
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: Password and repeat password are different
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "2e4320b8-105c-4dfd-b6d6-e4255664f848",
        "username": "register",
        "email": "register@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%1"
      }
      """
    Then the response status code should be 400
    And the response body matches "Passwords do not match" for field "errors.repeatPassword"
    And response matches OpenAPI contract

  Scenario: Invalid arguments
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "email": "aaJaa",
        "password": 7654321,
        "repeatPassword": 7654321
      }
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the response errors should include "email"
    And the response errors should include "username"
    And the response errors should include "password"
    And the response errors should include "repeatPassword"
    And the response body should not echo "aaJaa"
    And the response body should not echo "7654321"
    And response matches OpenAPI contract

  Scenario: Email outside the strict format
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "5b0f3c2e-8d4f-4a57-9f55-2f8f4c2a1d10",
        "username": "strictmail",
        "email": "a!b@example.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    And the response errors should include "email"
    And the response body should not echo "a!b@example.com"
    And response matches OpenAPI contract

  Scenario: Id that is not an RFC UUID
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "12345678-1234-1234-1234-123456789012",
        "username": "strictid",
        "email": "strictid@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the response body should not echo "12345678-1234-1234-1234-123456789012"
    And response matches OpenAPI contract

  Scenario: Unknown body field
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
        "username": "unknownfield",
        "email": "unknownfield@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%",
        "role": "admin"
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.role"
    And response matches OpenAPI contract

  Scenario: Empty body
    When a POST request to "/api/v1/auth/register" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the response errors should include "email"
    And the response errors should include "username"
    And the response errors should include "password"
    And the response errors should include "repeatPassword"
    And response matches OpenAPI contract

  Scenario Outline: Password outside the domain rule is rejected
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "3f9a1b2c-5d6e-4f70-8a9b-0c1d2e3f4a5b",
        "username": "weakpass",
        "email": "weakpass@aa.com",
        "password": "<password>",
        "repeatPassword": "<password>"
      }
      """
    Then the response status code should be 400
    And the response body should not echo "<password>"
    And response matches OpenAPI contract

    # Which rule failed is covered by the PlainPassword unit tests.
    Examples:
      | password                                                          |
      | Abcde1!                                                           |
      | abcdef1!                                                          |
      | Abcdefg!                                                          |
      | Abcdefg1                                                          |
      | Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!Abcdef1!a |
      | Abcdef1!ñññññññññññññññññññññññññññññññññ                         |

  Scenario: Shortest strong password is accepted
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "8e2d4c6a-1b3f-4d5e-9a7c-2b4d6f8a0c1e",
        "username": "shortpass",
        "email": "shortpass@aa.com",
        "password": "Abcdef1!",
        "repeatPassword": "Abcdef1!"
      }
      """
    Then the response status code should be 202
    And response matches OpenAPI contract

  Scenario: Non-ASCII character counts as the special character
    When a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "5b7c9d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e",
        "username": "unicodepass",
        "email": "unicodepass@aa.com",
        "password": "Abcdefg1ñ",
        "repeatPassword": "Abcdefg1ñ"
      }
      """
    Then the response status code should be 202
    And response matches OpenAPI contract
