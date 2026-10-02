@beds @delete-bed
Feature: Delete a bed
    As a user
    I want to delete a bed
    So that I can remove a bed that I no longer need

    Scenario: Delete a bed successfully
        Given a bed exists
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract

    Scenario: Delete a non existing bed
        Given I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Cannot delete a non owned bed
        Given a bed exists for another user
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And response matches OpenAPI contract

    Scenario: Unauthenticated user cannot delete a bed
        Given a bed exists
        And I use If-Match '"0"'
        When I send a DELETE request to "/api/v1/beds/<bedId>"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Delete a bed with invalid id
        Given I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/invalid-uuid"
        Then the response status code should be 400
        And the response errors should include "id"
        And the response body should not echo "invalid-uuid"
        And response matches OpenAPI contract

    Scenario: Deleting an already deleted bed returns 404
        Given a bed exists
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And response matches OpenAPI contract

    Scenario: A successful delete returns no ETag
        Given a bed exists
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And the response should not have an ETag
        And response matches OpenAPI contract

    Scenario: Delete with an outdated version is rejected
        Given a bed exists
        And the bed is stored at version 1
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 412
        And the bed should be unchanged
        And a GET user request to "/api/v1/beds/<bedId>" should return status 200
        And response matches OpenAPI contract

    Scenario: Delete with the current version after updates succeeds
        Given a bed exists
        And the bed is stored at version 2
        And I use If-Match '"2"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract

    Scenario: A non existing bed returns 404 whatever the version
        Given I use If-Match '"999"'
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Concurrent deletes with the same version have a single winner
        Given a bed exists
        And I use If-Match '"0"'
        When I send 5 concurrent DELETE user requests to "/api/v1/beds/<bedId>"
        Then exactly 1 response should have status 204 and the rest 404
        And response matches OpenAPI contract

    Scenario: Delete without If-Match is rejected
        Given a bed exists
        And I record the current bed
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 428
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: Delete with a wildcard If-Match is rejected
        Given a bed exists
        And I use If-Match '*'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario Outline: Delete with an If-Match that names no current version fails the precondition (<header>)
        Given a bed exists
        And the bed is stored at version 3
        And I use If-Match '<header>'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 412
        And the bed should be unchanged
        And response matches OpenAPI contract

        Examples:
            | header |
            | W/"3"  |
            | "abc"  |

    Scenario: Delete with a list of entity tags that includes the current version
        Given a bed exists
        And the bed is stored at version 3
        And I use If-Match '"2", "3"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract

    Scenario: A weak If-Match on a missing bed answers not found
        Given I use If-Match 'W/"3"'
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario Outline: Delete with a malformed If-Match is rejected (<header>)
        Given a bed exists
        And I record the current bed
        And I use If-Match '<header>'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 400
        And the response errors should include "if-match"
        And the bed should be unchanged
        And response matches OpenAPI contract

        Examples:
            | header  |
            | 3       |
            | "3      |
            | "3" "4" |

    Scenario: A missing If-Match is reported before looking up the bed
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: A stale version is reported before the bed-has-plants conflict
        Given a bed exists
        And the bed has a plant
        And the bed is stored at version 1
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 412
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: Deleting a bed with plants with the current version is a conflict
        Given a bed exists
        And the bed has a plant
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 409
        And response matches OpenAPI contract

    Scenario: A soft delete records who deleted the bed and when
        Given a bed exists
        And the bed is stored at version 2
        And the bed was last updated by another user
        And I use If-Match '"2"'
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And the stored bed should record the user as deleter at version 3
