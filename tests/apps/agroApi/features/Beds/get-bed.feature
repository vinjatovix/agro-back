@beds @get-bed
Feature: GetBed
    As a user
    I want to get a bed
    So that I can see the details of the bed

    Scenario: Get an existing bed
        Given a bed exists
        When I get the bed
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "{bedId}",
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
        When I send a GET user request to "/api/v1/beds/{bedId}"
        Then the response status code should be 403
        Then the response body should be
            """
            {
                "message": "You do not have access to this bed: {bedId}"
            }
            """
        And response matches OpenAPI contract

    Scenario: Get bed without authentication
        Given a bed exists
        When I send a GET request to "/api/v1/beds/{bedId}"
        Then the response status code should be 401
        Then the response body should be
            """
            {
                "message": "Invalid token"
            }
            """
        And response matches OpenAPI contract
