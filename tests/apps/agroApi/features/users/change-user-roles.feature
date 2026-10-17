@users @change-user-roles
Feature: Admin changes another account's roles
    As an administrator
    I want to grant and revoke roles on another account
    So that I can manage who has elevated access

    # --- User Story 1: grant ---

    Scenario: Grant a role the account lacks
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "<userId>",
                "roles": ["user", "admin"]
            }
            """
        And the response should have ETag '"1"'
        And response matches OpenAPI contract

    Scenario: Granting an already-held role is an idempotent no-op
        Given an administrator account exists as the only administrator
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And response matches OpenAPI contract

    Scenario: An unauthenticated request cannot change roles
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: A non-admin cannot change roles
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH user request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 403
        And response matches OpenAPI contract

    # --- User Story 2: revoke ---

    Scenario: Revoke a held role
        Given an administrator account exists alongside another administrator
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "remove": ["admin"]
            }
            """
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "<userId>",
                "roles": ["user"]
            }
            """
        And the response should have ETag '"1"'
        And response matches OpenAPI contract

    Scenario: Revoking a role the account lacks is an idempotent no-op
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "remove": ["admin"]
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And response matches OpenAPI contract

    # --- User Story 3: safeguards ---

    Scenario: Revoking admin from the only administrator is refused
        Given an administrator account exists as the only administrator
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "remove": ["admin"]
            }
            """
        Then the response status code should be 409
        And response matches OpenAPI contract

    Scenario: A role change on a non-existent account is not found
        Given I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/12384ea3-e55d-4f69-8b0c-b54cccb9f443/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: An unrecognized role name is rejected
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["superuser"]
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract

    Scenario: The non-manageable base role "user" cannot be granted or revoked
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "remove": ["user"]
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract

    Scenario: A stale version is rejected
        Given a user-only account exists
        And I use If-Match '"99"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 412
        And response matches OpenAPI contract

    Scenario: A missing If-Match is rejected
        Given a user-only account exists
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"]
            }
            """
        Then the response status code should be 428
        And response matches OpenAPI contract

    Scenario: The same role in both add and remove is rejected before any domain logic
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {
                "add": ["admin"],
                "remove": ["admin"]
            }
            """
        Then the response status code should be 422
        And response matches OpenAPI contract

    Scenario: An empty delta is an accepted no-op
        Given a user-only account exists
        And I use If-Match '"0"'
        When I send a PATCH admin request to "/api/v1/users/<userId>/roles" with body
            """
            {}
            """
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And response matches OpenAPI contract
