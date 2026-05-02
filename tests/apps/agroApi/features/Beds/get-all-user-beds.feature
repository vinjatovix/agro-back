@beds @get-all-user-beds
Feature: Get all user's beds
    As a user
    I want to get all my beds
    So that I can see the details of my beds

    Scenario: Get all beds when beds exist
        Given a bed exists
        When I send a GET user request to "/api/v1/beds"
        Then the response status code should be 200
        And the response body should be a list
        And the list should contain at least 1 item
        And response matches OpenAPI contract
