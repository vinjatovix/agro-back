@auth @login-user
Feature: Login
  In order to use the application
  As a user
  I want to be able to login

  Background:
    Given an active account exists with email "login@aa.com" and password "#aD3fe2.0%"

  Scenario: Login with valid credentials
    When a POST request to "/api/v1/auth/login" with body
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
    When a POST request to "/api/v1/auth/login" with body
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
    When a POST request to "/api/v1/auth/login" with body
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

  Scenario: An account whose email is not validated gets the same answer as wrong credentials
    Given a pending account exists with email "login.pending@aa.com" and password "#aD3fe2.0%"
    When a POST request to "/api/v1/auth/login" with body
      """
      {
        "email": "login.pending@aa.com",
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

  Scenario: Unknown body field
    When a POST request to "/api/v1/auth/login" with body
      """
      {
        "email": "login@aa.com",
        "password": "#aD3fe2.0%",
        "bar": 1
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.bar"
    And response matches OpenAPI contract

  Scenario: Unknown query parameter
    When a POST request to "/api/v1/auth/login" with query "foo=1" and body
      """
      {
        "email": "login@aa.com",
        "password": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.foo"
    And response matches OpenAPI contract

  Scenario: Email outside the strict format
    When a POST request to "/api/v1/auth/login" with body
      """
      {
        "email": "a!b@example.com",
        "password": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 400
    And the response errors should include "email"
    And the response body should not echo "a!b@example.com"
    And response matches OpenAPI contract

  Scenario: Empty body
    When a POST request to "/api/v1/auth/login" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "email"
    And the response errors should include "password"
    And response matches OpenAPI contract
