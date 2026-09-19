@family @get-all-families
Feature: Get All Families

  Scenario: Get all families successfully
    Given multiple families exist
    When I send a GET request to "/api/v1/families"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And response matches OpenAPI contract


  Scenario: Get all families with pagination
    Given multiple families exist
    When I send a GET request to "/api/v1/families?pagination[page]=2&pagination[limit]=5"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And response matches OpenAPI contract


  Scenario: Get families filtered by exact match
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][eq]=Asteraceae"
    Then the response status code should be 200
    And every item should match:
      | field | operator | value      |
      | name  | eq       | Asteraceae |
    And response matches OpenAPI contract


  Scenario: Get families filtered by multiple values
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][hasAny]=Asteraceae,Solanaceae"
    Then the response status code should be 200
    And every item should match:
      | field | operator | value                 |
      | name  | hasAny   | Asteraceae,Solanaceae |
    And response matches OpenAPI contract

  Scenario: Get families filtered by startsWith operator
    When I send a GET request to "/api/v1/families?filter[name][startsWith]=Aster"
    Then the response status code should be 200
    And every item should match:
      | field | operator   | value |
      | name  | startsWith | Aster |
    And response matches OpenAPI contract

  Scenario: Get families filtered by endsWith operator
    When I send a GET request to "/api/v1/families?filter[name][endsWith]=aceae"
    Then the response status code should be 200
    And every item should match:
      | field | operator | value |
      | name  | endsWith | aceae |
    And response matches OpenAPI contract

  Scenario: Get families filtered by hasAny operator
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[aliases][hasAny]=rose,flower"
    Then the response status code should be 200
    And every item should match:
      | field   | operator | value       |
      | aliases | hasAny   | rose,flower |
    And response matches OpenAPI contract

  Scenario: Get families with multiple operators on same field
    When I send a GET request to "/api/v1/families?filter[name][contains]=ros&filter[name][hasAny]=Rosaceae,Solanaceae"
    Then the response status code should be 200
    And every item should match:
      | field | operator | value               |
      | name  | contains | ros                 |
      | name  | hasAny   | Rosaceae,Solanaceae |
    And response matches OpenAPI contract

  Scenario: Get all families with pagination and filters combined
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[scientificName][contains]=Solanum&pagination[page]=1&pagination[limit]=10"
    Then the response status code should be 200
    And every item should match:
      | field          | operator | value   |
      | scientificName | contains | Solanum |
    And response matches OpenAPI contract


  Scenario: Get all families with invalid pagination parameters returns validation error
    When I send a GET request to "/api/v1/families?pagination[page]=-1&pagination[limit]=5"
    Then the response status code should be 400
    And the response body should be
      """
      {
        "message": "pagination.page must be greater than 0"
      }
      """
    And response matches OpenAPI contract
