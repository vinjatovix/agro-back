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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "invalid-uuid",
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
        "id": "<plantId>",
        "unknownField": "boom"
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Fail to update a non-existing plant
    Given I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3" with body
      """
      {
        "id": "0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3",
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
        "id": "<plantId>",
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

  Scenario: Fail to update with invalid range values
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
    Then the response body should be
      """
      {
        "message": "Range min cannot be greater than max"
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail to update with invalid months
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
    Then the response body should be
      """
      {
        "message": "Invalid month: 0"
      }
      """
    And response matches OpenAPI contract

  Scenario: Fail to update a plant without authentication
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH request to "/api/v1/plants/<plantId>" with body
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
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Fail to update a plant with invalid role
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH user request to "/api/v1/plants/<plantId>" with body
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
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Fail to update with empty body
    Given a family exists
    Given a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {}
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Fail to update with an unexistent family
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "0ccd23ae-4ac5-4dbe-84b1-fc0e8dac26e3",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Wildcard"
          }
        }
      }
      """
    Then the response status code should be 428
    And response matches OpenAPI contract

  Scenario: Update with a negative If-Match is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"-1"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Negative"
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "if-match"
    And response matches OpenAPI contract

  Scenario: The role check runs before the If-Match check
    Given a family exists
    And a plant exists
    When I send a PATCH user request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
        "identity": {
          "name": {
            "aliases": [1]
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "identity.name.aliases[0]"
    And response matches OpenAPI contract

  Scenario: spacingCm must be an object
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
        "knowledge": {
          "watering": {
            "frequency": "weekly",
            "amountMm": 25
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.watering"
    And response matches OpenAPI contract

  Scenario: A propagation method name that is not camelCase is rejected
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
        "knowledge": {
          "propagation": {
            "methods": {
              "seed.season": {
                "season": "spring"
              }
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "knowledge.propagation.methods"
    And response matches OpenAPI contract

  Scenario: Empty propagation and ecology leave the plant unchanged
    Given a family exists
    And a plant exists
    And I use If-Match '"0"'
    When I send a PATCH admin request to "/api/v1/plants/<plantId>" with body
      """
      {
        "id": "<plantId>",
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
        "id": "<plantId>",
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
        "id": "<plantId>",
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
