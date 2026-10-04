@family @get-family-by-slug
Feature: Get Family By Slug

  Scenario: Get family by slug successfully
    Given a family exists
    When I send a GET request to "/api/v1/families/<familySlug>"
    Then the response status code should be 200
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "id": "<familyId>",
        "slug": "<familySlug>"
      }
      """
    And response matches OpenAPI contract

  Scenario: Get family by id successfully
    Given a family exists
    When I send a GET request to "/api/v1/families/<familyId>"
    Then the response status code should be 200
    And the response ETag should match the body version
    And the response body should contain
      """
      {
        "id": "<familyId>",
        "slug": "<familySlug>"
      }
      """
    And response matches OpenAPI contract

  Scenario: Get family with unknown slug returns not found
    When I send a GET request to "/api/v1/families/unknown-family"
    Then the response status code should be 404
    And the response body should be
      """
      {
        "message": "Family not found with slug: unknown-family"
      }
      """
    And response matches OpenAPI contract

  Scenario: Get family with unknown id returns not found
    When I send a GET request to "/api/v1/families/550e8400-e29b-41d4-a716-446655440000"
    Then the response status code should be 404
    And the response body should be
      """
      {
        "message": "Family not found: 550e8400-e29b-41d4-a716-446655440000"
      }
      """
    And response matches OpenAPI contract

  Scenario: Invalid uuid format falls back to slug lookup
    When I send a GET request to "/api/v1/families/not-a-valid-uuid"
    Then the response status code should be 404
    And the response body should be
      """
      {
        "message": "Family not found with slug: not-a-valid-uuid"
      }
      """
    And response matches OpenAPI contract

  Scenario: A blank identifier is rejected
    When I send a GET request to "/api/v1/families/%20%20"
    Then the response status code should be 400
    And the response errors should include "idOrSlug"
    And response matches OpenAPI contract

  Scenario: An unknown query parameter is rejected
    Given a family exists
    When I send a GET request to "/api/v1/families/<familySlug>" with query string "x=1"
    Then the response status code should be 400
    And the response body should contain
      """
      {
        "errors": {
          "x": "Unknown field"
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: A body field is rejected
    Given a family exists
    When I send a GET request to "/api/v1/families/<familySlug>" with body:
      """
      {
        "name": "Rosaceae"
      }
      """
    Then the response status code should be 400
    And the response errors should include "name"
    And response matches OpenAPI contract

  Scenario: A matching If-None-Match by slug returns 304 without a body
    Given a family exists
    And I use If-None-Match '"0"'
    When I send a GET user request to "/api/v1/families/<familySlug>"
    Then the response status code should be 304
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario: A matching If-None-Match by id returns 304 without a body
    Given a family exists
    And I use If-None-Match '"0"'
    When I send a GET user request to "/api/v1/families/<familyId>"
    Then the response status code should be 304
    And the response body should be empty
    And response matches OpenAPI contract

  Scenario Outline: A stored field outside the contract is not sent (<lookup>)
    Given a family exists with an extra stored field "internalNote"
    When I send a GET request to "/api/v1/families/<identifier>"
    Then the response status code should be 200
    And the response body should not echo "internalNote"
    And response matches OpenAPI contract

    Examples:
      | lookup  | identifier   |
      | by slug | <familySlug> |
      | by id   | <familyId>   |

  Scenario: A stored family that breaks the contract answers 500
    Given a stored family is missing the required field "shortDescription"
    When I send a GET request to "/api/v1/families/<familyId>"
    Then the response status code should be 500
    And the response body should be
      """
      {
        "message": "Internal server error"
      }
      """
    And response matches OpenAPI contract

  Scenario Outline: Get only some fields of a family by <key>
    Given a family exists
    When I send a GET request to "/api/v1/families/<<key>>?fields[families]=name,slug"
    Then the response status code should be 200
    And the response body should hold exactly the fields "id,name,slug"
    And the response should not have an ETag
    And response matches OpenAPI contract

    Examples:
      | key        |
      | familySlug |
      | familyId   |

  Scenario Outline: A malformed fields or include on a family answers 400 (<query>)
    Given a family exists
    When I send a GET request to "/api/v1/families/<familySlug>?<query>"
    Then the response status code should be 400
    And the response errors should include "<path>"
    And the response body should not echo "<value>"
    And response matches OpenAPI contract

    Examples:
      | query                    | path            | value  |
      | include=plants           | include         | plants |
      | fields[plants]=identity  | fields.plants   | identity |
      | fields[families]=colour  | fields.families | colour |
