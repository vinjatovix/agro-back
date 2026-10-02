@family @get-all-families
Feature: Get All Families

  Scenario: Get all families successfully
    Given multiple families exist
    When I send a GET request to "/api/v1/families"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And the response should not have an ETag
    And the response body should contain
      """
      { "pagination": { "page": 1, "limit": 25 } }
      """
    And response matches OpenAPI contract


  Scenario: Get all families with pagination
    Given multiple families exist
    When I send a GET request to "/api/v1/families?pagination[page]=2&pagination[limit]=5"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And response matches OpenAPI contract


  Scenario: Get all families with the largest page size
    Given multiple families exist
    When I send a GET request to "/api/v1/families?pagination[limit]=100"
    Then the response status code should be 200
    And the response body should contain
      """
      { "pagination": { "page": 1, "limit": 100 } }
      """
    And response matches OpenAPI contract


  Scenario: Get families filtered by exact match
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][eq]=Asteraceae"
    Then the response status code should be 200
    And the listed "name" should be exactly "Asteraceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by any of several names
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][in]=Asteraceae,Solanaceae"
    Then the response status code should be 200
    And the listed "name" should be exactly "Asteraceae,Solanaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by startsWith operator
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][startsWith]=Aster"
    Then the response status code should be 200
    And the listed "name" should be exactly "Asteraceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by endsWith operator
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][endsWith]=aceae"
    Then the response status code should be 200
    And the listed "name" should be exactly "Asteraceae,Solanaceae,Rosaceae,Lamiaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by alias membership
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[aliases][has]=rose"
    Then the response status code should be 200
    And the listed "name" should be exactly "Solanaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by hasAny operator
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[aliases][hasAny]=rose,flower"
    Then the response status code should be 200
    And the listed "name" should be exactly "Asteraceae,Solanaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get all families with pagination and filters combined
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[scientificName][contains]=Solanum&pagination[page]=1&pagination[limit]=10"
    Then the response status code should be 200
    And the listed "name" should be exactly "Solanaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families sorted by name
    Given multiple families exist
    When I send a GET request to "/api/v1/families?sort[name]=desc"
    Then the response status code should be 200
    And the listed "name" should be "Solanaceae,Rosaceae,Lamiaceae,Asteraceae"
    And response matches OpenAPI contract


  Scenario: Get families filtered by startsWith with an ordinary lowercase word
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][startsWith]=sol"
    Then the response status code should be 200
    And the listed "name" should be exactly "Solanaceae" in any order
    And response matches OpenAPI contract


  Scenario: Get families filtered by endsWith with an ordinary uppercase word
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][endsWith]=SACEAE"
    Then the response status code should be 200
    And the listed "name" should be exactly "Rosaceae" in any order
    And response matches OpenAPI contract


  Scenario Outline: Get families filtered by text with special characters matches it literally
    Given multiple families exist
    When I send a GET request to "/api/v1/families?filter[name][<operator>]=<value>"
    Then the response status code should be 200
    And the list should be empty
    And response matches OpenAPI contract

    Examples:
      | operator   | value              |
      | contains   | .*                 |
      | contains   | %28                |
      | contains   | %28a%2B%29%2B%24   |
      | startsWith | %5ES               |
      | endsWith   | %24                |


  Scenario: Get families filtered by text with special characters returns the literal match
    Given multiple families exist
    And a family exists with scientific name "Genus (x) family"
    When I send a GET request to "/api/v1/families?filter[scientificName][contains]=%28x%29"
    Then the response status code should be 200
    And the listed "scientificName" should be exactly "Genus (x) family" in any order
    And response matches OpenAPI contract


  Scenario Outline: Get families with a malformed query is rejected (<query>)
    When I send a GET request to "/api/v1/families?<query>"
    Then the response status code should be 400
    And the response errors should include "<path>"
    And the response body should contain
      """
      { "message": "Validation error" }
      """
    And response matches OpenAPI contract

    Examples:
      | query                                                    | path                  |
      | filter[name][regex]=.*                                   | filter.name.regex     |
      | filter[password][eq]=x                                   | filter.password       |
      | filter[name][eq][$ne]=x                                  | filter.name.eq        |
      | filter[name][contains]=                                  | filter.name.contains  |
      | filter[name][eq]=%20                                     | filter.name.eq        |
      | pagination[page]=0                                       | pagination.page       |
      | pagination[page]=-1                                      | pagination.page       |
      | pagination[limit]=abc                                    | pagination.limit      |
      | pagination[limit]=101                                    | pagination.limit      |
      | sort[name]=up                                            | sort.name             |
      | sort[password]=asc                                       | sort.password         |
      | sort=%7B%22name%22%3A%22asc%22%7D                        | sort                  |


  Scenario Outline: Get families with an unknown query key is rejected (<query>)
    When I send a GET request to "/api/v1/families?<query>"
    Then the response status code should be 400
    And the response body should contain
      """
      { "errors": { "<path>": "Unknown field" } }
      """
    And response matches OpenAPI contract

    Examples:
      | query               | path            |
      | foo=1               | foo             |
      | include=x           | include         |
      | pagination[size]=5  | pagination.size |


  Scenario Outline: Get families with a list operator on a text field hints at in (<operator>)
    When I send a GET request to "/api/v1/families?filter[name][<operator>]=Asteraceae"
    Then the response status code should be 400
    And the response body should contain
      """
      { "errors": { "filter.name.<operator>": "Use 'in' to match any of several values" } }
      """
    And response matches OpenAPI contract

    Examples:
      | operator |
      | has      |
      | hasAny   |


  Scenario: Get families with two operators on the same field is rejected
    When I send a GET request to "/api/v1/families?filter[name][contains]=ros&filter[name][eq]=Rosaceae"
    Then the response status code should be 400
    And the response body should contain
      """
      { "errors": { "filter.name": "Use one operator per field" } }
      """
    And response matches OpenAPI contract
