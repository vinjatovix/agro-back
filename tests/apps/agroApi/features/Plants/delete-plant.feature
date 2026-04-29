Feature: Delete a plant
    In order to remove an existing plant
    As an administrator
    I want to be able to delete a plant

    Scenario: Delete an existing plant
        Given a plant exists
        When I send a DELETE admin request to "/api/v1/plants/{plantId}"
        Then the response status code should be 204
        And GET "/api/v1/plants/{plantId}" returns 404

    Scenario: Delete a non-existing plant
        When I send a DELETE admin request to "/api/v1/plants/165d2414-365d-4c71-ab92-881a1d415712"
        Then the response status code should be 404
        And the response body should contain
            """
            {
                "message": "Plant not found: 165d2414-365d-4c71-ab92-881a1d415712"
            }
            """

    Scenario: Delete with an invalid id
        When I send a DELETE admin request to "/api/v1/plants/invalid-uuid"
        Then the response status code should be 400
        And the response body should contain
            """
            {
                "errors": {
                    "id": "Invalid value at params. Value: invalid-uuid"
                }
            }
            """

