Feature: List Plant Instances (Crops)
    As a gardener
    I want to list my active crops
    So that I can see what is planted in my beds

    Scenario: List active crops for current user
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        When I send a GET user request to "/api/v1/plant-instances"
        Then the response status code should be 200
        And response matches OpenAPI contract

    Scenario: Filter crops by bedId
        Given a family exists
        And a plant exists
        And a bed exists
        And a crop exists in the bed
        When I send a GET user request to "/api/v1/plant-instances?filter[bedId][eq]=<bedId>"
        Then the response status code should be 200
        And response matches OpenAPI contract

    Scenario: Unknown query parameters are rejected with 400
        When I send a GET user request to "/api/v1/plant-instances?unknownParam=123"
        Then the response status code should be 400
        And response matches OpenAPI contract
