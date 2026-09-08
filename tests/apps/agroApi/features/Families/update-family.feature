@family @update-family
Feature: Update Family
  In order to keep family information up to date
  As an administrator
  I want to be able to update a family partially

  Background:
    Given a family exists

  Scenario: Admin updates a family successfully
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Updated Family Name",
        "scientificName": "Updatedus familiae",
        "aliases": [
          "alias1",
          "alias2"
        ],
        "extra": {
          "order": "Rosales",
          "distribution": "Global",
          "speciesCount": 120
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "name": "Updated Family Name",
        "scientificName": "Updatedus familiae"
      }
      """
    And response matches OpenAPI contract

  Scenario: Invalid payload returns 400
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "speciesCount": "not-a-number"
        }
      }
      """

    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Unauthenticated request fails
    When I send a PATCH request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Hack attempt"
      }
      """

    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Non-admin user cannot update family
    Given a POST user request to "/api/v1/auth/login" with body
      """
      {
        "email": "user@tsapi.com",
        "password": "user-password"
      }
      """

    When I send a PATCH user request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Illegal update"
      }
      """

    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Updating non-existent family returns 404
    When I send a PATCH admin request to "/api/v1/families/015b52e1-477c-4e3f-a47b-97ff220f7cfc" with body
      """
      {
        "name": "Ghost family"
      }
      """

    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: speciesCount must be >= 1
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "speciesCount": 0
        }
      }
      """

    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Unknown extra fields in PATCH returns validation error
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "order": "Rosales",
          "hack": "not allowed"
        }
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Setting extra to null deletes it
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": null
      }
      """
    Then the response status code should be 200
    And the response body should not contain
      """
      {
        "extra": {}
      }
      """
    And response matches OpenAPI contract
