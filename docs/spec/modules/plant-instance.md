# MODULE: PLANT INSTANCE

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

# 1. PURPOSE

Represents a real instance of a Plant placed inside a Bed.

A PlantInstance is the operational entity that evolves over time within the system.

It is the bridge between:

- Plant (definition / biology template)
- Bed (spatial container)
- Events (lifecycle history)

---

# 2. CORE CONCEPT

- Plant = species definition
- PlantInstance = living occurrence of that species in a specific Bed and position

A PlantInstance is:

- spatial
- temporal
- stateful

---

# 3. RESPONSIBILITIES

A PlantInstance is responsible for:

- representing a planted Plant in a Bed
- maintaining spatial position
- tracking lifecycle state
- linking to events history
- storing instance-specific overrides

---

# 4. DOMAIN ROLE

PlantInstance is:

- a domain entity
- stateful over time
- spatially constrained

PlantInstance is NOT:

- a Plant definition
- a Bed manager
- an event processor

### 4.1 Persistence Architecture & Aggregate Integration

To ensure complete transparency during development, the aggregate's integration follows two distinct phases:

- **Current State:** `PlantInstance` functions as an entity embedded physically inside the `Bed` aggregate root and is stored directly inside the same MongoDB document within the `beds` collection.
- **Target State (Pending Iteration 38):** `PlantInstance` will be re-architected as a standalone aggregate root (`PlantInstance` with its own `id`) with its own dedicated MongoDB collection (`plant_instances`), separate repository interface, and decoupled use cases.

---

# 5. STATE MODEL

## 5.1 Core state

A PlantInstance includes:

- `id`: UUID (value object)
- `plantId`: UUID (reference to Plant)
- `bedId`: UUID (reference to Bed)
- `seedBatchId`: **`[TARGET STATE (Pending Iteration 52)]`** (optional UUID reference pointing to the user's private `SeedBatch`)
- `establishment`: **`[TARGET STATE (Pending Iteration 74)]`** `direct` | `nursery` (represents how it was established, aligned with the biological catalog's methods). _Migration Note: When this schema change is implemented in code (Iteration 74), a MongoDB migration MUST be created to rename existing `sowingMethod` fields to `establishment`, and to map existing `'starter'` values to `'nursery'`._
- `position`: Coordinates object `(x, y)`
- `growthStatus`: (germinating, seedling, vegetative, flowering, fruiting, harvesting, dormant, dead)
- `status`: `'active'` | `'removed'` _(Migration Note: Currently implemented in code as `instanceStatus` with enum `PlantInstanceLifecycleStatus`. Must be migrated to `status` in Iteration 40)._
- `warnings`: (array of pre-computed and persisted spatial/biological alerts). To secure high-performance reads on the Canvas map, these alerts are evaluated and stored during save/placement write mutations. When calculating seasonality checks (verifying if sowing, transplanting, flowering, or harvesting is occurring in appropriate calendar months), the system inherits the `hemisphere` from the owning User's profile. **`[TARGET STATE (Pending Iteration 31)]`** If the hemisphere is `south`, the sowing, flowering, and harvest calendars of the `Plant` aggregate (if present) are shifted by 6 months dynamically in-memory during validation using circular modular arithmetic. If a plant definition lacks a `sowing` block, the sowing seasonality warning is automatically bypassed.
- `plantedAt`: ISODate
- `deletedAt`: (optional ISODate / null) _(Migration Note: Currently implemented in code as `removedAt`. Must be migrated to `deletedAt` in Iteration 40)._
- `variety`: (optional string)
- `notes`: (optional string)
- `metadata`: Audit metadata

---

## 5.2 Establishment & Germination Lifecycle (Nurseries) `[TARGET STATE (Pending Iterations 54 & 74)]`

The life of a crop instance can begin through two distinct sowing paths:

1. **Direct Establishment (`direct`):**
   - The plant is sown directly in the final `Bed` at specific coordinates `(x, y)`.
   - Instantly undergoes full geometric/volumetric boundary validations.
   - Decrements seed batch quantity immediately.

2. **Nursery Establishment (`nursery`):**
   - The plant is started in a seedbed (nursery tray cell) under controlled conditions.
   - **Nursery State:** The `position` coordinates are `null` and `bedId` points to a virtual container or is `null`.
   - **Stock Deduction:** Decrements `remainingQuantity` in the linked `SeedBatch` upon sowing.
   - **Germination Recalculation:** When seeds sprout, the user records the result (e.g., "planted 10, germinated 8"). The system automatically recalculates and updates the `germinationRate` of that `SeedBatch` aggregate. Surviving seedlings are kept in nursery state under `growthStatus: 'seedling'`.

---

## 5.3 Transplant Workflow `[TARGET STATE (Pending Iteration 75)]`

Survival seedlings started in nurseries (`nursery` sowing) must eventually be moved to a real physical bed.

- **Action:** A secure transplant request is triggered, providing target `bedId` and coordinates `(x, y)`.
- **Validations:** The backend performs on-the-fly Bed boundary validations, geometric/volumetric spatial collision tests, and companion plant proximity checks.
- **State Transition:** On validation success:
  - Sets the instance's `bedId` and `position` coordinates `(x, y)`.
  - Updates `growthStatus` to `vegetative`.
  - Registers a `transplant` Event in the chronological cultivation log.
- **Thinning/Discarding:** Any seedling discarded during thinning does not penalize the seed batch germination rate, as it successfully sprouted during the nursery stage.

---

## 5.4 Soft Delete Rule & Temporal Space Liberation `[TARGET STATE (Pending Iterations 40 & 56)]`

Deleting a plant instance (removal operation) MUST execute a soft delete. The instance's `status` changes to `'removed'` and the deletion timestamp is recorded in `deletedAt`. Physical deletion (removing the document completely) is strictly prohibited to prevent event history orphaning.

Additionally, a plant instance MUST be completely excluded from all spatial and distance calculations (liberating its physical space in the bed) if either of these conditions is met for the evaluation time `T`:

1. It has been soft-deleted (`status = 'removed'` and `deletedAt <= T`).
2. It has reached a terminal biological state (`growthStatus = 'harvested'` or `growthStatus = 'dead'`).

This immediately liberates the spatial occupancy of the instance, allowing new plant instances to be placed in that same location without triggering collision, proximity, or overlap warnings on the current layout, while preserving correct rendering of historical layouts (when `T < deletedAt`).

**Undelete / Restore Workflow:** Restoring a soft-deleted plant instance is permitted, but the backend MUST execute a synchronous validation through the `SpatialService` prior to executing the state mutation. If the space has been occupied by a new plant instance during the time it was deleted (causing a hard geometric collision), the system MUST reject the restoration with a `409 Conflict`.

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

---

# 6. SPATIAL BEHAVIOR

PlantInstance participates in spatial rules:

- must not collide with other PlantInstances
- must respect spacing constraints defined by Plant
- must fit within Bed boundaries

Spatial validation is delegated to SpatialService.

---

# 7. RELATIONSHIPS

## 7.1 PlantInstance → Plant

- defines biological rules
- spacing constraints
- growth expectations

## 7.2 PlantInstance → Bed

- defines spatial container
- defines coordinate system
- defines collision domain

## 7.3 PlantInstance → Events (future)

- events modify or annotate state over time
- PlantInstance does not own event logic

---

# 8. RULES

- MUST have valid Plant reference
- MUST belong to a Bed
- MUST have valid spatial position
- MUST be validated through SpatialService before placement
- MUST NOT contain plant definition logic
- MUST NOT contain persistence logic

---

# 9. CURRENT IMPLEMENTATION STATUS

## Implemented

- PlantInstance entity structure
- basic spatial representation
- integration with SpatialService validation
- linkage to Plant and Bed identifiers

---

## Partial

- lifecycle state machine not formalized
- event integration missing
- persistence contract incomplete
- validation rules still evolving
- the existing `addPlantToBed.ts` use case and tests are written for the embedded model and must be completely re-architected.

---

## Pending

- full lifecycle model (event-driven evolution)
- event history integration
- growth simulation rules
- temporal state transitions
- integration of MongoPlantInstanceRepository and its integration as a standalone aggregate repository.
- complete rewrite of the `addPlantToBed.ts` use case to support cross-collection validation and storage.

---

# 10. FUTURE EVOLUTION

## 10.1 Event-driven PlantInstance

PlantInstance will evolve based on Events:

- watering affects growth
- fertilization affects health
- pruning affects structure
- pest control affects survival

---

## 10.2 Simulation layer

Future capability:

- growth over time simulation
- health decay or improvement
- predictive yield estimation

---

## 10.3 Spatial + temporal fusion

PlantInstance becomes:

- spatial entity (position)
- temporal entity (state over time)
- event-driven entity (history-based evolution)

---

# 11. BOUNDARY RULES

PlantInstance MUST:

- remain domain-only
- not depend on API
- not depend on persistence
- not contain spatial logic implementation
- delegate spatial validation externally

---

# 12. RELATION TO OTHER MODULES

Depends on:

- Plant module
- Bed module
- Spatial module

Will depend on (future):

- Events module
- Growth simulation module

---

# 13. FINAL NOTE

PlantInstance is the core runtime entity of AgroApp.

If Plant is the “species”, PlantInstance is the “life”.
