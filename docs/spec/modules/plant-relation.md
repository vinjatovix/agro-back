# MODULE: PLANT RELATIONS

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE

This module defines the companion planting relationship system of AgroApp.

It models botanical interactions between different plant species to support ecological garden planning, companion suggestion, and warning systems.

---

## 2. CORE RESPONSIBILITY

The Plant Relations module is responsible for:

- Defining ecological relationships between plant definitions.
- Modeling directional companionship rules (helps, helped by, avoids).
- Enforcing access boundaries for managing relationship definitions.
- Serving as the mathematical edge catalog for the Spatial System's companion proximity calculations.

---

## 3. DOMAIN ROLE

PlantRelation is:

- A Domain Aggregate Root (`PlantRelation` acts as its own aggregate root, persisted in the `plant_relations` collection).
- An edge in a directed botanical graph.
- Globally consistent across the system.

PlantRelation is NOT:

- A spatial instance property (it does not know about Beds or coordinates).
- An active lifecycle manager (it represents static botanical intelligence).

---

## 4. DATA MODEL

### 4.1 PlantRelation (Aggregate Root)

Each record represents a directional biological interaction from a source plant species to a target plant species.

- `id`: UUID (value object)
- `sourcePlantId`: UUID (foreign key pointing to source `plants` catalog)
- `targetPlantId`: UUID (foreign key pointing to target `plants` catalog)
- `type`: enum (`beneficial` | `harmful` | `neutral`)
- `strength`: integer (1 to 5, representing interaction intensity)
- `constraints`: (optional object representing proximity rules)
  - `minDistanceCm`: PositiveNumber
  - `maxDistanceCm`: PositiveNumber
- `reason`: string (human-readable explanation of the ecological interaction, e.g., "Alliums repel carrot flies; carrots confuse onion flies")
- `metadata`: Audit metadata

---

## 5. DIRECTIONAL MODEL (WIKIPEDIA LIST OF COMPANION PLANTS ALIGNMENT)

To support the varying nature of botanical synergies, plant interactions are modeled as **directional relationships**:

1. **Directional (One-Way):**
   - A plant can provide a localized ecosystem service without receiving direct benefits.
   - _Example:_ Borage helps Strawberries by repelling pests (`Borage` -> `Strawberries` beneficial relation exists), but Strawberries do not provide any direct active benefit to Borage (no inverse relation is required).
2. **Bidirectional (Mutual):**
   - Mutualistic pairings where both plants actively benefit each other are modeled as **two separate directed relationships**.
   - _Example:_ Tomatoes and Basil. Tomatoes provide shade, and Basil repels thrips. This is represented by two independent directed edges: `Basil` -> `Tomatoes` (beneficial) and `Tomatoes` -> `Basil` (beneficial).
3. **Avoid / Harmful (Functionally Bidirectional):**
   - While the underlying biological mechanism of incompatibility may be directional (e.g., Walnut tree roots excrete juglone which is toxic to Tomatoes), the practical agricultural application is bidirectional.
   - For safety and simplicity, if a harmful relation is defined from `A` -> `B`, the Spatial System treats proximity warnings as bidirectional during Bed layout analysis.

---

## 6. RELATIONSHIPS

- `PlantRelation` depends on `Plant` (source & target IDs must be valid active plant catalog species).
- The `SpatialSystem` depends on `PlantRelation` to calculate the dynamic `ecologicalReport` of a Bed.

---

## 7. ACCESS CONTROL & ROLE SECURITY `[TARGET STATE (Pending Iterations 26 & 33)]`

- **Read Operations:** Publicly available without authentication (public catalog access).
- **Write/Mutation Operations:** Restricted strictly to **Administrator** and **Collaborator** roles. Standard Users cannot modify the global companion graph.

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

---

## 8. BOUNDARY RULES

- **No Embedded Relationships:** Plants do not embed relationship arrays. The graph is stored entirely externally in its own collection (`plant_relations`) to prevent document size bloat and write lock contention.
- **Reference Integrity:** Deleting a `Plant` definition from the catalog MUST trigger validation to prevent orphaning active `PlantRelation` edges.
- **Eventual Consistency Side-Effects `[TARGET STATE]`:** The creation, updating (`PATCH`), or deletion of a `PlantRelation` record MUST dispatch a domain event (e.g., `PlantRelationUpdated`) to the Event Bus. This triggers asynchronous workers to seamlessly recalculate and update the stale spatial `ecologicalReport` snapshots stored in active Beds worldwide, without blocking the administrator's API response.

---

## 9. CURRENT IMPLEMENTATION STATUS

### Implemented

- Core conceptual model defined.

### Pending `[TARGET STATE (Pending Iteration 32)]`

- Domain Aggregate Root (`PlantRelation.ts`) and value objects.
- MongoDB document schema (`PlantRelationDocument`) and repository mapping.
- CRUD API controllers (for exposed HTTP endpoints, routing, and REST semantics, refer strictly to **Module: OpenAPI Contract (openapi.md)**).
- Integration with the Spatial System proximity calculators.

---

## 10. FINAL NOTE

The Plant Relations module turns the isolated botanical catalog into a connected ecological network, mirroring real-world biodiversity synergies and permaculture guidelines.
