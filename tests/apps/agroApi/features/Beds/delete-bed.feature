@beds @delete-bed
Feature: Delete a bed
    As a user
    I want to delete a bed
    So that I can remove a bed that I no longer need

    Scenario: Delete a bed successfully
        Given a bed exists
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract

    Scenario: Delete a non existing bed
        When I send a DELETE user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Cannot delete a non owned bed
        Given a bed exists for another user
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 403
        And response matches OpenAPI contract

    Scenario: Unauthenticated user cannot delete a bed
        Given a bed exists
        When I send a DELETE request to "/api/v1/beds/<bedId>"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Delete a bed with invalid id
        When I send a DELETE user request to "/api/v1/beds/invalid-uuid"
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "id": "Invalid value at params. Value: invalid-uuid"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Deleting an already deleted bed returns 204
        Given a bed exists
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        When I send a DELETE user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 204
        And response matches OpenAPI contract
