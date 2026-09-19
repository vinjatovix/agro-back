@beds @create-bed
Feature: Create Bed
    As a user
    I want to create a bed
    So that I can have a place to plant my plants

    Scenario: Create a bed successfully
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "3d3fae8e-cd70-4190-a8c3-e144e6482403",
                "name": "My Bed",
                "width": 200,
                "height": 300,
                "depth": 50
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract

    Scenario: Unauthenticated user cannot create a bed
        Given a POST request to "/api/v1/beds" with body
            """
            {
                "id": "3d3fae8e-cd70-4190-a8c3-e144e6482403",
                "name": "My Bed",
                "width": 200,
                "height": 300,
                "depth": 50
            }
            """
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Create a bed with missing fields
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "3d3fae8e-cd70-4190-a8c3-e144e6482403",
                "width": 200,
                "height": 300
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "depth": "Invalid value at body. Value: undefined",
                    "name": "Invalid value at body. Value: undefined"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Create a bed with invalid id
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "invalid-uuid",
                "name": "My Bed",
                "width": 200,
                "height": 300,
                "depth": 50
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "errors": {
                    "id": "Invalid value at body. Value: invalid-uuid"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Create a bed with invalid data
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1cb6d6e-ef59-4a3f-86f6-4d8288556610",
                "name": "Invalid Bed",
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
                    "depth": "Invalid value at body. Value: 0",
                    "height": "Invalid value at body. Value: 0",
                    "width": "Invalid value at body. Value: -100"
                },
                "message": "Validation error"
            }
            """
        And response matches OpenAPI contract

    Scenario: Conflict when creating a bed with existing ID
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "b67eb692-6920-4803-bfdb-7201db6625f0",
                "name": "My Bed",
                "width": 200,
                "height": 300,
                "depth": 50
            }
            """
        Then the response status code should be 201
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "b67eb692-6920-4803-bfdb-7201db6625f0",
                "name": "My Bed 2",
                "width": 200,
                "height": 300,
                "depth": 50
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract