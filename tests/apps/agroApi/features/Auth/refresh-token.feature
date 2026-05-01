Feature: Refresh token
  In order to keep an active session
  As an authenticated user
  I want to refresh my token

  Background:
  Scenario: Register and login with valid credentials
    Given a POST request to "/api/v1/Auth/register" with body
      """
      {
        "id": "495e8197-c5a0-4a47-9f20-e9b49624e9f5",
        "username": "refresh1",
        "email": "refresh@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    Then the response body should be empty
    Given an authentication with body
      """
      {
        "email": "refresh@aa.com",
        "password": "#aD3fe2.0%"
      }
      """

  Scenario: Refresh with valid user token
    Given a POST user request to "/api/v1/Auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 200
    Then the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: Refresh without authentication token
    Given a POST request to "/api/v1/Auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 401
    Then the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract
