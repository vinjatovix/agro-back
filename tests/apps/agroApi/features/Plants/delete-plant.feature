@plants @delete-plant
Feature: Delete a plant
  In order to remove an existing plant
  As an administrator
  I want to be able to delete a plant

  Scenario: Delete an existing plant
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    And response matches OpenAPI contract
    And GET "/api/v1/plants/<plantId>" returns 404

  Scenario: Delete a non-existing plant
    Given I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/165d2414-365d-4c71-ab92-881a1d415712"
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "Plant not found: 165d2414-365d-4c71-ab92-881a1d415712"
      }
      """
    And response matches OpenAPI contract

  Scenario: Delete with an invalid id
    Given I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/invalid-uuid"
    Then the response status code should be 400
    And the response errors should include "id"
    And the response body should not echo "invalid-uuid"
    And response matches OpenAPI contract

  Scenario: Delete with an unknown query parameter
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>?foo=bar"
    Then the response status code should be 400
    And the response errors should include "foo"
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Non-admin user cannot delete a plant
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE user request to "/api/v1/plants/<plantId>"
    Then the response status code should be 403
    And the response body should be
      """
      {
        "message": "Insufficient permissions"
      }
      """
    And response matches OpenAPI contract

  Scenario: Non authenticated user cannot delete a plant
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE request to "/api/v1/plants/<plantId>"
    Then the response status code should be 401
    And the response body should be
      """
      {
        "message": "Invalid token"
      }
      """
    And response matches OpenAPI contract

  Scenario: Deleting an already deleted plant returns 404
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "Plant not found: <plantId>"
      }
      """
    And a GET admin request to "/api/v1/plants/<plantId>" should return status 200
    And response matches OpenAPI contract

  Scenario: Delete plant with trailing slash
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>/"
    Then the response status code should be 204
    And response matches OpenAPI contract

  Scenario: A successful delete returns no ETag
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    And the response should not have an ETag
    And response matches OpenAPI contract

  Scenario: Delete with an outdated version is rejected
    Given a family exists
    And a plant exists
    And the plant is stored at version 1
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 412
    And the plant should be unchanged
    And a GET user request to "/api/v1/plants/<plantId>" should return status 200
    And response matches OpenAPI contract

  Scenario: Delete with the current version after updates succeeds
    Given a family exists
    And a plant exists
    And the plant is stored at version 1
    And I use If-Match '"1"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    And response matches OpenAPI contract

  Scenario: A non existing plant returns 404 whatever the version
    Given I use If-Match '"999"'
    When I send a DELETE admin request to "/api/v1/plants/165d2414-365d-4c71-ab92-881a1d415712"
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: A soft-deleted plant returns 404 whatever the version
    Given a family exists
    And a soft-deleted plant exists
    And I use If-Match '"999"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 404
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Concurrent deletes with the same version have a single winner
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send 5 concurrent DELETE admin requests to "/api/v1/plants/<plantId>"
    Then exactly 1 response should have status 204 and the rest 404
    And response matches OpenAPI contract

  Scenario: Delete without If-Match is rejected
    Given a family exists
    And a plant exists
    And I record the current plant
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 428
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Delete with a wildcard If-Match is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '*'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario Outline: Delete with an If-Match that names no current version fails the precondition (<header>)
    Given a family exists
    And a plant exists
    And the plant is stored at version 3
    And I use If-Match '<header>'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 412
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | header |
      | W/"3"  |
      | "abc"  |
      | "-1"   |

  Scenario: Delete with a list of entity tags that includes the current version
    Given a family exists
    And a plant exists
    And the plant is stored at version 3
    And I use If-Match '"2", "3"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    And response matches OpenAPI contract

  Scenario: A weak If-Match on a missing plant answers not found
    Given I use If-Match 'W/"3"'
    When I send a DELETE admin request to "/api/v1/plants/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario Outline: Delete with a malformed If-Match is rejected (<header>)
    Given a family exists
    And a plant exists
    And I use If-Match '<header>'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 400
    And the response errors should include "if-match"
    And response matches OpenAPI contract

    Examples:
      | header  |
      | 3       |
      | "3      |
      | "3" "4" |

  Scenario: The role check runs before the If-Match check
    Given a family exists
    And a plant exists
    When I send a DELETE user request to "/api/v1/plants/<plantId>"
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: A soft delete records who deleted the plant and when
    Given a family exists
    And a plant exists
    And the plant was last updated by another user
    And I use If-Match '"0"'
    When I send a DELETE admin request to "/api/v1/plants/<plantId>"
    Then the response status code should be 204
    And the stored plant should record the admin as deleter at version 1
