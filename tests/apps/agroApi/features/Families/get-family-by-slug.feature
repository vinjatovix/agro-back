@family @get-family-by-slug
Feature: Get Family By Slug

  Scenario: Get family by slug successfully
    Given a family exists
    When I send a GET request to "/api/v1/families/{familySlug}"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "id": "{family}",
        "slug": "{familySlug}"
      }
      """
    And response matches OpenAPI contract

  Scenario: Get family by id successfully
    Given a family exists
    When I send a GET request to "/api/v1/families/{family}"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "id": "{family}",
        "slug": "{familySlug}"
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
