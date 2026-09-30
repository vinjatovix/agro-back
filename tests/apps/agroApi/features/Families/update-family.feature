@family @update-family
Feature: Update Family
  In order to keep family information up to date
  As an administrator
  I want to be able to update a family partially

  Background:
    Given a family exists

  Scenario: Admin updates a family successfully
    Given I use If-Match '"0"'
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

  Scenario: Admin updates a family by slug successfully
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familySlug>" with body
      """
      {
        "name": "Updated Family Name By Slug",
        "scientificName": "Updatedus familiae slug"
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "name": "Updated Family Name By Slug",
        "scientificName": "Updatedus familiae slug"
      }
      """
    And response matches OpenAPI contract

  Scenario: Invalid payload returns 400
    Given I use If-Match '"0"'
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
    Given I use If-Match '"0"'
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

    And I use If-Match '"0"'
    When I send a PATCH user request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Illegal update"
      }
      """

    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Updating non-existent family returns 404
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/015b52e1-477c-4e3f-a47b-97ff220f7cfc" with body
      """
      {
        "name": "Ghost family"
      }
      """

    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: speciesCount must be >= 1
    Given I use If-Match '"0"'
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
    Given I use If-Match '"0"'
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
    Given I use If-Match '"0"'
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

  Scenario: A successful update returns the new version as ETag
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Versioned family"
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "name": "Versioned family",
        "version": 1
      }
      """
    And the response should have ETag '"1"'
    And the response ETag should match the body version
    And response matches OpenAPI contract

  Scenario: Update by slug a family that is already at a later version
    Given the family is stored at version 4
    And I use If-Match '"4"'
    When I send a PATCH admin request to "/api/v1/families/<familySlug>" with body
      """
      {
        "name": "Round-tripped family"
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"5"'
    And response matches OpenAPI contract

  Scenario: Update with an outdated version is rejected
    Given the family is stored at version 1
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Lost update"
      }
      """
    Then the response status code should be 412
    And the response should not have an ETag
    And the family should be unchanged
    And a GET user request to "/api/v1/families/<familyId>" should return a body containing
      """
      {
        "name": "<familyName>",
        "version": 1
      }
      """
    And response matches OpenAPI contract

  Scenario: A no-op update with an outdated version is rejected
    Given the family is stored at version 1
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "<familyName>"
      }
      """
    Then the response status code should be 412
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: A non existing family returns 404 whatever the version
    Given I use If-Match '"999"'
    When I send a PATCH admin request to "/api/v1/families/015b52e1-477c-4e3f-a47b-97ff220f7cfc" with body
      """
      {
        "name": "Ghost family"
      }
      """
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: The version cannot be set through the body
    Given I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "version": 99
      }
      """
    Then the response status code should be 400
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: Concurrent updates with the same version have a single winner
    Given I use If-Match '"0"'
    When I send 5 concurrent PATCH admin requests to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Concurrent family"
      }
      """
    Then exactly 1 response should have status 200 and the rest 412
    And response matches OpenAPI contract

  Scenario: Update without If-Match is rejected
    Given I record the current family
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "No precondition"
      }
      """
    Then the response status code should be 428
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: Update with a wildcard If-Match is rejected
    Given I use If-Match '*'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Wildcard"
      }
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Update with a non-numeric If-Match is rejected
    Given I use If-Match '"abc"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Not a number"
      }
      """
    Then the response status code should be 400
    And the response errors should include "if-match"
    And response matches OpenAPI contract

  Scenario: A missing If-Match is reported before validating the body
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {}
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Empty name is rejected
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": ""
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Aliases must be strings
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "aliases": ["valid", 42]
      }
      """
    Then the response status code should be 400
    And the response errors should include "aliases[1]"
    And response matches OpenAPI contract

  Scenario: Whitespace-only scientificName is rejected
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "scientificName": "   "
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Padded name is trimmed and stored
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "  Solanaceae  "
      }
      """
    Then the response status code should be 200
    And the response body matches "Solanaceae" for field "name"
    And response matches OpenAPI contract

  Scenario: slug null is rejected
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "slug": null
      }
      """
    Then the response status code should be 400
    And the response errors should include "slug"
    And response matches OpenAPI contract

  Scenario: A successful update answers from memory with the acting user's audit data
    Given the family was last updated by another user
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Audited Family Name"
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"1"'
    And the response audit data should show the admin as last editor
    And a GET admin request to "/api/v1/families/<familyId>" should return the same body
    And response matches OpenAPI contract
