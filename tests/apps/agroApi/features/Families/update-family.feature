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
    And the response errors should include "extra.speciesCount"
    And the response body should not echo "not-a-number"
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
    And the response body should contain
      """
      {
        "errors": {
          "extra.hack": "Unknown field"
        }
      }
      """
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

  Scenario Outline: Update with an If-Match that names no current version fails the precondition (<header>)
    Given the family is stored at version 3
    And I use If-Match '<header>'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Listed"
      }
      """
    Then the response status code should be 412
    And the family should be unchanged
    And response matches OpenAPI contract

    Examples:
      | header |
      | W/"3"  |
      | "abc"  |

  Scenario: Update with a list of entity tags that includes the current version
    Given the family is stored at version 3
    And I use If-Match '"2", "3"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Listed"
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"4"'
    And response matches OpenAPI contract

  Scenario: A weak If-Match on a missing family answers not found
    Given I use If-Match 'W/"3"'
    When I send a PATCH admin request to "/api/v1/families/12384ea3-e55d-4f69-8b0c-b54cccb9f443" with body
      """
      {
        "name": "Listed"
      }
      """
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario Outline: Update with a malformed If-Match is rejected (<header>)
    Given I use If-Match '<header>'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "name": "Listed"
      }
      """
    Then the response status code should be 400
    And the response errors should include "if-match"
    And response matches OpenAPI contract

    Examples:
      | header  |
      | 3       |
      | "3      |
      | "3" "4" |

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
    And the response errors should include "aliases.1"
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

  Scenario: Updating a family to the slug of another family returns conflict
    Given another family exists with slug "taken-slug"
    And I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "slug": "taken-slug"
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Duplicate document with {\"slug\":\"taken-slug\"}"
      }
      """
    And the family should be unchanged
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

  Scenario Outline: A null <field> is rejected and the family is unchanged
    Given I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "<field>": null
      }
      """
    Then the response status code should be 400
    And the response errors should include "<field>"
    And the family should be unchanged
    And response matches OpenAPI contract

    Examples:
      | field            |
      | slug             |
      | name             |
      | scientificName   |
      | shortDescription |
      | aliases          |
      | highlights       |

  Scenario: Blank aliases are dropped
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "aliases": ["  Rose family ", "", "   "]
      }
      """
    Then the response status code should be 200
    And the response body matches "Rose family" for field "aliases"
    And response matches OpenAPI contract

  Scenario: Repeated aliases are dropped ignoring letter case
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "aliases": ["Rose family", " rose family ", "Roses"]
      }
      """
    Then the response status code should be 200
    And the response body matches "Rose family,Roses" for field "aliases"
    And response matches OpenAPI contract

  Scenario: Blank highlights are dropped
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "highlights": ["  Five petals ", "", "  "]
      }
      """
    Then the response status code should be 200
    And the response body matches "Five petals" for field "highlights"
    And response matches OpenAPI contract

  Scenario: Blank subfamilies are dropped
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "subfamilies": ["  Rosoideae ", ""]
        }
      }
      """
    Then the response status code should be 200
    And the response body matches "Rosoideae" for field "extra.subfamilies"
    And response matches OpenAPI contract

  Scenario: Subfamilies must be strings
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "subfamilies": [1]
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "extra.subfamilies.0"
    And response matches OpenAPI contract

  Scenario: A null extra key removes only that key
    Given a family with extra exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {
          "order": null
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "extra": {
          "distribution": "Worldwide",
          "speciesCount": 3000,
          "subfamilies": ["Rosoideae"]
        }
      }
      """
    And the response body should not contain
      """
      {
        "extra": {
          "order": "Rosales"
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: An empty extra changes nothing
    Given a family with extra exists
    And I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "extra": {}
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"0"'
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: An empty body changes nothing
    Given I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {}
      """
    Then the response status code should be 200
    And the response should have ETag '"0"'
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: An empty body with an outdated version is rejected
    Given the family is stored at version 1
    And I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {}
      """
    Then the response status code should be 412
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: The id cannot be set through the body
    Given I record the current family
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with body
      """
      {
        "id": "015b52e1-477c-4e3f-a47b-97ff220f7cfc"
      }
      """
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "errors": {
          "id": "Unknown field"
        }
      }
      """
    And the family should be unchanged
    And response matches OpenAPI contract

  Scenario: An unknown query parameter is rejected on update
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/families/<familyId>" with query "foo=bar" and body
      """
      {
        "name": "Queried family"
      }
      """
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "errors": {
          "foo": "Unknown field"
        }
      }
      """
    And response matches OpenAPI contract
