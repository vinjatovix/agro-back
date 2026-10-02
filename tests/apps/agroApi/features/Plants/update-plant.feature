@plants @update-plant
Feature: Update a plant
  In order to modify an existing plant
  As an administrator
  I want to be able to update a plant partially

  Scenario: Update a plant with a partial field
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Updated Tomato"
          }
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "identity": {
          "name": {
            "primary": "Updated Tomato"
          }
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Update nested range field
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "traits": {
          "spacingCm": {
            "min": 20,
            "max": 40
          }
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "traits": {
          "spacingCm": {
            "min": 20,
            "max": 40
          }
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail to update with invalid UUID
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/invalid-uuid" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 400

  Scenario: Fail to update with unknown field
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "unknownField": "boom"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Fail to update with an id in the body
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Fail to update with an unknown query parameter
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>?foo=bar" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "foo"
    And response matches OpenAPI contract

  Scenario: Update flowering and harvest phenology
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": {
          "flowering": {
            "months": [5, 6],
            "pollination": {
              "types": ["bird"],
              "agents": ["hummingbird"]
            }
          },
          "harvest": {
            "months": [9, 10],
            "description": "Pick when fully coloured"
          }
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "phenology": {
          "flowering": {
            "months": [5, 6],
            "pollination": {
              "types": ["bird"],
              "agents": ["hummingbird"]
            }
          },
          "harvest": {
            "months": [9, 10],
            "description": "Pick when fully coloured"
          }
        }
      }
      """
    And the response should have ETag '"1"'
    And response matches OpenAPI contract

  Scenario: Fail to add pollination agents without pollination types
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": {
          "flowering": {
            "pollination": {
              "agents": ["bee"]
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Remove optional details with null
    Given a family exists
    And a plant with optional details exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": {
          "flowering": { "pollination": null },
          "harvest": { "description": null }
        },
        "knowledge": {
          "watering": null,
          "propagation": { "methods": { "seed": null } }
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "knowledge": {
          "propagation": { "methods": { "division": { "seasons": ["autumn"] } } }
        }
      }
      """
    And the response body should not contain
      """
      { "phenology": { "flowering": { "pollination": { "agents": ["bee"] } } } }
      """
    And the response body should not contain
      """
      { "phenology": { "harvest": { "description": "Pick when ripe" } } }
      """
    And the response body should not contain
      """
      { "knowledge": { "watering": { "frequency": "weekly" } } }
      """
    And the response body should not contain
      """
      { "knowledge": { "propagation": { "methods": { "seed": { "seasons": ["spring"] } } } } }
      """
    And the response should have ETag '"1"'
    And response matches OpenAPI contract

  Scenario: New pollination types keep the agents while an animal type remains
    Given a family exists
    And a plant with optional details exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": { "flowering": { "pollination": { "types": ["wind", "insect"] } } }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "phenology": {
          "flowering": {
            "pollination": { "types": ["wind", "insect"], "agents": ["bee"] }
          }
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Pollination types without an animal type drop the agents
    Given a family exists
    And a plant with optional details exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": { "flowering": { "pollination": { "types": ["wind"] } } }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      { "phenology": { "flowering": { "pollination": { "types": ["wind"] } } } }
      """
    And the response body should not contain
      """
      { "phenology": { "flowering": { "pollination": { "agents": ["bee"] } } } }
      """
    And response matches OpenAPI contract

  Scenario Outline: Fail to update with pollination types the plant cannot store
    Given a family exists
    And a plant with optional details exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": { "flowering": { "pollination": { "types": <types> } } }
      }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | types                |
      | ["insect", "insect"] |
      | ["none"]             |
      | ["spore"]            |

  Scenario Outline: Fail to update with a season repeated in a list
    Given a family exists
    And a plant with optional details exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      { "knowledge": <knowledge> }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | knowledge                                                                                                              |
      | { "pruning": [{ "type": "maintenance", "intensity": "light", "seasons": ["spring", "spring"], "frequencyPerYear": 1 }] } |
      | { "propagation": { "methods": { "seed": { "seasons": ["autumn", "autumn"] } } } }                                     |

  Scenario Outline: Fail to update a pruning entry with frequencyPerYear <frequency>
    Given a family exists
    And a plant with optional details exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      { "knowledge": { "pruning": [{ "type": "maintenance", "intensity": "light", "seasons": ["spring"], "frequencyPerYear": <frequency> }] } }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | frequency |
      | 0         |
      | -1        |

  Scenario Outline: Fail to update the light hours to <hours>, outside 0 to 24
    Given a family exists
    And a plant with optional details exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      { "knowledge": { "light": { "hoursMin": <hours> } } }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | hours |
      | -1    |
      | 25    |

  Scenario: Removing the last ecology field removes the ecology
    Given a family exists
    And a plant with optional details exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      { "knowledge": { "ecology": { "strategicBenefits": null } } }
      """
    Then the response status code should be 200
    And the response body matches "undefined" for field "knowledge.ecology"
    And the response should have ETag '"1"'
    And response matches OpenAPI contract

  Scenario Outline: Fail to update with a value the plant cannot store
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      <body>
      """
    Then the response status code should be 400
    And the response errors should include "<errorPath>"
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | body                                                                             | errorPath                     |
      | { "knowledge": { "rootSystem": { "type": "   " } } }                             | knowledge.rootSystem.type     |
      | { "knowledge": { "light": { "type": "   " } } }                                  | knowledge.light.type          |
      | { "knowledge": { "watering": { "frequency": "   " } } }                          | knowledge.watering.frequency  |
      | { "knowledge": { "pruning": [{ "type": "   ", "intensity": "light", "seasons": ["spring"], "frequencyPerYear": 1 }] } } | knowledge.pruning.0.type |
      | { "phenology": { "harvest": { "description": "   " } } }                         | phenology.harvest.description |
      | { "knowledge": { "resources": [{ "type": "link", "url": "javascript:alert(1)" }] } } | knowledge.resources.0.url     |

  Scenario: Fail to remove a required knowledge section with null
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": { "light": null }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.light"
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Fail to update a non-existing plant
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: Fail to update a soft-deleted plant
    Given a family exists
    And a soft-deleted plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 404
    And the response body should contain
      """
      {
        "message": "Plant not found: <plantId>"
      }
      """
    And the plant should be unchanged
    And response matches OpenAPI contract

  # The bounds order is a domain rule (`Range`), not a request-shape one.
  Scenario: Fail to update with invalid range values
    Given a family exists
    Given a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "traits": {
          "size": {
            "height": {
              "min": 50,
              "max": 10
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Fail to update with invalid months
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "phenology": {
          "sowing": {
            "months": [
              0,
              13
            ]
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "phenology.sowing.months.0"
    And the response errors should include "phenology.sowing.months.1"
    And response matches OpenAPI contract

  Scenario: Fail to update a plant without authentication
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Fail to update a plant with invalid role
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH user request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test"
          }
        }
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: An empty body is a no-op
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {}
      """
    Then the response status code should be 200
    And the response should have ETag '"0"'
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: An empty body with an outdated version is rejected
    Given a family exists
    And a plant exists
    And the plant is stored at version 1
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {}
      """
    Then the response status code should be 412
    And response matches OpenAPI contract

  Scenario: Fail to update with an unexistent family
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "family": "0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: A successful update returns the new version as ETag
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Versioned plant"
          }
        }
      }
      """
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "version": 1
      }
      """
    And the response should have ETag '"1"'
    And the response ETag should match the body version
    And response matches OpenAPI contract

  Scenario: Update a plant that is already at a later version
    Given a family exists
    And a plant exists
    And the plant is stored at version 2
    And I use If-Match '"2"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Round-tripped plant"
          }
        }
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"3"'
    And response matches OpenAPI contract

  Scenario: Update with an outdated version is rejected
    Given a family exists
    And a plant exists
    And the plant is stored at version 1
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Lost update"
          }
        }
      }
      """
    Then the response status code should be 412
    And the response should not have an ETag
    And the plant should be unchanged
    And a GET user request to "/api/v1/plants/<plantId>" should return a body containing
      """
      {
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Test plant"
          }
        },
        "version": 1
      }
      """
    And response matches OpenAPI contract

  Scenario: A no-op update with an outdated version is rejected
    Given a family exists
    And a plant exists
    And the plant is stored at version 1
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test plant"
          }
        }
      }
      """
    Then the response status code should be 412
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: A non existing plant returns 404 whatever the version
    Given I use If-Match '"999"'
    When I send a PATCH admin request to "/api/v1/plants/0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Ghost"
          }
        }
      }
      """
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario: A soft-deleted plant returns 404 whatever the version
    Given a family exists
    And a soft-deleted plant exists
    And I use If-Match '"999"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Ghost"
          }
        }
      }
      """
    Then the response status code should be 404
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: The version cannot be set through the body
    Given a family exists
    And a plant exists
    And I record the current plant
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "version": 99
      }
      """
    Then the response status code should be 400
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Concurrent updates with the same version have a single winner
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send 5 concurrent PATCH admin requests to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Concurrent plant"
          }
        }
      }
      """
    Then exactly 1 response should have status 200 and the rest 412
    And response matches OpenAPI contract

  Scenario: Update without If-Match is rejected
    Given a family exists
    And a plant exists
    And I record the current plant
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "No precondition"
          }
        }
      }
      """
    Then the response status code should be 428
    And the plant should be unchanged
    And response matches OpenAPI contract

  Scenario: Update with a wildcard If-Match is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '*'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Wildcard"
          }
        }
      }
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario Outline: Update with an If-Match that names no current version fails the precondition (<header>)
    Given a family exists
    And a plant exists
    And the plant is stored at version 3
    And I use If-Match '<header>'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Listed"
          }
        }
      }
      """
    Then the response status code should be 412
    And the plant should be unchanged
    And response matches OpenAPI contract

    Examples:
      | header |
      | W/"3"  |
      | "abc"  |
      | "-1"   |

  Scenario: Update with a list of entity tags that includes the current version
    Given a family exists
    And a plant exists
    And the plant is stored at version 3
    And I use If-Match '"2", "3"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Listed"
          }
        }
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"4"'
    And response matches OpenAPI contract

  Scenario: A weak If-Match on a missing plant answers not found
    Given I use If-Match 'W/"3"'
    When I send a PATCH admin request to "/api/v1/plants/12384ea3-e55d-4f69-8b0c-b54cccb9f443" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Listed"
          }
        }
      }
      """
    Then the response status code should be 404
    And response matches OpenAPI contract

  Scenario Outline: Update with a malformed If-Match is rejected (<header>)
    Given a family exists
    And a plant exists
    And I use If-Match '<header>'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Listed"
          }
        }
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

  Scenario: The role check runs before the If-Match check
    Given a family exists
    And a plant exists
    When I send a PATCH user request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Forbidden"
          }
        }
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Whitespace-only scientificName is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "scientificName": "   "
        }
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Whitespace-only name.primary is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": ""
          }
        }
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Aliases must be strings
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "aliases": [1]
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "identity.name.aliases.0"
    And response matches OpenAPI contract

  Scenario: spacingCm must be an object
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "traits": {
          "spacingCm": null
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "traits.spacingCm"
    And response matches OpenAPI contract

  Scenario: knowledge.rootSystem null is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "rootSystem": null
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.rootSystem"
    And response matches OpenAPI contract

  Scenario: knowledge.rootSystem range null is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "rootSystem": {
            "depthCm": null
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.rootSystem.depthCm"
    And response matches OpenAPI contract

  Scenario: knowledge.rootSystem.type must be a string
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "rootSystem": {
            "type": 5
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.rootSystem.type"
    And response matches OpenAPI contract

  Scenario: Trimmed name and aliases – empty alias dropped
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "  Tomate  ",
            "aliases": [" tomatera ", "  "]
          }
        }
      }
      """
    Then the response status code should be 200
    And the response body matches "Tomate" for field "identity.name.primary"
    And the response body should contain
      """
      {
        "identity": {
          "name": {
            "primary": "Tomate",
            "aliases": ["tomatera"]
          }
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: scientificName null is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "scientificName": null
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "identity.scientificName"
    And response matches OpenAPI contract

  Scenario: knowledge.watering.amountMm is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "watering": {
            "frequency": "weekly",
            "amountMm": 25
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.watering.amountMm"
    And response matches OpenAPI contract

  Scenario: A propagation method name that is not camelCase is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "propagation": {
            "methods": {
              "seed.season": {
                "seasons": ["spring"]
              }
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.propagation.methods.seed.season"
    And response matches OpenAPI contract

  Scenario: Empty propagation and ecology leave the plant unchanged
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "knowledge": {
          "propagation": {},
          "ecology": {}
        }
      }
      """
    Then the response status code should be 200
    And the response body matches "0" for field "version"
    And the response should have ETag '"0"'
    And response matches OpenAPI contract

  Scenario: A multi-section update answers from memory with one consistent audit entry
    Given a family exists
    And a plant exists
    And the plant was last updated by another user
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Audited plant"
          }
        },
        "traits": {
          "lifecycle": "perennial"
        },
        "phenology": {
          "sowing": {
            "months": [4, 5]
          }
        },
        "knowledge": {
          "notes": ["audited note"]
        }
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"1"'
    And the response audit data should show the admin as last editor
    And a GET admin request to "/api/v1/plants/<plantId>" should return the same body
    And response matches OpenAPI contract

  Scenario: An update with the values the plant already has changes nothing
    Given a family exists
    And a plant exists
    And the plant was last updated by another user
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "identity": {
          "name": {
            "primary": "Test plant"
          }
        },
        "traits": {
          "lifecycle": "annual"
        }
      }
      """
    Then the response status code should be 200
    And the response should have ETag '"0"'
    And the response body matches "0" for field "version"
    And the plant should be unchanged
    And response matches OpenAPI contract
