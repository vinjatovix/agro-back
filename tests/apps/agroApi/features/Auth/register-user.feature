@auth @register-user
Feature: Register a new user
  In order to use the application
  I want to register a new user

  Scenario: Register a valid user
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "f7b8fce8-0a57-431a-b81e-4f1cc196412a",
        "username": "register1",
        "email": "register@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario: Existing id
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "f7b8fce8-0a57-431a-b81e-4f1cc196412b",
        "username": "register",
        "email": "patatas@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    Given a POST request to "/api/v1/auth/register" with body
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
    Then the response body should be
      """
      {
        "message": "User with id f7b8fce8-0a57-431a-b81e-4f1cc196412b already exists"
      }
      """
    And response matches OpenAPI contract


  Scenario: Existing email
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "082e014a-e718-4df5-a6a2-6f463e4b9ab3",
        "username": "first",
        "email": "register@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201

    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "9b2fddbd-3ef4-406d-a2e5-de781af1b2ae",
        "username": "register",
        "email": "register@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    Then the response body should be
      """
      {
        "message": "User register@aa.com already exists"
      }
      """
    And response matches OpenAPI contract

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
    Then the response status code should be 201
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
    Then the response status code should be 201
    And response matches OpenAPI contract
