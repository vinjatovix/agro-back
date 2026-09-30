@auth @update-password
Feature: Update Password
  In order to use the application
  As a user
  I want to be able to update my password

  Background:
    Given a POST request to "/api/v1/auth/register" with body
      """
      {
        "id": "5242b159-af34-459b-b371-ce2b647c56a1",
        "username": "updateUser",
        "email": "update@password.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    Then the response body should be empty
    And response matches OpenAPI contract

  Scenario: Login with valid credentials
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    And a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "Sup3rSecretPassword!",
        "repeatPassword": "Sup3rSecretPassword!"
      }
      """
    Then the response status code should be 200
    And the response body should be
      """
      {
        "message": "User updated successfully"
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail when old password is incorrect
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "Sup3rSecretPassword!"
      }
      """
    And a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "Wr0ngPassw0rd!",
        "password": "Sup3rSecretPassword!",
        "repeatPassword": "Sup3rSecretPassword!"
      }
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid credentials"
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail when repeat password does not match
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "Sup3rSecretPassword!"
      }
      """
    And a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "Sup3rSecretPassword!",
        "repeatPassword": "Sup3rSecretPassword2!"
      }
      """
    Then the response status code should be 400
    And the response body matches "Passwords do not match" for field "errors.repeatPassword"
    And response matches OpenAPI contract

  Scenario: Fail when new password equals old password
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    And a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "New password must be different from old password"
      }
      """
    And response matches OpenAPI contract

  Scenario: Session of a deleted user returns 404
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    And the logged-in user is removed from storage
    And a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "Sup3rSecretPassword!",
        "repeatPassword": "Sup3rSecretPassword!"
      }
      """
    Then the response status code should be 404
    And the response body should be
      """
      {
        "message": "User not found with email: update@password.com"
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail with an unknown body field
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    When a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "Sup3rSecretPassword!",
        "repeatPassword": "Sup3rSecretPassword!",
        "username": "hacker"
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.username"
    And response matches OpenAPI contract

  Scenario: Fail with an empty body
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    When a POST user request to "/api/v1/auth/update" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "password"
    And the response errors should include "repeatPassword"
    And the response errors should include "oldPassword"
    And response matches OpenAPI contract

  Scenario: Fail with a weak new password
    Given an authentication with body
      """
      {
        "email": "update@password.com",
        "password": "#aD3fe2.0%"
      }
      """
    When a POST user request to "/api/v1/auth/update" with body
      """
      {
        "oldPassword": "#aD3fe2.0%",
        "password": "Abcde1!",
        "repeatPassword": "Abcde1!"
      }
      """
    Then the response status code should be 400
    And the response body should not echo "Abcde1!"
    And response matches OpenAPI contract
