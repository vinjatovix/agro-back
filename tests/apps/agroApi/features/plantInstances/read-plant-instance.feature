Feature: Read Plant Instance (Crop)
    As a gardener
    I want to read a specific crop by ID
    So that I can inspect its details and take advantage of HTTP caching

    Scenario: Read an active crop successfully
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        When I send a GET user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"0"'

    Scenario: Return 304 Not Modified when If-None-Match matches version ETag
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 304

    Scenario: Reading a non-existent crop returns 404
        When I send a GET user request to "/api/v1/plant-instances/99999999-9999-4999-9999-999999999999"
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Reading a crop belonging to another user returns 404
        Given a bed exists for another user
        And a crop exists in the bed
        When I send a GET user request to "/api/v1/plant-instances/<cropId>"
        Then the response status code should be 404
        And response matches OpenAPI contract
