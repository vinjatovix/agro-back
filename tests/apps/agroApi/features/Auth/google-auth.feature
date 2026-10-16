@auth @google-auth
Feature: Authenticate with Google
  In order to sign in with Google
  As a user
  I want to authenticate using a Google id token

  Scenario: Authenticate a new user with a valid Google token
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-001|google.new%40aa.com|true|Google%20New"
      }
      """
    Then the response status code should be 200
    Then the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: Google sign-in secures a pending account: its password stops working
    Given a pending account exists with email "google.pending@aa.com" and password "#aD3fe2.0%"
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-pending|google.pending%40aa.com|true|Google%20Pending"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the stored user "google.pending@aa.com" should be validated
    And the stored user "google.pending@aa.com" should have no password
    And the account "google.pending@aa.com" should not log in with password "#aD3fe2.0%"
    And no email should have been sent

  Scenario: Google sign-in links an active account, which keeps its password
    Given an active account exists with email "google.link@aa.com" and password "#aD3fe2.0%"
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-link-001|google.link%40aa.com|true|Google%20Linked"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the account "google.link@aa.com" should log in with password "#aD3fe2.0%"
    And 1 email should have been sent to "google.link@aa.com"
    And the last email to "google.link@aa.com" should have subject "Se ha vinculado Google a tu cuenta"

  Scenario: An account already linked to Google changes nothing
    Given an account linked to Google identity "google-sub-linked" exists with email "google.linked@aa.com"
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-linked|google.linked%40aa.com|true|Google%20Linked"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And no email should have been sent

  Scenario: Invalid Google token
    Given a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "invalid-google-token"
      }
      """
    Then the response status code should be 401
    Then the response body should be
      """
      {
        "message": "Invalid Google token"
      }
      """
    And response matches OpenAPI contract

  Scenario: Google token with unverified email
    Given a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-777|google.unverified%40aa.com|false|Google%20Unverified"
      }
      """
    Then the response status code should be 401
    Then the response body should be
      """
      {
        "message": "Invalid Google token"
      }
      """
    And response matches OpenAPI contract

  Scenario: idToken with the wrong type
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": 123
      }
      """
    Then the response status code should be 400
    And the response errors should include "idToken"
    And response matches OpenAPI contract

  Scenario: Unknown body field
    When a POST request to "/api/v1/auth/google" with body
      """
      {
        "idToken": "invalid-google-token",
        "extra": true
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.extra"
    And response matches OpenAPI contract

  Scenario: Empty body
    When a POST request to "/api/v1/auth/google" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "idToken"
    And response matches OpenAPI contract
