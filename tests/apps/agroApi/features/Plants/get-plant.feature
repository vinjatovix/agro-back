Feature: Get Plant

    Scenario: Get an existing plant
        Given a plant exists
        When I get the plant
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "<plantId>",
                "identity": {
                    "name": {
                        "primary": "Test plant"
                    }
                }
            }
            """
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
        Then the response body should be
            """
            {
                "errors": {
                    "id": "Invalid value at params. Value: invalid-id"
                },
                "message": "Validation error"
            }
            """
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
        Given a plant exists
        When I send a DELETE admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 204
        When I send a GET admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 200
        And response matches OpenAPI contract

    Scenario: Non-admin cannot access deleted plant
        Given a plant exists
        When I send a DELETE admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 204
        When I send a GET request to "/api/v1/plants/{plantId}"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Get after double delete remains consistent
        Given a plant exists
        When I send a DELETE admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 204
        And I send a DELETE admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 204
        And I send a GET admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 200
        And response matches OpenAPI contract

