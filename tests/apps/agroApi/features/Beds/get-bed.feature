@beds @get-bed
Feature: GetBed
    As a user
    I want to get a bed
    So that I can see the details of the bed

    Scenario: Get an existing bed
        Given a bed exists
        When I get the bed
        Then the response status code should be 200
        And the response ETag should match the body version
        And the response body should contain
            """
            {
                "id": "<bedId>",
                "plantInstances": []
            }
            """
        And response matches OpenAPI contract

    Scenario: Get a non-existing bed
        Given a GET user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: 12384ea3-e55d-4f69-8b0c-b54cccb9f443"
            }
            """
        And response matches OpenAPI contract

    Scenario: Cannot get a non owned bed
        Given a bed exists for another user
        When I send a GET user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And response matches OpenAPI contract

    Scenario: Cannot get a soft-deleted bed
        Given a soft-deleted bed exists for the current user
        When I get the bed
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And response matches OpenAPI contract

    Scenario: Get bed without authentication
        Given a bed exists
        When I send a GET request to "/api/v1/beds/<bedId>"
        Then the response status code should be 401
        Then the response body should be
            """
            {
                "message": "Invalid token"
            }
            """
        And response matches OpenAPI contract

    Scenario: A matching If-None-Match returns 304 without a body
        Given a bed exists
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 304
        And the response body should be empty
        And response matches OpenAPI contract

    Scenario: A missing bed returns no ETag
        When I send a GET user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        And the response should not have an ETag
        And response matches OpenAPI contract

    Scenario: Get a bed with an id that is not a UUID
        When I send a GET user request to "/api/v1/beds/not-a-uuid"
        Then the response status code should be 400
        And the response errors should include "id"
        And response matches OpenAPI contract

    Scenario: Get a bed with a query parameter is rejected
        Given a bed exists
        When I send a GET user request to "/api/v1/beds/<bedId>" with query:
            """
            x
            """
        Then the response status code should be 400
        And the response body should contain
            """
            {
                "errors": { "query": "Unknown field" }
            }
            """
        And response matches OpenAPI contract

    Scenario: Get a bed with a body is rejected
        Given a bed exists
        When I send a GET user request to "/api/v1/beds/<bedId>" with body:
            """
            {
                "name": "Bed"
            }
            """
        Then the response status code should be 400
        And the response body should contain
            """
            {
                "errors": { "name": "Unknown field" }
            }
            """
        And response matches OpenAPI contract
