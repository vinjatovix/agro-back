@plants @create-plant
Feature: Create a new plant
  In order to make a new plant available in the system
  As an administrator
  I want to be able to create a new plant

  Scenario: Fail to create a plant with missing required fields
    Given a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
      }
      """
    Then the response status code should be 400
    And the response errors should include "identity"
    And the response errors should include "traits"
    And the response errors should include "phenology"
    And the response errors should include "knowledge"
    And response matches OpenAPI contract

  Scenario: Fail to create a plant with missing required identity and knowledge fields
    Given a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "family": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 10,
              "max": 20
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "identity.scientificName"
    And the response errors should include "knowledge.rootSystem"
    And response matches OpenAPI contract

  Scenario: Fail to create a plant with an invalid Uuid
    Given a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "invalid-uuid",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "scientificName": "Solanum lycopersicum",
          "family": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 10,
              "max": 20
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "id"
    And the response body should not echo "invalid-uuid"
    And response matches OpenAPI contract

  Scenario: Fail to create a plant with unknown request body properties
    Given a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
        "unknownProperty": "notAllowed",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "scientificName": "Solanum lycopersicum",
          "family": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 10,
              "max": 20
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "unknownProperty"
    And response matches OpenAPI contract

  Scenario: Create a minimal new plant with valid data
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "scientificName": "Solanum lycopersicum",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 20,
              "max": 40
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 201
    And the response should have ETag '"0"'
    And response matches OpenAPI contract

  Scenario: Create a plant that never flowers nor is harvested
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "0b6f2a43-41e2-4d27-9a4e-6c1f5a8f3d10",
        "identity": {
          "name": { "primary": "Horsetail" },
          "scientificName": "Equisetum arvense",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "perennial",
          "size": {
            "height": { "min": 10, "max": 50 },
            "spread": { "min": 10, "max": 30 }
          },
          "spacingCm": { "min": 20, "max": 40 }
        },
        "phenology": {
          "sowing": {
            "months": [3, 4],
            "seedsPerHole": { "min": 1, "max": 2 },
            "germinationDays": { "min": 10, "max": 20 },
            "methods": { "direct": { "depthCm": { "min": 1, "max": 2 } } }
          }
        },
        "knowledge": {
          "rootSystem": { "type": "rhizome", "depthCm": { "min": 10, "max": 60 }, "spreadCm": { "min": 10, "max": 80 } },
          "soil": {
            "ph": { "min": 5, "max": 7 },
            "availableDepthCm": { "min": 20, "max": 40 }
          },
          "light": { "hoursMin": 4, "type": "partial_shade" },
          "propagation": { "methods": { "division": { "seasons": ["spring"] } } }
        }
      }
      """
    Then the response status code should be 201
    And the response body should contain
      """
      {
        "phenology": {
          "flowering": { "months": [] },
          "harvest": { "months": [] }
        }
      }
      """
    And response matches OpenAPI contract

  Scenario: Create a new plant with all fields filled
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "646234a8-5c4c-405f-a93b-b7f70d42fec3",
        "identity": {
          "name": {
            "primary": "Caléndula",
            "aliases": [
              "Maravilla"
            ]
          },
          "family": "<familyId>",
          "scientificName": "Calendula officinalis"
        },
        "traits": {
          "lifecycle": "perennial",
          "size": {
            "height": {
              "min": 30,
              "max": 60
            },
            "spread": {
              "min": 20,
              "max": 40
            }
          },
          "spacingCm": {
            "min": 20,
            "max": 30
          }
        },
        "phenology": {
          "sowing": {
            "seedsPerHole": {
              "min": 2,
              "max": 3
            },
            "germinationDays": {
              "min": 7,
              "max": 14
            },
            "months": [
              3,
              4,
              5,
              6
            ],
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              },
              "starter": {
                "depthCm": {
                  "min": 0.5,
                  "max": 1
                }
              }
            }
          },
          "flowering": {
            "months": [
              4,
              5,
              6,
              7,
              8,
              9,
              10
            ],
            "pollination": {
              "types": [
                "self",
                "insect"
              ],
              "agents": [
                "bees",
                "butterflies"
              ]
            }
          },
          "harvest": {
            "months": [
              5,
              6,
              7,
              8,
              9,
              10
            ],
            "description": "Harvest flowers when fully open and dry on plant."
          }
        },
        "knowledge": {
          "soil": {
            "ph": {
              "min": 6,
              "max": 7.5
            },
            "availableDepthCm": {
              "min": 15,
              "max": 30
            }
          },
          "rootSystem": {
            "type": "taproot",
            "depthCm": {
              "min": 20,
              "max": 50
            },
            "spreadCm": {
              "min": 10,
              "max": 25
            }
          },
          "watering": {
            "frequency": "weekly",
            "conditions": [
              "no_rain"
            ]
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun",
            "preference": "morning"
          },
          "pruning": [
            {
              "type": "maintenance",
              "intensity": "light",
              "seasons": ["spring"],
              "frequencyPerYear": 2,
              "bestPractices": [
                "Remove wilted flowers",
                "Encourage continuous blooming"
              ]
            }
          ],
          "propagation": {
            "methods": {
              "seeds": {
                "seasons": ["spring"],
                "estimatedTimeWeeks": {
                  "min": 1,
                  "max": 2
                },
                "bestPractices": [
                  "Sow directly in place",
                  "Keep soil moist during germination"
                ]
              },
              "cuttings": {
                "seasons": ["spring"],
                "estimatedTimeWeeks": {
                  "min": 3,
                  "max": 5
                },
                "bestPractices": [
                  "Use semi-hardwood cuttings",
                  "Maintain humidity"
                ]
              }
            }
          },
          "ecology": {
            "strategicBenefits": [
              "attr_pollinator",
              "trap_crop",
              "nematode_control"
            ]
          },
          "resources": [
            {
              "type": "image",
              "url": "https://example.com/calendula.jpg",
              "title": "Caléndula en flor",
              "source": "system",
              "tags": [
                "flower",
                "reference"
              ]
            },
            {
              "type": "article",
              "url": "https://example.com/calendula-care",
              "title": "Guía de cultivo de caléndula",
              "source": "system",
              "tags": [
                "care",
                "guide"
              ]
            },
            {
              "type": "video",
              "url": "https://example.com/calendula-video",
              "title": "Cultivo paso a paso",
              "source": "system",
              "tags": [
                "tutorial"
              ]
            }
          ],
          "notes": [
            "Self-sows easily",
            "May require thinning after germination"
          ]
        }
      }
      """
    Then the response status code should be 201
    And the response should have ETag '"0"'
    And response matches OpenAPI contract

  Scenario: Fail to create a plant if family doesn't exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "0b2bc0e2-9e2e-4765-a7f5-c524ae9db804",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "scientificName": "Solanum lycopersicum",
          "family": "ff8e78aa-8410-40bb-ad9f-c48110ffe59a"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 20,
              "max": 40
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    Then the response body should be
      """
      {
        "message": "Family with id ff8e78aa-8410-40bb-ad9f-c48110ffe59a does not exist"
      }
      """
    And response matches OpenAPI contract


  Scenario: Fail to create a plant without authentication
    Given a POST request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
      }
      """
    Then the response status code should be 401
    And response matches OpenAPI contract

  Scenario: Fail to create a plant with invalid roles
    Given a POST user request to "/api/v1/plants" with body
      """
      {
        "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
      }
      """
    Then the response status code should be 403
    And response matches OpenAPI contract

  Scenario: Fail to create a plant that already exists
    Given a family exists
    And a plant exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "<plantId>",
        "identity": {
          "name": {
            "primary": "Tomato"
          },
          "scientificName": "Solanum lycopersicum",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 30,
              "max": 300
            },
            "spread": {
              "min": 30,
              "max": 300
            }
          },
          "spacingCm": {
            "min": 30,
            "max": 300
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1,
              2,
              3
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 3
            },
            "germinationDays": {
              "min": 5,
              "max": 10
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 2
                }
              }
            }
          },
          "flowering": {
            "months": [
              1,
              2,
              3
            ]
          },
          "harvest": {
            "months": [
              1,
              2,
              3
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 20,
              "max": 40
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 409
    And response matches OpenAPI contract

  Scenario: Fail to create a plant whose scientific name is already used ignoring case
    Given a family exists
    And the following plants exist:
      | name   | scientificName       |
      | Tomato | Solanum lycopersicum |
    When a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "2d9c4b1e-7a3f-4e65-8b0d-5c1f9e2a7b34",
        "identity": {
          "name": { "primary": "Cherry tomato" },
          "scientificName": "solanum lycopersicum",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "perennial",
          "size": {
            "height": { "min": 10, "max": 50 },
            "spread": { "min": 10, "max": 30 }
          },
          "spacingCm": { "min": 20, "max": 40 }
        },
        "phenology": {
          "sowing": {
            "months": [3, 4],
            "seedsPerHole": { "min": 1, "max": 2 },
            "germinationDays": { "min": 10, "max": 20 },
            "methods": { "direct": { "depthCm": { "min": 1, "max": 2 } } }
          }
        },
        "knowledge": {
          "rootSystem": { "type": "rhizome", "depthCm": { "min": 10, "max": 60 }, "spreadCm": { "min": 10, "max": 80 } },
          "soil": {
            "ph": { "min": 5, "max": 7 },
            "availableDepthCm": { "min": 20, "max": 40 }
          },
          "light": { "hoursMin": 4, "type": "partial_shade" },
          "propagation": { "methods": { "division": { "seasons": ["spring"] } } }
        }
      }
      """
    Then the response status code should be 409
    And response matches OpenAPI contract
    And a GET admin request to "/api/v1/plants/2d9c4b1e-7a3f-4e65-8b0d-5c1f9e2a7b34" should return status 404

  Scenario: A soft-deleted plant keeps its scientific name reserved
    Given a family exists
    And a soft-deleted plant exists with scientific name "Lactuca sativa"
    When a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "6e1a3c5b-9d2f-4a87-b6c4-0f8e2d1a3b59",
        "identity": {
          "name": { "primary": "Reused name" },
          "scientificName": "Lactuca sativa",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "perennial",
          "size": {
            "height": { "min": 10, "max": 50 },
            "spread": { "min": 10, "max": 30 }
          },
          "spacingCm": { "min": 20, "max": 40 }
        },
        "phenology": {
          "sowing": {
            "months": [3, 4],
            "seedsPerHole": { "min": 1, "max": 2 },
            "germinationDays": { "min": 10, "max": 20 },
            "methods": { "direct": { "depthCm": { "min": 1, "max": 2 } } }
          }
        },
        "knowledge": {
          "rootSystem": { "type": "rhizome", "depthCm": { "min": 10, "max": 60 }, "spreadCm": { "min": 10, "max": 80 } },
          "soil": {
            "ph": { "min": 5, "max": 7 },
            "availableDepthCm": { "min": 20, "max": 40 }
          },
          "light": { "hoursMin": 4, "type": "partial_shade" },
          "propagation": { "methods": { "division": { "seasons": ["spring"] } } }
        }
      }
      """
    Then the response status code should be 409
    And response matches OpenAPI contract

  # The bounds order is a domain rule (`Range`), not a request-shape one.
  Scenario: Fail to create a plant with invalid range values
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "3debeba3-9ba7-46d8-815e-0d9162d1d346",
        "identity": {
          "name": {
            "primary": "Test"
          },
          "scientificName": "Test scientific",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 50,
              "max": 10
            },
            "spread": {
              "min": 10,
              "max": 20
            }
          },
          "spacingCm": {
            "min": 10,
            "max": 20
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 1
            },
            "germinationDays": {
              "min": 1,
              "max": 2
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 1
                }
              }
            }
          },
          "flowering": {
            "months": [
              1
            ]
          },
          "harvest": {
            "months": [
              1
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 10,
              "max": 20
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And response matches OpenAPI contract

  Scenario: Fail to create a plant with invalid months
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "948ee455-1f52-4cb6-ab87-f990c5645096",
        "identity": {
          "name": {
            "primary": "Test"
          },
          "scientificName": "Test scientific",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 10,
              "max": 20
            },
            "spread": {
              "min": 10,
              "max": 20
            }
          },
          "spacingCm": {
            "min": 10,
            "max": 20
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              0,
              13
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 1
            },
            "germinationDays": {
              "min": 1,
              "max": 2
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 1
                }
              }
            }
          },
          "flowering": {
            "months": [
              1
            ]
          },
          "harvest": {
            "months": [
              1
            ]
          }
        },
        "knowledge": {
          "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } },
          "soil": {
            "ph": {
              "min": 6,
              "max": 7
            },
            "availableDepthCm": {
              "min": 10,
              "max": 20
            }
          },
          "light": {
            "hoursMin": 6,
            "type": "full_sun"
          },
          "propagation": {
            "methods": {
              "seeds": {}
            }
          }
        }
      }
      """
    Then the response status code should be 400
    And the response errors should include "phenology.sowing.months.0"
    And response matches OpenAPI contract

  Scenario Outline: Fail to create a plant with an unsafe knowledge shape
    Given a family exists
    And a POST admin request to "/api/v1/plants" with body
      """
      {
        "id": "5b0f3c1e-8d2a-4f6b-9c7e-1a2b3c4d5e6f",
        "identity": {
          "name": {
            "primary": "Test"
          },
          "scientificName": "Test scientific",
          "family": "<familyId>"
        },
        "traits": {
          "lifecycle": "annual",
          "size": {
            "height": {
              "min": 10,
              "max": 20
            },
            "spread": {
              "min": 10,
              "max": 20
            }
          },
          "spacingCm": {
            "min": 10,
            "max": 20
          }
        },
        "phenology": {
          "sowing": {
            "months": [
              1
            ],
            "seedsPerHole": {
              "min": 1,
              "max": 1
            },
            "germinationDays": {
              "min": 1,
              "max": 2
            },
            "methods": {
              "direct": {
                "depthCm": {
                  "min": 1,
                  "max": 1
                }
              }
            }
          },
          "flowering": {
            "months": [
              1
            ]
          },
          "harvest": {
            "months": [
              1
            ]
          }
        },
        "knowledge": <knowledge>
      }
      """
    Then the response status code should be 400
    And the response errors should include "<errorPath>"
    And response matches OpenAPI contract

    Examples:
      | knowledge                                                                                                                                                                                                            | errorPath                                 |
      | { "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } }, "soil": { "ph": { "min": 6, "max": 7 }, "availableDepthCm": { "min": 10, "max": 20 } }, "light": { "hoursMin": 6, "type": "full_sun" }, "propagation": { "methods": { "seed": {} } }, "watering": { "frequency": "weekly", "amountMm": 25 } } | knowledge.watering.amountMm               |
      | { "rootSystem": { "type": "fibrous", "depthCm": { "min": 10, "max": 30 }, "spreadCm": { "min": 10, "max": 20 } }, "soil": { "ph": { "min": 6, "max": 7 }, "availableDepthCm": { "min": 10, "max": 20 } }, "light": { "hoursMin": 6, "type": "full_sun" }, "propagation": { "methods": { "seed.season": { "seasons": ["spring"] } } } }                                 | knowledge.propagation.methods.seed.season |
