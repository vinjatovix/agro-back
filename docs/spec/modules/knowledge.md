# MODULE: KNOWLEDGE SYSTEM

version: 1.0.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

The Knowledge System represents the ecological and agronomic intelligence layer of AgroApp.

It is responsible for modeling agricultural relationships, external biological agents, and environmental interactions that influence plants.

It is intentionally **decoupled from core domain entities** (Plant, Bed, PlantInstance).

---

# 2. CORE PRINCIPLE

Knowledge is a **shared ecological dataset**, not ownership data.

Rules:

* NOT part of Plant aggregate
* NOT part of Bed aggregate
* referenced via IDs only
* globally consistent across the system
* extensible without affecting domain invariants

---

# 3. KNOWLEDGE ENTITIES

## 3.1 Pest

Represents organisms that negatively affect plants.

### Fields

* id
* name
* affects: Plant IDs
* symptoms: string[]

### Rules

* can affect multiple plants
* symptoms are descriptive only
* no behavioral logic

---

## 3.2 Disease

Represents plant pathology conditions.

### Fields

* id
* name
* affectedPlants
* symptoms
* severity (optional)

---

## 3.3 Remedy

Represents treatments for pests and diseases.

### Fields

* id
* name
* type: organic | chemical | biological
* application:

  * method
  * frequency
  * dosage
* effectiveAgainst: Pest | Disease IDs

---

## 3.4 Fertilizer

Represents nutrient inputs for plant growth.

### Fields

* id
* name
* npk:

  * n
  * p
  * k
* application:

  * frequency
  * amount

---

## 3.5 Plant Attributes

Represents ecological or functional properties of plants.

### Categories

* benefits
* strategies

### Examples

* attract_pollinators
* trap_crop
* nematode_control

---

## 3.6 Plant Relations Graph

Defines ecological interactions between plants.

This is a **global directed weighted graph**.

### Fields

* plantA
* plantB
* type:

  * beneficial
  * harmful
  * neutral
* strength: 1–5
* distance constraints:

  * minDistance
  * maxDistance
* reason (human-readable explanation)

### Rules

* graph is global (not per plant)
* relationships are directional
* distance constraints affect spatial system indirectly
* used for recommendations and planning, NOT enforcement

---

# 4. SYSTEM BOUNDARIES

## 4.1 What Knowledge System DOES

* models ecological relationships
* provides agronomic intelligence
* supports decision-making systems
* feeds simulation layers

---

## 4.2 What Knowledge System DOES NOT DO

* does not enforce planting rules
* does not validate Plant aggregates
* does not manage persistence
* does not handle spatial placement
* does not execute events

---

# 5. INTEGRATION MODEL

## 5.1 Plant ↔ Knowledge

Plants reference knowledge via IDs:

```ts
plant.knowledgeRefs = {
  pests: string[],
  diseases: string[],
  remedies: string[],
  attributes: string[]
}
```

No embedded knowledge objects allowed.

---

## 5.2 Events ↔ Knowledge

Events may reference:

* pests
* diseases
* remedies
* fertilizers

But NEVER embed logic from them.

---

## 5.3 Spatial System ↔ Knowledge

Indirect influence only:

* plant relations may affect recommended spacing
* no direct enforcement rules

---

# 6. PLANT RELATIONSHIP GRAPH SEMANTICS

The graph is:

* global
* weighted
* directional
* non-deterministic in enforcement (recommendation-only)

Used for:

* companion planting suggestions
* pest prevention strategies
* ecological optimization

Not used for:

* collision detection
* placement validation

---

# 7. EXTENSIBILITY RULES

New knowledge types MUST:

* be independent modules
* NOT modify Plant aggregate
* NOT introduce circular dependencies

Allowed extensions:

* pollinators
* soil microbiome models
* climate interaction datasets

---

# 8. CURRENT STATUS

## Implemented

* pest model (partial)
* fertilizer model (partial)
* plant attributes (basic)
* relation graph concept defined

## Pending

* full normalization of IDs across knowledge entities
* consistent schema enforcement
* separation from domain types currently leaking
* validation layer for knowledge integrity
* recommendation engine (future layer)

---

# 9. ANTI-PATTERNS

The following are forbidden:

* embedding knowledge inside Plant aggregate
* using knowledge for domain validation
* coupling knowledge with persistence schema
* enforcing spatial rules through knowledge graph
* duplicating knowledge inside events or beds

---

# 10. FUTURE EVOLUTION

Planned extensions:

* recommendation engine
* ecological simulation system
* seasonal behavior modeling
* pest outbreak prediction
* AI-assisted planting planner

---

# 11. FINAL NOTE

The Knowledge System is the **intelligence layer of AgroApp**.

It must remain:

* independent
* extensible
* non-invasive to core domain logic

Any coupling introduced here will propagate architectural instability across the system.

