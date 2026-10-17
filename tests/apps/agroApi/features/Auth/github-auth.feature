@auth @github-auth
Feature: Authenticate with GitHub
  In order to sign in with GitHub
  As a user
  I want to authenticate using a GitHub authorization code

  Scenario: A new GitHub account is validated, linked to GitHub, without password and with the user role
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|1000001|github.new%40aa.com",
        "codeVerifier": "pkce-new"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the stored user "github.new@aa.com" should be a GitHub account with identity "1000001"
    And no email should have been sent

  Scenario: A new GitHub account gets another username when the derived one is taken
    Given a user exists with username "anau"
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|1000002|ana%40aa.com",
        "codeVerifier": "pkce-ana"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the stored user "ana@aa.com" should have a username starting with "anau" other than it

  Scenario: Two simultaneous first GitHub sign-ins of the same person share one account
    When I send 2 concurrent anonymous POST requests to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|1000003|github.twice%40aa.com",
        "codeVerifier": "pkce-twice"
      }
      """
    Then all responses should have status 200
    And response matches OpenAPI contract
    And 1 user should be stored with email "github.twice@aa.com"

  Scenario: A GitHub session token is accepted by the token refresh
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|1000004|github.token%40aa.com",
        "codeVerifier": "pkce-token"
      }
      """
    Then the response status code should be 200
    And response matches OpenAPI contract
    And the auth token in the response should be accepted by the token refresh

  Scenario: GitHub rejects the authorization code
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github-rejected",
        "codeVerifier": "pkce-rejected"
      }
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid GitHub authorization"
      }
      """
    And response matches OpenAPI contract
    And 0 users should be stored with email "github.rejected@aa.com"

  Scenario: The GitHub identity has no primary verified email
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github-no-verified-email",
        "codeVerifier": "pkce-no-email"
      }
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid GitHub authorization"
      }
      """
    And response matches OpenAPI contract

  Scenario: GitHub cannot be reached
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github-unavailable",
        "codeVerifier": "pkce-unavailable"
      }
      """
    Then the response status code should be 503
    And the response body should be
      """
      {
        "message": "GitHub sign-in is temporarily unavailable"
      }
      """
    And response matches OpenAPI contract

  Scenario: Missing codeVerifier
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|1000010|github.missing%40aa.com"
      }
      """
    Then the response status code should be 400
    And the response errors should include "codeVerifier"
    And response matches OpenAPI contract

  Scenario: code with the wrong type
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": 123,
        "codeVerifier": "pkce-wrong-type"
      }
      """
    Then the response status code should be 400
    And the response errors should include "code"
    And response matches OpenAPI contract

  Scenario: Unknown body field
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github-rejected",
        "codeVerifier": "pkce-extra",
        "extra": true
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.extra"
    And response matches OpenAPI contract

  Scenario: Empty body
    When a POST request to "/api/v1/auth/github" with body
      """
      {}
      """
    Then the response status code should be 400
    And the response errors should include "code"
    And response matches OpenAPI contract

  Scenario: A returning GitHub user signs in again with nothing changed
    Given an account linked to GitHub identity "2000001" exists with email "github.return@aa.com"
    And the stored user "github.return@aa.com" is recorded
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|2000001|github.return%40aa.com",
        "codeVerifier": "pkce-return"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the auth token in the response should identify the account seeded with email "github.return@aa.com"
    And the stored user "github.return@aa.com" should be unchanged
    And no email should have been sent

  Scenario: A returning GitHub user whose GitHub email changed reaches the same account
    Given an account linked to GitHub identity "2000002" exists with email "github.old@aa.com"
    And the stored user "github.old@aa.com" is recorded
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|2000002|github.newmail%40aa.com",
        "codeVerifier": "pkce-newmail"
      }
      """
    Then the response status code should be 200
    And response matches OpenAPI contract
    And the auth token in the response should identify the account seeded with email "github.old@aa.com"
    And the stored user "github.old@aa.com" should be unchanged
    And 0 users should be stored with email "github.newmail@aa.com"
    And no email should have been sent

  Scenario: A returning GitHub user whose login name changed reaches the same account
    Given an account linked to GitHub identity "2000003" exists with email "github.login@aa.com"
    And the stored user "github.login@aa.com" is recorded
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|2000003|github.login%40aa.com",
        "codeVerifier": "pkce-login"
      }
      """
    Then the response status code should be 200
    And response matches OpenAPI contract
    And the auth token in the response should identify the account seeded with email "github.login@aa.com"
    And the stored user "github.login@aa.com" should be unchanged
    And no email should have been sent

  Scenario: GitHub sign-in secures a pending account: its password stops working
    Given a pending account exists with email "github.pending@aa.com" and password "#aD3fe2.0%"
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|3000001|github.pending%40aa.com",
        "codeVerifier": "pkce-pending"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the stored user "github.pending@aa.com" should be validated
    And the stored user "github.pending@aa.com" should have no password
    And the account "github.pending@aa.com" should not log in with password "#aD3fe2.0%"
    And no email should have been sent

  Scenario: GitHub sign-in links an active account, whose previous methods keep working
    Given an active account exists with email "github.link@aa.com" and password "#aD3fe2.0%"
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|3000002|github.link%40aa.com",
        "codeVerifier": "pkce-link"
      }
      """
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract
    And the stored user "github.link@aa.com" should keep GitHub identity "3000002"
    And the account "github.link@aa.com" should log in with password "#aD3fe2.0%"
    And 1 email should have been sent to "github.link@aa.com"
    And the last email to "github.link@aa.com" should have subject "Se ha vinculado GitHub a tu cuenta"
    And the last email to "github.link@aa.com" should contain "accesos anteriores siguen funcionando"

  Scenario: An email linked to another GitHub identity is refused
    Given an account linked to GitHub identity "3000003" exists with email "github.owned@aa.com"
    And the stored user "github.owned@aa.com" is recorded
    When a POST request to "/api/v1/auth/github" with body
      """
      {
        "code": "test-github|3999999|github.owned%40aa.com",
        "codeVerifier": "pkce-intruder"
      }
      """
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid GitHub authorization"
      }
      """
    And response matches OpenAPI contract
    And the stored user "github.owned@aa.com" should be unchanged
