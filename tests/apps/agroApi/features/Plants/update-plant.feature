Feature: Update a plant
    In order to modify an existing plant
    As an administrator
    I want to be able to update a plant partially

    Scenario: Update a plant with a partial field
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "identity": {
                    "name": {
                        "primary": "Updated Tomato"
                    }
                }
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "identity": {
                    "name": {
                        "primary": "Updated Tomato"
                    }
                }
            }
            """
        And response matches OpenAPI contract

    Scenario: Update nested range field
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "traits": {
                    "spacingCm": {
                        "min": 20,
                        "max": 40
                    }
                }
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "traits": {
                    "spacingCm": {
                        "min": 20,
                        "max": 40
                    }
                }
            }
            """
        And response matches OpenAPI contract

    Scenario: Fail to update with invalid UUID
        When I send a PATCH admin request to "/api/v1/plants/invalid-uuid" with body
            """
            {
                "id": "invalid-uuid",
                "identity": {
                    "name": {
                        "primary": "Test"
                    }
                }
            }
            """
        Then the response status code should be 400

    Scenario: Fail to update with unknown field
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "unknownField": "boom"
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract



    Scenario: Fail to update a non-existing plant
        When I send a PATCH admin request to "/api/v1/plants/0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3" with body
            """
            {
                "id": "0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3",
                "identity": {
                    "name": {
                        "primary": "Test"
                    }
                }
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract


    Scenario: Fail to update with invalid range values
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "traits": {
                    "size": {
                        "height": {
                            "min": 50,
                            "max": 10
                        }
                    }
                }
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "message": "Range min cannot be greater than max"
            }
            """
        And response matches OpenAPI contract

    Scenario: Fail to update with invalid months
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "phenology": {
                    "sowing": {
                        "months": [
                            0,
                            13
                        ]
                    }
                }
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "message": "Invalid month: 0"
            }
            """
        And response matches OpenAPI contract

    Scenario: Fail to update a plant without authentication
        Given a plant exists
        When I send a PATCH request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "identity": {
                    "name": {
                        "primary": "Test"
                    }
                }
            }
            """
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Fail to update a plant with invalid role
        Given a plant exists
        When I send a PATCH user request to "/api/v1/plants/{plantId}" with body
            """
            {
                "id": "{plantId}",
                "identity": {
                    "name": {
                        "primary": "Test"
                    }
                }
            }
            """
        Then the response status code should be 403
        And response matches OpenAPI contract

    Scenario: Fail to update with empty body
        Given a plant exists
        When I send a PATCH admin request to "/api/v1/plants/{plantId}" with body
            """
            {}
            """
        Then the response status code should be 400
        And response matches OpenAPI contract