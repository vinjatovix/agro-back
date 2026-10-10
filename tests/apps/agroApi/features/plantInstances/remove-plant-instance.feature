Feature: Remove Plant Instance (Crop)
    As a gardener
    I want to remove a crop from a bed
    So that the space becomes available for new plantings and its removal is tracked

    Scenario: Remove a crop successfully
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 204
        And the bed stored version should be 1
        And the crop should be removed

    Scenario: Removing a crop with stale If-Match returns 412
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        And I use If-Match '"999"'
        When I send a DELETE user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 412
        And response matches OpenAPI contract
        And the bed stored version should be 0

    Scenario: Removing a crop without If-Match returns 428
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        When I send a DELETE user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 428
        And response matches OpenAPI contract
        And the bed stored version should be 0

    Scenario: Removing a non-existent crop returns 404
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/plant-instances/99999999-9999-4999-9999-999999999999"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Removing a crop belonging to another user returns 404
        Given a bed exists for another user
        And a crop exists in the bed
        And I use If-Match '"0"'
        When I send a DELETE user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 404
        And response matches OpenAPI contract
