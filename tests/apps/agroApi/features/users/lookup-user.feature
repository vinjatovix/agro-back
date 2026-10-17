@users @lookup-user
Feature: Admin looks up an account by email or username
    As an administrator
    I want to find an account's id by its exact email or username
    So that I can target it for a role change

    Scenario: Look up an account by its exact email
        Given a user-only account exists
        When I look up the account by its email as an administrator
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "<userId>",
                "username": "<targetUsername>",
                "email": "<targetEmail>",
                "roles": ["user"]
            }
            """
        And response matches OpenAPI contract

    Scenario: Look up the same account by its exact username
        Given a user-only account exists
        When I look up the account by its username as an administrator
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "<userId>",
                "email": "<targetEmail>"
            }
            """
        And response matches OpenAPI contract

    Scenario: Look up a value no account holds
        Given a user-only account exists
        When I look up a value no account holds as an administrator
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: An unauthenticated lookup is rejected
        When I send a GET request to "/api/v1/users/lookup"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: A non-admin lookup is rejected
        When I send a GET user request to "/api/v1/users/lookup"
        Then the response status code should be 403
        And response matches OpenAPI contract

    Scenario: A lookup with neither email nor username is rejected
        When I send a GET admin request to "/api/v1/users/lookup"
        Then the response status code should be 400
        And response matches OpenAPI contract

    Scenario: A lookup with both email and username is rejected
        Given a user-only account exists
        When I look up by email and username as an administrator
        Then the response status code should be 400
        And response matches OpenAPI contract
