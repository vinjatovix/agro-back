Feature: Update Plant Instance (Crop)
    As a gardener
    I want to update crop details or move it within a bed
    So that I can track growth status changes and layout changes with concurrency protection

    Scenario: Update non-spatial attributes of a crop
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "growthStatus": "growing",
                "variety": "Cherry Roma",
                "notes": "Looking healthy"
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"1"'
        And the bed stored version should be 0

    Scenario: Sending null clears variety and notes
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop with variety and notes exists in the bed
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "variety": null,
                "notes": null
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"1"'
        And the stored crop should not have the fields "variety,notes"

    Scenario: Move a crop to new coordinates increments the bed version
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed at 30, 30
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "position": {
                    "x": 80,
                    "y": 80
                }
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"1"'
        And the bed stored version should be 1

    Scenario: Moving a crop into collision returns 409 conflict
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed at 30, 30
        And a crop exists in the bed at 70, 70
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "position": {
                    "x": 32,
                    "y": 32
                }
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract
        And the bed stored version should be 0

    Scenario: Update with stale If-Match returns 412 Precondition Failed
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        And I use If-Match '"999"'
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "growthStatus": "harvested"
            }
            """
        Then the response status code should be 412
        And response matches OpenAPI contract

    Scenario: Update without If-Match returns 428 Precondition Required
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        When I send a PATCH user request to "/api/v1/plant-instances/<cropId>" with body
            """
            {
                "growthStatus": "harvested"
            }
            """
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: Updating a non-existent crop returns 404
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/plant-instances/99999999-9999-4999-9999-999999999999" with body
            """
            {
                "growthStatus": "harvested"
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract
