@beds @update-bed
Feature: Update a bed
    As a user
    I want to update a bed
    So that I can modify the details of my bed

    Scenario: Update a bed successfully
        Given a bed exists
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name",
                "width": 250,
                "height": 350,
                "depth": 60
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "name": "Updated Bed Name",
                "width": 250,
                "height": 350,
                "depth": 60
            }
            """
        And response matches OpenAPI contract

    Scenario: Unauthenticated user cannot update a bed
        Given a bed exists
        When I send a PATCH request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Cannot update a non owned bed
        Given a bed exists for another user
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 403
        And response matches OpenAPI contract

    Scenario: Update a bed with invalid id
        When I send a PATCH user request to "/api/v1/beds/invalid-uuid" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "id": "Invalid value at params. Value: invalid-uuid"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Update a bed with missing fields
        Given a bed exists
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {}
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "message": "Empty body is not allowed"
            }
            """
        And response matches OpenAPI contract

    Scenario: Update a bed with invalid data
        Given a bed exists
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "",
                "width": -100,
                "height": 0,
                "depth": 0
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "name": "Invalid value at body. Value: ",
                    "width": "Invalid value at body. Value: -100",
                    "height": "Invalid value at body. Value: 0",
                    "depth": "Invalid value at body. Value: 0"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Update a non existing bed
        When I send a PATCH user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: 12384ea3-e55d-4f69-8b0c-b54cccb9f443"
            }
            """
        And response matches OpenAPI contract

    Scenario: Update UserId should be ignored
        Given a bed exists
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "userId": "another-user-id"
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "userId": "User ID cannot be updated at body. Value: another-user-id"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract


