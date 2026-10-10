Feature: Bed Include Plant Instances
    As a gardener
    I want bed endpoints to return crop UUIDs by default or full crop details with include=plantInstances
    So that payload sizes are minimized while supporting full crop details when needed

    Scenario: Read bed by id returns crop UUID array and ETag by default
        Given a bed exists
        And the bed has a plant
        When I send a GET user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should have ETag '"0"'
        And the bed plantInstances should contain crop UUIDs

    Scenario: Conditional read without include returns 304 Not Modified
        Given a bed exists
        And the bed has a plant
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/beds/<bedId>"
        Then the response status code should be 304

    Scenario: Read bed with include=plantInstances embeds full crop objects and omits ETag
        Given a bed exists
        And the bed has a plant
        When I send a GET user request to "/api/v1/beds/<bedId>?include=plantInstances"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should not have an ETag
        And the bed plantInstances should contain full crop objects

    Scenario: Conditional read with include=plantInstances never returns 304
        Given a bed exists
        And the bed has a plant
        And I use If-None-Match '"0"'
        When I send a GET user request to "/api/v1/beds/<bedId>?include=plantInstances"
        Then the response status code should be 200
        And the response should not have an ETag
        And the bed plantInstances should contain full crop objects

    Scenario: Read bed with invalid include returns 400
        Given a bed exists
        When I send a GET user request to "/api/v1/beds/<bedId>?include=invalidRelation"
        Then the response status code should be 400
        And response matches OpenAPI contract

    Scenario: List user beds without include returns crop UUIDs
        Given a bed exists
        And the bed has a plant
        When I send a GET user request to "/api/v1/beds"
        Then the response status code should be 200
        And response matches OpenAPI contract

    Scenario: List user beds with include=plantInstances embeds full crop objects
        Given a bed exists
        And the bed has a plant
        When I send a GET user request to "/api/v1/beds?include=plantInstances"
        Then the response status code should be 200
        And response matches OpenAPI contract

    Scenario: List user beds with invalid include returns 400
        When I send a GET user request to "/api/v1/beds?include=invalidRelation"
        Then the response status code should be 400
        And response matches OpenAPI contract
