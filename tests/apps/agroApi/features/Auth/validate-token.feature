Feature: Validate token
  In order to grant access to the application
  As an user
  I want to validate my token

  Background:
  Scenario: Register and login with valid credentials
    Given a POST request to "/api/v1/Auth/register" with body
      """
      {
        "id": "2e8d3eb6-ef91-4fa0-84f6-3a7f7a8ca3e8",
        "username": "validate1",
        "email": "validate@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    Then the response body should be empty
    Given an authentication with body
      """
      {
        "email": "validate@aa.com",
        "password": "#aD3fe2.0%"
      }
      """

  Scenario: Valid token
    Given a GET request to "/api/v1/Auth/validate/current-user-token"
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: Invalid token
    Given a GET request to "/api/v1/Auth/validate/dasda"
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract
