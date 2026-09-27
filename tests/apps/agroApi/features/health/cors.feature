@health @cors
Feature: Cross-origin access to version headers
  In order to use optimistic concurrency from a browser
  As a front-end client on an allowed origin
  I want to read the ETag and send If-Match cross-origin

  Scenario: The ETag header is exposed to allowed origins
    Given a family exists
    When I send a GET request to "/api/v1/families/<familyId>" from origin "http://localhost:3377"
    Then the response status code should be 200
    And the response header "Access-Control-Expose-Headers" should include "ETag"
    And the response ETag should match the body version
    And response matches OpenAPI contract

  # OPTIONS preflights are handled by the CORS middleware and are not part of
  # the OpenAPI contract, so this scenario has no contract assertion.
  Scenario: Preflight requests may send If-Match
    Given a bed exists
    When I send a CORS preflight for PATCH "/api/v1/beds/<bedId>" from origin "http://localhost:3377" requesting headers "if-match,content-type,authorization"
    Then the response status code should be 204
    And the response header "Access-Control-Allow-Headers" should include "if-match"
