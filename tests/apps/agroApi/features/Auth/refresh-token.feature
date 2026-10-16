@auth @refresh-token
Feature: Refresh token
  In order to keep an active session
  As an authenticated user
  I want to refresh my token

  Scenario: Refresh with valid user token
    Given an active account exists with email "refresh@aa.com"
    And a session token for the account "refresh@aa.com"
    When a POST logged-in request to "/api/v1/auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: A session of an account whose email is not validated is refused like an invalid token
    Given a pending account exists with email "refresh.pending@aa.com"
    And a session token for the account "refresh.pending@aa.com"
    When a POST logged-in request to "/api/v1/auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract

  Scenario: A session of a removed account is refused like an invalid token
    Given an active account exists with email "refresh.removed@aa.com"
    And a session token for the account "refresh.removed@aa.com"
    And the logged-in user is removed from storage
    When a POST logged-in request to "/api/v1/auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract

  Scenario: Refresh without authentication token
    When a POST request to "/api/v1/auth/refresh" with body
      """
      {}
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract
