@auth @validate-token
Feature: Validate token
  In order to grant access to the application
  As an user
  I want to validate my token

  Background:
    Given a POST request to "/api/v1/auth/register" with body
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
    Given a GET request to "/api/v1/auth/validate/logged-in-token"
    Then the response status code should be 200
    And the response body should include an auth token
    And response matches OpenAPI contract

  Scenario: Invalid token
    Given a GET request to "/api/v1/auth/validate/dasda"
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract

  Scenario: Body on the validation link
    When I send a GET request to "/api/v1/auth/validate/any-token" with body:
      """
      {
        "a": 1
      }
      """
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.a"
    And response matches OpenAPI contract

  Scenario: Unknown query parameter on the validation link
    When I send a GET request to "/api/v1/auth/validate/any-token" with query string "foo=1"
    Then the response status code should be 400
    And the response body matches "Unknown field" for field "errors.foo"
    And response matches OpenAPI contract
