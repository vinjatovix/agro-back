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
        And the response should have ETag '"0"'
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

    Scenario: Create a bed stores the name trimmed
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "5a0f3c5e-4b8e-4e0e-9a7c-1f2d3e4a5b6c",
                "name": "  Raised bed  ",
                "width": 120,
                "height": 240,
                "depth": 30.5
            }
            """
        Then the response status code should be 201
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "name": "Raised bed",
                "width": 120,
                "height": 240,
                "depth": 30.5,
                "version": 0
            }
            """
        And a GET user request to "/api/v1/beds/5a0f3c5e-4b8e-4e0e-9a7c-1f2d3e4a5b6c" should return a body containing
            """
            {
                "name": "Raised bed"
            }
            """
        And response matches OpenAPI contract

    Scenario: Create a bed with an empty body reports every missing field
        Given a POST user request to "/api/v1/beds" with body
            """
            {}
            """
        Then the response status code should be 400
        And the response errors should include "id"
        And the response errors should include "name"
        And the response errors should include "width"
        And the response errors should include "height"
        And the response errors should include "depth"
        And the response body should contain
            """
            {
                "message": "Validation error"
            }
            """
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
        And the response errors should include "name"
        And the response errors should include "depth"
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
        And the response errors should include "id"
        And the response body should not echo "invalid-uuid"
        And response matches OpenAPI contract

    Scenario Outline: Create a bed with an invalid <field> is rejected without echoing it
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1cb6d6e-ef59-4a3f-86f6-4d8288556610",
                "name": "Bed",
                "width": 100,
                "height": 100,
                "depth": 30,
                "<field>": <value>
            }
            """
        Then the response status code should be 400
        And the response errors should include "<field>"
        And the response body should not echo "<echo>"
        And response matches OpenAPI contract

        Examples:
            | field  | value                   | echo              |
            | name   | "   "                   | Bed               |
            | name   | "zz-sentinel-name-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | zz-sentinel-name  |
            | width  | 0                       | zz-sentinel-width |
            | height | -100                    | -100              |
            | depth  | "1.5"                   | 1.5               |
            | width  | "zz-sentinel-width"     | zz-sentinel-width |

    Scenario Outline: Create a bed with a field it does not accept (<field>)
        Given a POST user request to "/api/v1/beds" with body
            """
            {
                "id": "c1cb6d6e-ef59-4a3f-86f6-4d8288556610",
                "name": "Bed",
                "width": 100,
                "height": 100,
                "depth": 30,
                "<field>": <value>
            }
            """
        Then the response status code should be 400
        And the response body should contain
            """
            {
                "errors": { "<field>": "Unknown field" }
            }
            """
        And response matches OpenAPI contract

        Examples:
            | field          | value                                  |
            | userId         | "3d3fae8e-cd70-4190-a8c3-e144e6482403" |
            | plantInstances | []                                     |

    Scenario: Create a bed with a query parameter is rejected
        Given a POST user request to "/api/v1/beds" with query "x=1" and body
            """
            {
                "id": "c1cb6d6e-ef59-4a3f-86f6-4d8288556610",
                "name": "Bed",
                "width": 100,
                "height": 100,
                "depth": 30
            }
            """
        Then the response status code should be 400
        And the response body should contain
            """
            {
                "errors": { "x": "Unknown field" }
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