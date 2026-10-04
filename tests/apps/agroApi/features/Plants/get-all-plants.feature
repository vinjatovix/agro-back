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

  Scenario: Get all plants as an authenticated user
    Given a family exists
    And a plant exists
    When I send a GET user request to "/api/v1/plants"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And the list should contain at least 1 item
    And response matches OpenAPI contract

  Scenario: Regular user does not see soft-deleted plants in the list
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET user request to "/api/v1/plants"
    Then the response status code should be 200
    And the list should be empty
    And response matches OpenAPI contract

  Scenario: Admin sees soft-deleted plants in the list
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET admin request to "/api/v1/plants"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And response matches OpenAPI contract

  Scenario: Collaborator sees soft-deleted plants in the list
    Given a family exists
    And a soft-deleted plant exists
    When I send a GET collaborator request to "/api/v1/plants"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And response matches OpenAPI contract

  Scenario: Get all plants when no plants exist
    Given no plants exist
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 200
    And the response body should contain a paginated list
    And the list should be empty
    And response matches OpenAPI contract


  Scenario Outline: Filter plants returns exactly the matching plants (<query>)
    Given a family exists
    And another family exists
    And the following plants exist:
      | name    | scientificName       | family | identity.name.aliases | traits.lifecycle | phenology.sowing.months | traits.spacingCm      | knowledge.light.type | knowledge.rootSystem.type | phenology.sowing.methods.starter |
      | Tomate  | Solanum lycopersicum | first  | ["Jitomate"]          | annual           | [3,4]                   | {"min":40,"max":50}   | full_sun             | taproot                   | {"depthCm":{"min":1,"max":2}}    |
      | Lechuga | Lactuca sativa       | other  | ["Romana"]            | biennial         | [4,9]                   | {"min":20,"max":30}   | partial_shade        | fibrous                   |                                  |
      | Ajo     | Allium sativum       | other  | ["Garlic"]            | perennial        | [10]                    | {"min":10,"max":15}   | full_sun             | bulb                      | {"depthCm":{"min":1,"max":2}}    |
    When I send a GET request to "/api/v1/plants?<query>"
    Then the response status code should be 200
    And the listed "identity.name.primary" should be exactly "<plants>" in any order
    And response matches OpenAPI contract

    Examples:
      | query                                                                  | plants             |
      | filter[identity][contains]=mat                                         | Tomate             |
      | filter[identity][eq]=jitomate                                          | Tomate             |
      | filter[identity][in]=Ajo,Lechuga                                       | Ajo,Lechuga        |
      | filter[identity][startsWith]=Lact                                      | Lechuga            |
      | filter[identity][endsWith]=sativum                                     | Ajo                |
      | filter[lifeCycle][eq]=annual                                           | Tomate             |
      | filter[lifeCycle][in]=annual,biennial                                  | Tomate,Lechuga     |
      | filter[sowingMonths][has]=4                                            | Tomate,Lechuga     |
      | filter[sowingMonths][hasAny]=3,10                                      | Tomate,Ajo         |
      | filter[spacingCm][eq]=30                                               | Lechuga,Ajo        |
      | filter[sowingMethod][eq]=starter                                       | Tomate,Ajo         |
      | filter[sowingMethod][in]=direct,starter                                | Tomate,Lechuga,Ajo |
      | filter[lightType][contains]=shade                                      | Lechuga            |
      | filter[rootSystem][in]=taproot,bulb                                    | Tomate,Ajo         |
      | filter[identity][contains]=sativ&filter[sowingMethod][in]=starter      | Ajo                |


  Scenario: Filter plants by family
    Given a family exists
    And another family exists
    And the following plants exist:
      | name    | scientificName       | family |
      | Tomate  | Solanum lycopersicum | first  |
      | Lechuga | Lactuca sativa       | other  |
    When I send a GET request to "/api/v1/plants?filter[family][eq]=<familyId>"
    Then the response status code should be 200
    And the listed "identity.name.primary" should be exactly "Tomate" in any order
    And response matches OpenAPI contract

  Scenario: Filter plants by any of several families
    Given a family exists
    And another family exists
    And the following plants exist:
      | name    | scientificName       | family |
      | Tomate  | Solanum lycopersicum | first  |
      | Lechuga | Lactuca sativa       | other  |
    When I send a GET request to "/api/v1/plants?filter[family][in]=<otherFamilyId>"
    Then the response status code should be 200
    And the listed "identity.name.primary" should be exactly "Lechuga" in any order
    And response matches OpenAPI contract


  Scenario Outline: Sort plants by <key> <direction>
    Given a family exists
    And the following plants exist:
      | name    | scientificName       |
      | Tomate  | Solanum lycopersicum |
      | apio    | Apium graveolens     |
      | Lechuga | Lactuca sativa       |
    When I send a GET request to "/api/v1/plants?sort[<key>]=<direction>"
    Then the response status code should be 200
    And the listed "identity.name.primary" should be "<plants>"
    And response matches OpenAPI contract

    Examples:
      | key            | direction | plants              |
      | name           | asc       | apio,Lechuga,Tomate |
      | scientificName | desc      | Tomate,Lechuga,apio |


  Scenario Outline: Filter plants with an unsupported filter or value is rejected (<query>)
    When I send a GET request to "/api/v1/plants?<query>"
    Then the response status code should be 400
    And the response errors should include "<path>"
    And response matches OpenAPI contract

    Examples:
      | query                                          | path                             |
      | filter[aliases][hasAny]=tomato,roma            | filter.aliases                   |
      | filter[strategicBenefits][contains]=nitrogen   | filter.strategicBenefits         |
      | filter[spacingCm][lte]=20                      | filter.spacingCm.lte             |
      | filter[lightHoursMin][gte]=6                   | filter.lightHoursMin.gte         |
      | filter[soilAvailableDepthCm][lte]=30           | filter.soilAvailableDepthCm.lte  |
      | filter[family][contains]=x                     | filter.family.contains           |
      | filter[lifeCycle][eq]=yearly                   | filter.lifeCycle.eq              |
      | filter[soilPh][eq]=abc                         | filter.soilPh.eq                 |
      | filter[sowingMonths][has]=13                   | filter.sowingMonths.has          |
      | sort[identity.name.primary]=asc                | sort.identity.name.primary       |

  Scenario: A stored field outside the contract is not listed
    Given a family exists
    And a plant exists with an extra stored field "internalNote"
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And the response body should not echo "internalNote"
    And response matches OpenAPI contract

  Scenario: A page holding a plant that breaks the contract answers 500 with no data
    Given a family exists
    And a stored plant is missing the required field "traits"
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 500
    And the response body should be
      """
      {
        "message": "Internal server error"
      }
      """
    And response matches OpenAPI contract


  Scenario: List plants with only their identity
    Given a family exists
    And the following plants exist:
      | name    | scientificName       |
      | Tomate  | Solanum lycopersicum |
      | apio    | Apium graveolens     |
      | Lechuga | Lactuca sativa       |
    When I send a GET request to "/api/v1/plants?fields[plants]=identity&pagination[limit]=2"
    Then the response status code should be 200
    And each item should hold exactly the fields "id,identity"
    And the response body should contain
      """
      { "pagination": { "page": 1, "limit": 2, "totalItems": 3, "totalPages": 2 } }
      """
    And response matches OpenAPI contract

  Scenario: A filtered, sorted and paged listing keeps its plants with a fieldset
    Given a family exists
    And the following plants exist:
      | name    | scientificName       | traits.lifecycle |
      | Tomate  | Solanum lycopersicum | annual           |
      | apio    | Apium graveolens     | biennial         |
      | Lechuga | Lactuca sativa       | annual           |
      | Ajo     | Allium sativum       | annual           |
    When I send a GET request to "/api/v1/plants?filter[lifeCycle][eq]=annual&sort[name]=desc&pagination[limit]=2&fields[plants]=identity"
    Then the response status code should be 200
    And the listed "identity.name.primary" should be "Tomate,Lechuga"
    And each item should hold exactly the fields "id,identity"
    And the response body should contain
      """
      { "pagination": { "page": 1, "limit": 2, "totalItems": 3, "totalPages": 2 } }
      """
    And response matches OpenAPI contract

  Scenario: Without fields every plant is sent in full
    Given a family exists
    And a plant exists
    When I send a GET request to "/api/v1/plants"
    Then the response status code should be 200
    And each item should hold exactly the fields "id,version,identity,traits,phenology,knowledge,metadata,status,deletedAt"
    And response matches OpenAPI contract

  Scenario: List plants from several families with their family
    Given plants exist from 3 families
    When I send a GET request to "/api/v1/plants?include=family"
    Then the response status code should be 200
    And every listed plant should carry the summary of its own family
    And response matches OpenAPI contract

  Scenario Outline: A malformed fields or include on the listing answers 400 (<query>)
    When I send a GET request to "/api/v1/plants?<query>"
    Then the response status code should be 400
    And the response errors should include "<path>"
    And the response body should not echo "<value>"
    And response matches OpenAPI contract

    Examples:
      | query                            | path            | value         |
      | fields[plants]=identity,colour   | fields.plants   | colour        |
      | fields[families]=highlights      | fields.families | highlights    |
      | include=seeds                    | include         | seeds         |
      | fields[plants]=                  | fields.plants   | fields[plants]= |
      | fields[plants]=identity.name     | fields.plants   | identity.name |
      | fields[plants]=Identity          | fields.plants   | Identity      |
      | fields=traits                    | fields          | traits        |
