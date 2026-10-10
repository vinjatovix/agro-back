Feature: Place a Crop in a Bed
    As a gardener
    I want to place a crop of a plant into a bed at coordinates
    So that I can track my plantings spatially and prevent invalid overlaps

    Scenario: Successfully place a crop in a bed
        Given a family exists
        And a plant exists
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567890",
                "bedId": "<bedId>",
                "plantId": "<plantId>",
                "position": {
                    "x": 50,
                    "y": 50
                },
                "growthStatus": "planted",
                "variety": "Roma",
                "notes": "Testing placement"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response crop should be active
        And the response ETag should match the body version
        And the bed stored version should be 1

    Scenario: Placing a crop without a position skips the spatial checks
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed at 50, 50
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567895",
                "bedId": "<bedId>",
                "plantId": "<plantId>"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response body should hold exactly the fields "id,userId,bedId,plantId,growthStatus,instanceStatus,plantedAt,metadata,version"

    Scenario: Placing a crop outside bed boundaries returns a 409 conflict
        Given a family exists
        And a plant exists
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567891",
                "bedId": "<bedId>",
                "plantId": "<plantId>",
                "position": {
                    "x": 9999,
                    "y": 9999
                }
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0

    Scenario: Placing a crop colliding with an existing crop returns a 409 conflict
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed at 50, 50
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567892",
                "bedId": "<bedId>",
                "plantId": "<plantId>",
                "position": {
                    "x": 52,
                    "y": 52
                }
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0

    Scenario: Placing a crop for a non-existent plant returns a 404
        Given a bed exists
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567893",
                "bedId": "<bedId>",
                "plantId": "99999999-9999-4999-9999-999999999999",
                "position": {
                    "x": 20,
                    "y": 20
                }
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Placing a crop in a bed belonging to another user returns a 404
        Given a family exists
        And a plant exists
        And a bed exists for another user
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "e7b0e1b2-5f11-4a12-8e12-9c1234567894",
                "bedId": "<bedId>",
                "plantId": "<plantId>",
                "position": {
                    "x": 20,
                    "y": 20
                }
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Placing a crop with an id already used by another user's crop returns a 409
        Given a family exists
        And a plant exists
        And a bed exists for another user
        And a crop exists in the bed at 10, 10
        And a bed exists
        When I send a POST user request to "/api/v1/plant-instances" with body
            """
            {
                "id": "<cropId>",
                "bedId": "<bedId>",
                "plantId": "<plantId>",
                "position": {
                    "x": 20,
                    "y": 20
                }
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the crop should not belong to the current bed
