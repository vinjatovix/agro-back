# MODULE: BED

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE

Represents a physical or logical growing space where PlantInstances are placed.

It acts as the spatial and organizational boundary for cultivation.

---

## 2. CORE RESPONSIBILITY

The Bed aggregate is responsible for:

- defining spatial boundaries for planting
- acting as anchor for spatial computations
- grouping PlantInstances logically
- providing spatial context for placement validation
- enforcing ownership boundaries for access control

---

## 3. DOMAIN ROLE

Bed is:

- a spatial aggregate root
- a structural container
- a boundary for spatial rules
- an ownership-scoped resource

Bed is NOT:

- a plant manager
- a lifecycle orchestrator
- an event owner

---

## 4. RELATIONSHIPS

### 4.1 Bed → PlantInstances

- A Bed is logically associated with multiple PlantInstances via `bedId`.
- **`[TARGET STATE (Pending Iteration 38)]` Standalone collection:** PlantInstances are fully detached from the Bed aggregate and persisted in their own independent `plant_instances` collection. They are loaded dynamically using the `PlantInstanceRepository` (two queries are made to draw/render the Bed map).
  - _Migration Note: In the current codebase, PlantInstances are physically embedded inside the Bed aggregate root (`props.plantInstances` array in `Bed.ts`) and stored inside the same document within the `beds` collection in MongoDB._
- Spatial rules are evaluated by loading the active PlantInstances of that Bed on-the-fly and passing them to `SpatialService` during placement.

### 4.2 Bed → Spatial System

- Bed provides spatial context
- Bed defines coordinate space assumptions
- Bed is input for SpatialService validation

### 4.3 Bed → User

- Bed is scoped to a single User.
- Access is enforced per user ownership.
- Cross-user access is forbidden.
- **`[TARGET STATE (Pending Iteration 24)]` Immutable Geographic Inheritance:** During creation (`POST`), Beds inherit their `hemisphere`, `timezone`, (and optionally `postalCode` / `country`) configuration directly from the owning User's profile. Crucially, these values are **copied and persisted as static, immutable properties** inside the `Bed` aggregate itself. This guarantees that if a user relocates to another country and updates their profile, the climatic and seasonal history (crop rotations, planting calendars, 6-month seasonal shifts, and local task schedules) of their older beds remains perfectly intact and historically accurate.

---

## 5. SPATIAL MODEL `[TARGET STATE (Pending Iterations 56 & 58)]`

### 5.1 Hybrid Bed Types `[TARGET STATE (Pending Iterations 56 & 58)]`

The system supports different growing environments, defined by the `bedType`, `environment`, and lighting properties:

- `bedType`:
  - `container`: Individual pots, planter boxes, or grow bags.
  - `raised_bed`: Elevated soil beds with physical wooden or stone boundaries.
  - `in_ground`: Direct agricultural plots in the soil.
- `environment`:
  - `'outdoor'`: Fully exposed to natural weather conditions.
  - `'indoor'`: Protected indoors; completely bypasses weather checking (Open-Meteo).
  - `'greenhouse'`: Protected under a greenhouse; bypasses precipitation checking (rain silencing for reminders), but NOT solar microclimate checks by default.
- `hasArtificialLight`: (boolean, optional)
  - If set to `true`, the Bed is equipped with artificial crop lighting. This explicitly bypasses all solar microclimate checks and sun exposure matching in the Spatial System, regardless of the `environment` setting (e.g., allowing an outdoor bed with supplementary lights or a tecnified greenhouse to bypass natural sunlight constraints).

_(Note: For the exact definition of environmental protection level and its behavior in reminders or spatial system, see **Module: Spatial System (spatial.md) Sec. 5.4.1**)_

---

### 5.2 Volumetric & Geometric Properties `[TARGET STATE (Pending Iterations 56 & 58)]`

Based on the `bedType` and `environment`, the Bed aggregate holds different physical and environmental constraints:

1. **Ground/Raised Beds (`raised_bed`, `in_ground`):**
   - Evaluated geometrically in 2D coordinates.
   - Requires: `width` (cm) and `height` (cm) physical dimensions.
   - Positioning: Requires absolute `(x, y)` coordinate offsets.
   - Boundary checks and circular collision overlapping are fully active.
   - **Square Foot Gardening (SFG) Grid Option:** If the bed flag `isSfg` (boolean, optional, defaults to `false`) is enabled, the physical coordinate space is virtually projected as a grid of standardized **30 cm x 30 cm** cells (rounding down the standard 1-foot definition to exactly 30 cm for physical ease of measurement and clean division logic). Crop placements snap to the center of these cells.

2. **Containers (`container`):**
   - Evaluated volumetrically.
   - Requires: `volumeLiters` (L) and `depthCm` (cm) properties instead of width/height.
   - Positioning: Placed without coordinates (null `position` in the virtual container).
   - Spatial checks: Compares the plant's mature root depth requirements (e.g. 40cm for tomatoes) against the container's `depthCm`, and tracks total soil capacity (limiting the number of plant instances based on liters of soil).

---

### 5.3 Soil, Mulch, & Microclimate Properties `[TARGET STATE (Pending Iteration 61)]`

To enable advanced permaculture and microclimatic moisture calculations, the Bed aggregate stores environmental attributes:

- `soilType`: (e.g., "universal", "clay", "sandy", "compost") to determine nutrient suitability and density.
- `mulchType`: (e.g., "none", "straw", "bark_chips", "compost") representing ground cover, which dynamically decreases moisture evaporation rates.
- `shadeZones`: `ShadeZone[]` representing localized sun exposure across the bed area.
  - A `ShadeZone` is a submodel defining a geometric bounding box with custom lighting:
    ```ts
    type ShadeZone = {
      startX: number; // in cm
      startY: number; // in cm
      endX: number; // in cm
      endY: number; // in cm
      exposure: 'full_sun' | 'partial_shade' | 'full_shade';
    };
    ```
  - The bed defaults to a base sun exposure (e.g., `'full_sun'`). If a plant's coordinate `(x, y)` falls within any `shadeZone` boundaries, its localized exposure is overridden by the zone's exposure level, allowing gardeners to map varied shadows within a single Bed.

---

### 5.4 Constraints

- spacing and boundary rules apply inside Bed boundaries for geometric beds
- volumetric capacity limits the amount of plants inside containers
- collision detection is Bed-scoped
- no global spatial state exists

---

## 6. QUERY INTEGRATION

- Bed collection retrieval operations support the global Query System.
- Bed query validation is handled at the validation/API layer and translated in the persistence layer.
- Invalid filters must be rejected by the validation layer. The Bed domain remains entirely unaware of query parsing internals.

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

---

## 7. RULES

### 7.1 Deletion Lifecycle (Soft Deletion) `[TARGET STATE (Pending Iteration 40)]`

- To maintain consistency and align with the standard defined in `plant-instance.md` and `plant.md`, the `Bed` aggregate root MUST support soft deletion using an anti-anemic, model-driven business method in the domain (e.g., `markAsDeleted()`).
- Calling this method sets the `status` property to `'removed'` and records the `deletedAt` timestamp (ISODate) within the aggregate root.
- Access control and status invariants (e.g., preventing operations on deleted beds) are enforced inside the domain.
- _Migration Note: Currently, the codebase implements Bed soft deletion using a boolean flag `deleted: boolean` and timestamp `deletedAt`. Standardizing Bed to utilize `status: 'active' | 'removed'` is a target state slated to be refactored in Iteration 40._

### 7.2 Optimistic Concurrency Control (OCC) & Transactions `[TARGET STATE (Pending Iterations 41 & 42)]`

- To prevent race conditions during concurrent plant placements, the `Bed` aggregate root MUST implement Optimistic Concurrency Control (OCC) using a `version` property.
- Since `Beds` and `PlantInstances` reside in separate MongoDB collections, coordinate placements and Bed version increments MUST be executed atomically using **MongoDB ACID Multi-Document Transactions**.
- These transactions are fully supported both in production (via MongoDB Atlas) and in development (via the single-node Replica Set configured in `docker-compose.yaml`).
- Concurrent requests targeting the same `bedId` will be rejected if the Bed's version has changed under the hood during the transaction, forcing a re-evaluation of spatial collision rules.

### 7.3 Bed Resizing Boundary Constraint `[TARGET STATE (Pending Iteration 65)]`

- To prioritize simplicity, maintainability, and allow easy correction of user setup erratas, **the Bed aggregate holds flat, static dimensions (`width`) and (`height`)** rather than a complex versioned dimensions history array.
- Modifying these physical dimensions via the use case `UpdateBed` MUST be validated against active plant instances inside the bed.
- **Resizing is strictly blocked and MUST throw `DomainConflictException`** if the exact center coordinate `(x, y)` of any **active** (alive) `PlantInstance` currently placed in the bed would fall outside the newly proposed `width` or `height` boundaries.
- **Radial overflow** (where a plant's mature spacing radius extends past the bed boundaries) does NOT block the resizing operation; it will only generate a non-blocking visual/spatial warning.
- **Any inactive or soft-deleted plant instances (`status = 'removed'`) are completely ignored during this check**, allowing the user to resize a bed with erratas once they relocate or soft-delete any active plants physically violating the new borders.
- **Decoupled Validation Responsibility (Orchestration Pattern):** The `Bed` aggregate itself does not query or load its own plant instances, maintaining the strict rule _'Bed MUST NOT contain plant business logic'_. Instead, the Application Layer use case (`UpdateBed`) orchestrates this validation: it fetches the Bed aggregate, retrieves active `PlantInstances` for that `bedId` from the standalone `PlantInstanceRepository`, and executes the boundary checking logic prior to executing the state mutation.

### 7.4 Pre-computed Ecological Report Persistence & Eventual Consistency

- To avoid $O(N^2)$ Euclidean computations and heavy MongoDB history scans during standard `GET` requests (such as rendering the Bed in KonvaJS), **the Bed aggregate root (or Bed read-model) holds a persisted snapshot of its own calculated `ecologicalReport`**.
- This snapshot is updated synchronously during layout saving write transactions (`PUT /api/v1/beds/:id/layout`).
- Read pathways (`GET /api/v1/beds/:id`) bypass any dynamic coordinate analysis and return this pre-computed report directly, guaranteeing fast performance.
- **Eventual Consistency Trigger `[TARGET STATE]`:** Because the botanical catalog and the companion graph are mutable, a snapshot can become stale. To maintain absolute data consistency without slowing down reads, the system uses an eventual consistency pattern. Mutations to `Plant` or `PlantRelation` aggregates dispatch events (e.g., `PlantRelationUpdated`) to the Kafka Event Bus. An asynchronous background worker consumes these events, identifies all `Beds` containing the affected species, recalculates their spatial snapshots in memory, and updates them silently.

### 7.5 Core Rules

- Bed MUST NOT contain plant business logic
- Bed MUST NOT handle events
- Bed MUST NOT depend on persistence layer
- Bed MUST remain independent of API layer
- Bed MUST NOT allow ownership (userId) modification once created

---

## 8. CURRENT IMPLEMENTATION STATUS

### Implemented

- Bed aggregate structure
- basic spatial anchoring concept
- integration with SpatialService (logical)
- full REST lifecycle coverage (create, read, update, delete)
- ownership enforcement in API layer
- validation contract enforcement (OpenAPI-driven tests)

### Partial

- spatial indexing not implemented
- grid abstraction not formalized in domain
- PATCH semantics validation rules still evolving

### Pending

- formal grid model (cellSize, coordinate system)
- integration with PlantInstance lifecycle
- spatial optimization layer (SpatialIndex)

---

## 9. FUTURE EVOLUTION

### 9.1 Grid system (planned)

- cellSize becomes domain concept
- snapping rules defined at Bed level
- alignment constraints formalized

---

### 9.2 Spatial scaling

- SpatialIndex integration
- performance optimization for large beds
- O(n²) → O(k) resolution

---

### 9.3 PlantInstance integration

- Bed becomes primary container for PlantInstances
- lifecycle queries scoped per Bed
- event aggregation per Bed (future extension)

---

### 9.4 `[TARGET STATE (Pending Iteration 73)]` Soil Analysis & Amendments History

- **Purpose:** Record qualitative and quantitative soil readings per Bed to enrich the recommendations of the care task reminders engine.
- **Historical Log & Readings:** Stores a historical chronological log of soil samples and diagnostic readings associated with the `bedId`:
  - `soilPh`: number (measured pH value, e.g., `6.5`).
  - `texture`: enum (`clay` | `sandy` | `loam` | `silt` representing physical soil structure).
  - `organicMatter`: enum (`low` | `medium` | `high` | `very_high` representing organic composition).
  - `appliedAmendments`: list of `GardenInput` IDs specifically applied to adjust pH, replenish micro-elements, or correct nutrient deficiencies.
- **Reminders Engine Integration:** The care engine can dynamically recommend tailored soil amendments (e.g., adding sulfur/acid organic matter for alkaline soils, agricultural limestone for acidic soils, or specific green manures/compost based on the latest readings).

---

---

## 10. BOUNDARY RULES

Bed MUST remain:

- domain-only
- persistence-agnostic
- API-agnostic
- deterministic
- ownership-immutable after creation

---

## 11. RELATION TO SPATIAL SYSTEM

Bed is the primary input to:

- SpatialContext
- SpatialService validation
- collision detection
- spacing validation

---

## 12. FINAL NOTE

Bed is a structural aggregate, not a behavioral system.

Its complexity increases only through spatial modeling, not business logic.
