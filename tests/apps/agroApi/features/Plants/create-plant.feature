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
        Then the response body should be
            """
            {
                "message": "Validation error",
                "errors": {
                    "identity.familyId": "Invalid value at body. Value: undefined",
                    "identity.name.primary": "Invalid value at body. Value: undefined",
                    "phenology.flowering.months": "Invalid value at body. Value: undefined",
                    "phenology.harvest.months": "Invalid value at body. Value: undefined",
                    "phenology.sowing.germinationDays.max": "Invalid value at body. Value: undefined",
                    "phenology.sowing.germinationDays.min": "Invalid value at body. Value: undefined",
                    "phenology.sowing.methods.direct.depthCm.max": "Invalid value at body. Value: undefined",
                    "phenology.sowing.methods.direct.depthCm.min": "Invalid value at body. Value: undefined",
                    "phenology.sowing.months": "Invalid value at body. Value: undefined",
                    "phenology.sowing.seedsPerHole.max": "Invalid value at body. Value: undefined",
                    "phenology.sowing.seedsPerHole.min": "Invalid value at body. Value: undefined",
                    "traits.lifecycle": "Invalid value at body. Value: undefined",
                    "traits.size.height": "Invalid value at body. Value: undefined",
                    "traits.size.spread": "Invalid value at body. Value: undefined",
                    "traits.spacingCm": "Invalid value at body. Value: undefined"
                }
            }
            """

    Scenario: Fail to create a plant with an invalid Uuid
        Given a POST admin request to "/api/v1/plants" with body
            """
            {
                "id": "invalid-uuid",
                "identity": {
                    "name": {
                        "primary": "Tomato"
                    },
                    "familyId": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
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
                }
            }
            """
        Then the response status code should be 400
        Then the response body should be
            """
            {
                "message": "Validation error",
                "errors": {
                    "id": "Invalid value at body. Value: invalid-uuid"
                }
            }
            """

    Scenario: Create a minimal new plant with valid data
        Given a POST admin request to "/api/v1/plants" with body
            """
            {
                "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
                "identity": {
                    "name": {
                        "primary": "Tomato"
                    },
                    "familyId": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
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
                }
            }
            """
        Then the response status code should be 201

    Scenario: Create a new plant with all fields filled
        Given a POST admin request to "/api/v1/plants" with body
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
                    "familyId": "fam_asteraceae",
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
                            "type": "insect",
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
                        "amountMm": 25,
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
                            "season": "spring",
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
                                "season": "spring",
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
                                "season": "spring",
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

    Scenario: Fail to create a plant without authentication
        Given a POST request to "/api/v1/plants" with body
            """
            {
                "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
            }
            """
        Then the response status code should be 401

    Scenario: Fail to create a plant with invalid roles
        Given a POST user request to "/api/v1/plants" with body
            """
            {
                "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
            }
            """
        Then the response status code should be 403


    Scenario: Fail to create a plant that already exists
        Given a POST admin request to "/api/v1/plants" with body
            """
            {
                "id": "f4529c3f-c474-4386-ac48-ce769f1c86ea",
                "identity": {
                    "name": {
                        "primary": "Tomato"
                    },
                    "familyId": "f4529c3f-c474-4386-ac48-ce769f1c86ea"
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
                }
            }
            """
        Then the response status code should be 409

    Scenario: Fail to create a plant with invalid range values
        Given a POST admin request to "/api/v1/plants" with body
            """
            {
                "id": "3debeba3-9ba7-46d8-815e-0d9162d1d346",
                "identity": {
                    "name": {
                        "primary": "Test"
                    },
                    "familyId": "fam"
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


    Scenario: Fail to create a plant with invalid months
        Given a POST admin request to "/api/v1/plants" with body
            """
            {
                "id": "948ee455-1f52-4cb6-ab87-f990c5645096",
                "identity": {
                    "name": {
                        "primary": "Test"
                    },
                    "familyId": "fam"
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