@plants @get-all-plants
Feature: Get All Plants

  Scenario: Get all plants when plants exist
    Given a family exists
    And a plant exists
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And the list should contain at least 1 item
    And response matches OpenAPI contract

  Scenario: Get all plants when no plants exist
    Given no plants exist
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And the list should be empty
    And response matches OpenAPI contract

  Scenario: Filter plants by family
    Given multiple families exist
    And a plant exists
    When I send a GET request to "/api/v1/plants?filter[family][eq]=<familyId>"
    Then the response status code should be 200
    And every item should match:
      | field           | operator | value    |
      | identity.family | eq       | <familyId> |
    And response matches OpenAPI contract

  Scenario: Filter plants by lifecycle
    When I send a GET request to "/api/v1/plants?filter[lifeCycle][eq]=annual"
    Then the response status code should be 200
    And every item should match:
      | field     | operator | value  |
      | lifeCycle | eq       | annual |
    And response matches OpenAPI contract

  Scenario: Filter plants by root system type
    When I send a GET request to "/api/v1/plants?filter[rootSystem][eq]=taproot"
    Then the response status code should be 200
    And every item should match:
      | field      | operator | value   |
      | rootSystem | eq       | taproot |
    And response matches OpenAPI contract

  Scenario: Filter plants by sowing months
    When I send a GET request to "/api/v1/plants?filter[sowingMonths][hasAny]=3,4"
    Then the response status code should be 200
    And every item should match:
      | field                   | operator | value |
      | phenology.sowing.months | hasAny   | 3,4   |
    And response matches OpenAPI contract

  Scenario: Filter plants by aliases
    When I send a GET request to "/api/v1/plants?filter[aliases][hasAny]=tomato,roma"
    Then the response status code should be 200
    And every item should match:
      | field   | operator | value       |
      | aliases | hasAny   | tomato,roma |
    And response matches OpenAPI contract

  Scenario: Filter plants by soil pH
    When I send a GET request to "/api/v1/plants?filter[soilPh][eq]=7"
    Then the response status code should be 200
    And every item should match:
      | field  | operator | value |
      | soilPh | eq       | 7     |
    And response matches OpenAPI contract

  Scenario: Filter plants by spacing
    When I send a GET request to "/api/v1/plants?filter[spacingCm][lte]=20"
    Then the response status code should be 200
    And every item should match:
      | field     | operator | value |
      | spacingCm | lte      | 20    |
    And response matches OpenAPI contract

  Scenario: Filter plants by soil depth
    When I send a GET request to "/api/v1/plants?filter[soilAvailableDepthCm][lte]=30"
    Then the response status code should be 200
    And every item should match:
      | field                | operator | value |
      | soilAvailableDepthCm | lte      | 30    |
    And response matches OpenAPI contract

  Scenario: Filter plants by light type
    When I send a GET request to "/api/v1/plants?filter[lightType][eq]=full_sun"
    Then the response status code should be 200
    And every item should match:
      | field     | operator | value    |
      | lightType | eq       | full_sun |
    And response matches OpenAPI contract

  Scenario: Filter plants by minimum light hours
    When I send a GET request to "/api/v1/plants?filter[lightHoursMin][gte]=6"
    Then the response status code should be 200
    And every item should match:
      | field         | operator | value |
      | lightHoursMin | gte      | 6     |
    And response matches OpenAPI contract

  Scenario: Filter plants by strategic benefits
    When I send a GET request to "/api/v1/plants?filter[strategicBenefits][contains]=nitrogen"
    Then the response status code should be 200
    And every item should match:
      | field             | operator | value    |
      | strategicBenefits | contains | nitrogen |
    And response matches OpenAPI contract
