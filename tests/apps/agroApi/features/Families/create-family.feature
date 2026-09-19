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
    Given a POST admin request to "/api/v1/families/" with body
      """
      {
        "id": "not-a-uuid",
        "slug": "",
        "name": "",
        "scientificName": "",
        "shortDescription": "",
        "highlights": "not-an-array"
      }
      """
    Then the response status code should be 400
    And the response body should be
      """
      {
        "errors": {
          "highlights": "Invalid value at body. Value: not-an-array",
          "id": "Invalid value at body. Value: not-a-uuid",
          "name": "Invalid value at body. Value: ",
          "scientificName": "Invalid value at body. Value: ",
          "shortDescription": "Invalid value at body. Value: ",
          "slug": "Invalid value at body. Value: "
        },
        "message": "Validation error"
      }
      """
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
    And the response body should be
      """
      {
        "message": "Validation error",
        "errors": {
          "extra": "Unknown fields at body. Value: {\"order\":\"Rosales\",\"invalidField\":\"should fail\"}"
        }
      }
      """
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
