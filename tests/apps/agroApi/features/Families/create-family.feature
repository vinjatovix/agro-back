@family @create-family
Feature: Create Family

  Scenario: Admin creates a family successfully
    Given a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "6d3e6de7-93e8-40d0-b8e3-76014d5849c6",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "aliases": [
          "rose-family"
        ],
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ]
      }
      """
    Then the response status code should be 201
    And the response should have ETag '"0"'
    And the response body should contain
      """
      {
        "id": "6d3e6de7-93e8-40d0-b8e3-76014d5849c6",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ]
      }
      """
    And response matches OpenAPI contract

  Scenario: Admin creates a family with extra fields
    Given a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "b921fc71-cc94-4ee5-acf7-d41b11308b9a",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "aliases": [
          "rose-family"
        ],
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ],
        "extra": {
          "order": "Rosales",
          "distribution": "Worldwide",
          "speciesCount": 2830
        }
      }
      """
    Then the response status code should be 201
    And the response should have ETag '"0"'
    And the response body should contain
      """
      {
        "extra": {
          "order": "Rosales",
          "distribution": "Worldwide",
          "speciesCount": 2830
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Unauthorized request should fail
    Given a POST request to "/api/v1/families/" with body
      """
      {
        "id": "f4c5835e-1b90-4fdc-9a7d-664ca4308dda",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ]
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Non-admin user cannot create family
    Given a POST user request to "/api/v1/families/" with body
      """
      {
        "id": "f4c5835e-1b90-4fdc-9a7d-664ca4308dda",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ]
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Invalid payload returns validation error
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "not-a-uuid",
        "slug": "",
        "name": "   ",
        "scientificName": "",
        "shortDescription": "",
        "highlights": "not-an-array"
      }
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the response errors should include "slug"
    And the response errors should include "name"
    And the response errors should include "scientificName"
    And the response errors should include "shortDescription"
    And the response errors should include "highlights"
    And the response body should not echo "not-a-uuid"
    And the response body should not echo "not-an-array"
    And response matches OpenAPI contract

  Scenario: Creating duplicate family id returns conflict
    Given a family exists
    And a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "<familyId>",
        "slug": "fabaceae",
        "name": "Fabaceae",
        "scientificName": "Fabaceae",
        "shortDescription": "Legume family",
        "highlights": [
          "beans",
          "peas"
        ]
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Family already exists: <familyId>"
      }
      """
    And response matches OpenAPI contract

  Scenario: Creating duplicate family slug returns conflict
    Given a family exists
    And a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "d4c5835e-1b90-4fdc-9a7d-664ca4308dda",
        "slug": "<familySlug>",
        "name": "Fabaceae",
        "aliases": [
          "legume-family"
        ],
        "scientificName": "Fabaceae",
        "shortDescription": "Legume family",
        "highlights": [
          "beans",
          "peas"
        ]
      }
      """
    Then the response status code should be 409
    And the response body should be
      """
      {
        "message": "Duplicate document with {\"slug\":\"<familySlug>\"}"
      }
      """
    And response matches OpenAPI contract

  Scenario: Unknown extra fields returns validation error
    Given a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "c2c5835e-1b90-4fdc-9a7d-664ca4308dda",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ],
        "extra": {
          "order": "Rosales",
          "invalidField": "should fail"
        }
      }
      """
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "message": "Validation error",
        "errors": {
          "extra.invalidField": "Unknown field"
        }
      }
      """
    And the response body should not echo "should fail"
    And response matches OpenAPI contract

  Scenario: extra cannot be null on create
    Given a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "d1c5835e-1b90-4fdc-9a7d-664ca4308dda",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": [
          "flowers",
          "fruits"
        ],
        "extra": null
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: A padded name is trimmed on creation
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "0a6b2c1e-3f4d-4a5b-8c6d-7e8f9a0b1c2d",
        "slug": "rosaceae",
        "name": "  Rosaceae  ",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"]
      }
      """
    Then the response status code should be 201
    And the response body matches "Rosaceae" for field "name"
    And response matches OpenAPI contract

  Scenario Outline: A whitespace-only <field> is rejected on creation
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "1b7c3d2f-4a5e-4b6c-9d7e-8f9a0b1c2d3e",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"],
        "<field>": "   "
      }
      """
    Then the response status code should be 400
    And the response errors should include "<field>"
    And response matches OpenAPI contract

    Examples:
      | field            |
      | slug             |
      | name             |
      | scientificName   |
      | shortDescription |

  Scenario: aliases cannot be null on create
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "2c8d4e3a-5b6f-4c7d-8e8f-9a0b1c2d3e4f",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"],
        "aliases": null
      }
      """
    Then the response status code should be 400
    And the response errors should include "aliases"
    And response matches OpenAPI contract

  Scenario: An empty extra is not stored
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "3d9e5f4b-6c7a-4d8e-9f0a-0b1c2d3e4f5a",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"],
        "extra": {}
      }
      """
    Then the response status code should be 201
    And the response body should not contain
      """
      {
        "extra": {}
      }
      """
    And response matches OpenAPI contract

  Scenario: A family can be created without aliases
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "4e0f6a5c-7d8b-4e9f-8a1b-1c2d3e4f5a6b",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"]
      }
      """
    Then the response status code should be 201
    And the response body should contain
      """
      {
        "aliases": []
      }
      """
    And response matches OpenAPI contract

  Scenario: Blank and repeated aliases and highlights are dropped
    When a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "5f1a7b6d-8e9c-4f0a-9b2c-2d3e4f5a6b7c",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "aliases": ["Rose family", " rose family ", "", "Roses"],
        "highlights": ["Five petals", "  five PETALS ", "   ", "Edible fruits"]
      }
      """
    Then the response status code should be 201
    And the response body matches "Rose family,Roses" for field "aliases"
    And the response body matches "Five petals,Edible fruits" for field "highlights"
    And response matches OpenAPI contract

  Scenario: An unknown query parameter is rejected on creation
    When a POST admin request to "/api/v1/families/" with query "foo=bar" and body
      """
      {
        "id": "6a2b8c7e-9f0d-4a1b-8c3d-3e4f5a6b7c8d",
        "slug": "rosaceae",
        "name": "Rosaceae",
        "scientificName": "Rosaceae",
        "shortDescription": "Family of flowering plants",
        "highlights": ["flowers"]
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
