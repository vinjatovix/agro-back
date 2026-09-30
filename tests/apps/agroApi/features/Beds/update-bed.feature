@beds @update-bed
Feature: Update a bed
    As a user
    I want to update a bed
    So that I can modify the details of my bed

    Scenario: Update a bed successfully
        Given a bed exists
        And I use If-Match '"0"'
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
        And I use If-Match '"0"'
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
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And response matches OpenAPI contract

    Scenario: Update a bed with invalid id
        Given I use If-Match '"0"'
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
        And I use If-Match '"0"'
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
        And I use If-Match '"0"'
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
        Given I use If-Match '"0"'
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
        And I use If-Match '"0"'
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

    Scenario: Cannot update a soft-deleted bed
        Given a soft-deleted bed exists for the current user
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        Then the response body should be
            """
            {
                "message": "Bed not found: <bedId>"
            }
            """
        And the bed should be unchanged
        And response matches OpenAPI contract



    Scenario: A successful update returns the new version as ETag
        Given a bed exists
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Versioned Bed"
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "name": "Versioned Bed",
                "version": 1
            }
            """
        And the response should have ETag '"1"'
        And the response ETag should match the body version
        And response matches OpenAPI contract

    Scenario: Update a bed that is already at a later version
        Given a bed exists
        And the bed is stored at version 3
        And I use If-Match '"3"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Round-tripped Bed"
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"4"'
        And response matches OpenAPI contract

    Scenario: Update with an outdated version is rejected
        Given a bed exists
        And the bed is stored at version 1
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Lost Update"
            }
            """
        Then the response status code should be 412
        And the response should not have an ETag
        And the bed should be unchanged
        And a GET user request to "/api/v1/beds/<bedId>" should return a body containing
            """
            {
                "name": "Test bed",
                "version": 1
            }
            """
        And response matches OpenAPI contract

    Scenario: A no-op update with an outdated version is rejected
        Given a bed exists
        And the bed is stored at version 1
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Test bed"
            }
            """
        Then the response status code should be 412
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: A no-op update with the current version keeps the version
        Given a bed exists
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Test bed"
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And response matches OpenAPI contract

    Scenario: A non existing bed returns 404 whatever the version
        Given I use If-Match '"999"'
        When I send a PATCH user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: A non owned bed returns 404 whatever the version
        Given a bed exists for another user
        And I use If-Match '"999"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: A soft-deleted bed returns 404 whatever the version
        Given a soft-deleted bed exists for the current user
        And I use If-Match '"999"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 404
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: The version cannot be set through the body
        Given a bed exists
        And I record the current bed
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "version": 99
            }
            """
        Then the response status code should be 400
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: Concurrent updates with the same version have a single winner
        Given a bed exists
        And I use If-Match '"0"'
        When I send 5 concurrent PATCH user requests to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Concurrent Bed"
            }
            """
        Then exactly 1 response should have status 200 and the rest 412
        And response matches OpenAPI contract

    Scenario: Update without If-Match is rejected
        Given a bed exists
        And I record the current bed
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 428
        And the bed should be unchanged
        And response matches OpenAPI contract

    Scenario: Update with a wildcard If-Match is rejected
        Given a bed exists
        And I use If-Match '*'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: Update with a weak If-Match is rejected
        Given a bed exists
        And I use If-Match 'W/"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 400
        And the response errors should include "if-match"
        And response matches OpenAPI contract

    Scenario: Update with a list of entity tags is rejected
        Given a bed exists
        And I use If-Match '"0", "1"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 400
        And the response errors should include "if-match"
        And response matches OpenAPI contract

    Scenario: A missing If-Match is reported before looking up the bed
        When I send a PATCH user request to "/api/v1/beds/12384ea3-e55d-4f69-8b0c-b54cccb9f443" with body
            """
            {
                "name": "Updated Bed Name"
            }
            """
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: A missing If-Match is reported before validating the body
        Given a bed exists
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {}
            """
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: A malformed If-Match is reported before validating the body
        Given a bed exists
        And I use If-Match 'W/"0"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "width": -100
            }
            """
        Then the response status code should be 400
        And the response errors should include "if-match"
        And response matches OpenAPI contract

    Scenario: A successful update answers from memory with the acting user's audit data
        Given a bed exists
        And the bed is stored at version 2
        And the bed was last updated by another user
        And I use If-Match '"2"'
        When I send a PATCH user request to "/api/v1/beds/<bedId>" with body
            """
            {
                "name": "Audited Bed Name"
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"3"'
        And the response body matches "3" for field "version"
        And the response audit data should show the user as last editor
        And a GET user request to "/api/v1/beds/<bedId>" should return the same body
        And response matches OpenAPI contract
