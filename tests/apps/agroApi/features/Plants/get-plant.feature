Feature: Get Plant

    Scenario: Get an existing plant
        Given a plant exists
        When I get the plant
        Then the response status code should be 200
        Then the response body should contain
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

    Scenario: Get a non-existing plant
        Given a GET request to "/api/v1/plants/12384ea3-e55d-4f69-8b0c-b54cccb9f443"
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Plant not found: 12384ea3-e55d-4f69-8b0c-b54cccb9f443"
            }
            """

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