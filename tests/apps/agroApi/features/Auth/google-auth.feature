Feature: Authenticate with Google
  In order to sign in with Google
  As a user
  I want to authenticate using a Google id token

  Scenario: Authenticate a new user with a valid Google token
    Given a POST request to "/api/v1/Auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-001|google.new%40aa.com|true|Google%20New"
      }
      """
    Then the response status code should be 200
    Then the response body should include an auth token

  Scenario: Link Google auth method to an existing local account
    # 1) First we create a LOCAL account (password-based auth only).
    Given a POST request to "/api/v1/Auth/register" with body
      """
      {
        "id": "6fbbd4ef-5870-4ee3-9605-9316e57edf10",
        "username": "googlelink1",
        "email": "google.link@aa.com",
        "password": "#aD3fe2.0%",
        "repeatPassword": "#aD3fe2.0%"
      }
      """
    Then the response status code should be 201
    Then the response body should be empty

    # 2) First Google sign-in for that same email:
    #    there is no google auth method yet, so backend links Google -> local account.
    Given a POST request to "/api/v1/Auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-link-001|google.link%40aa.com|true|Google%20Linked"
      }
      """
    Then the response status code should be 200
    Then the response body should include an auth token

    # 3) Second Google sign-in with same sub:
    #    now the account is already linked, so this is pure Google login (idempotency check).
    Given a POST request to "/api/v1/Auth/google" with body
      """
      {
        "idToken": "test-google|google-sub-link-001|google.link%40aa.com|true|Google%20Linked"
      }
      """
    Then the response status code should be 200
    Then the response body should include an auth token

  Scenario: Invalid Google token
    Given a POST request to "/api/v1/Auth/google" with body
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

  Scenario: Google token with unverified email
    Given a POST request to "/api/v1/Auth/google" with body
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