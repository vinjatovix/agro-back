Feature: Login
  In order to use the application
  As a user
  I want to be able to login

  Background:
  Scenario: Register with valid credentials
    Given a POST request to "/api/v1/Auth/register" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
        "username": "login1",
        "email": "login@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario: Login with valid credentials
    Given a POST request to "/api/v1/Auth/login" with body
      """
      {
        "email": "login@aa.com",
        "password": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: Fail with invalid credentials
    Given a POST request to "/api/v1/Auth/login" with body
      """
      {
        "email": "login@aa.com",
        "password": "#aDXXXXXXX3fe2.0%"
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

  Scenario: Fail with non-existent user
    Given a POST request to "/api/v1/Auth/login" with body
      """
      {
        "email": "nonexistent@aa.com",
        "password": "#aD3fe2.0%"
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
