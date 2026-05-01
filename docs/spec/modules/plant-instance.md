# MODULE: PLANT INSTANCE

version: 1.0.0
source-spec: v1.0.0
status: evolving

---

# 1. PURPOSE

Represents a real instance of a Plant placed inside a Bed.

A PlantInstance is the operational entity that evolves over time within the system.

It is the bridge between:

* Plant (definition / biology template)
* Bed (spatial container)
* Events (lifecycle history)

---

# 2. CORE CONCEPT

* Plant = species definition
* PlantInstance = living occurrence of that species in a specific Bed and position

A PlantInstance is:

* spatial
* temporal
* stateful

---

# 3. RESPONSIBILITIES

A PlantInstance is responsible for:

* representing a planted Plant in a Bed
* maintaining spatial position
* tracking lifecycle state
* linking to events history
* storing instance-specific overrides

---

# 4. DOMAIN ROLE

PlantInstance is:

* a domain entity
* stateful over time
* spatially constrained

PlantInstance is NOT:

* a Plant definition
* a Bed manager
* an event processor

---

# 5. STATE MODEL

## 5.1 Core state

A PlantInstance includes:

* id
* plantId (reference to Plant)
* bedId (reference to Bed)
* position (x, y)
* status (alive, dormant, removed)
* plantedAt
* metadata

---

## 5.2 Lifecycle state

Typical states:

* planted
* growing
* mature
* harvested
* removed

(These may later be enriched by Events system)

---

# 6. SPATIAL BEHAVIOR

PlantInstance participates in spatial rules:

* must not collide with other PlantInstances
* must respect spacing constraints defined by Plant
* must fit within Bed boundaries

Spatial validation is delegated to SpatialService.

---

# 7. RELATIONSHIPS

## 7.1 PlantInstance → Plant

* defines biological rules
* spacing constraints
* growth expectations

## 7.2 PlantInstance → Bed

* defines spatial container
* defines coordinate system
* defines collision domain

## 7.3 PlantInstance → Events (future)

* events modify or annotate state over time
* PlantInstance does not own event logic

---

# 8. RULES

* MUST have valid Plant reference
* MUST belong to a Bed
* MUST have valid spatial position
* MUST be validated through SpatialService before placement
* MUST NOT contain plant definition logic
* MUST NOT contain persistence logic

---

# 9. CURRENT IMPLEMENTATION STATUS

## Implemented

* PlantInstance entity structure
* basic spatial representation
* integration with SpatialService validation
* linkage to Plant and Bed identifiers

---

## Partial

* lifecycle state machine not formalized
* event integration missing
* persistence contract incomplete
* validation rules still evolving

---

## Pending

* full lifecycle model (event-driven evolution)
* PlantInstanceRepository
* event history integration
* growth simulation rules
* temporal state transitions

---

# 10. FUTURE EVOLUTION

## 10.1 Event-driven PlantInstance

PlantInstance will evolve based on Events:

* watering affects growth
* fertilization affects health
* pruning affects structure
* pest control affects survival

---

## 10.2 Simulation layer

Future capability:

* growth over time simulation
* health decay or improvement
* predictive yield estimation

---

## 10.3 Spatial + temporal fusion

PlantInstance becomes:

* spatial entity (position)
* temporal entity (state over time)
* event-driven entity (history-based evolution)

---

# 11. BOUNDARY RULES

PlantInstance MUST:

* remain domain-only
* not depend on API
* not depend on persistence
* not contain spatial logic implementation
* delegate spatial validation externally

---

# 12. RELATION TO OTHER MODULES

Depends on:

* Plant module
* Bed module
* Spatial module

Will depend on (future):

* Events module
* Growth simulation module

---

# 13. FINAL NOTE

PlantInstance is the core runtime entity of AgroApp.

If Plant is the “species”, PlantInstance is the “life”.
