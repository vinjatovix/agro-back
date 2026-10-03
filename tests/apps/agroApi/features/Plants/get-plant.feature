@plants @get-plant
Feature: Get Plant

  Scenario: Get an existing plant
    Given a family exists
    And a plant exists
    When I get the plant
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Test plant"
          },
          "family": "<familyId>"
        }
      }
      """
    And the response ETag should match the body version
    And response matches OpenAPI contract

  Scenario: Get a non-existing plant
    Given a GET request to "/api/v1/plants/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
    Then the response status code should be 404
    Then the response body should be
      """
      {
        "message": "Plant not found: 12384ea3-e55d-4f69-8b0c-b54cccb9f443"
      }
      """
    And response matches OpenAPI contract

  Scenario: Get a plant with invalid ID
    Given a GET request to "/api/v1/plants/invalid-id"
    Then the response status code should be 400
    And the response errors should include "id"
    And the response body should not echo "invalid-id"
    And response matches OpenAPI contract

  Scenario: Get a plant with an unknown query parameter
    Given a family exists
    And a plant exists
    When I send a GET request to "/api/v1/plants/<plantId>?foo=bar"
    Then the response status code should be 400
    And the response errors should include "foo"
    And response matches OpenAPI contract

  Scenario: Get a plant with malformed UUID (symbols)
    Given a GET request to "/api/v1/plants/%$·!"
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "Validation error",
        "errors": {
          "id": "Invalid URL encoding in request path"
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Admin can access deleted plant
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 200
    And the response ETag should match the body version
    And response matches OpenAPI contract

  Scenario: Non-admin cannot access deleted plant
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET request to "/api/v1/plants/<plantId>"
    Then the response status code should be 404
    And the response should not have an ETag
    And response matches OpenAPI contract

  Scenario: Collaborator can access soft-deleted plant
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET collaborator request to "/api/v1/plants/<plantId>"
    Then the response status code should be 200
    And the response ETag should match the body version
    And response matches OpenAPI contract

  Scenario: A matching If-None-Match returns 304 without a body
    Given a family exists
    And a plant exists
    And I use If-None-Match '"0"'
    When I send a GET user request to "/api/v1/plants/<plantId>"
    Then the response status code should be 304
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario: A stored field outside the contract is not sent
    Given a family exists
    And a plant exists with an extra stored field "internalNote"
    When I get the plant
    Then the response status code should be 200
    And the response body should not echo "internalNote"
    And response matches OpenAPI contract

  Scenario: A stored plant that breaks the contract answers 500
    Given a family exists
    And a stored plant is missing the required field "traits"
    When I get the plant
    Then the response status code should be 500
    And the response body should be
      """
      {
        "message": "Internal server error"
      }
      """
