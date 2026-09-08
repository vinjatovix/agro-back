# MODULE: SPATIAL SYSTEM

version: 1.3.0
source-spec: v1.3.0
status: stable

---

# 1. PURPOSE

This module defines spatial and ecological computation rules for AgroApp.

It is responsible for:

- Plant placement validation.
- Spatial collision detection (geometric and volumetric).
- Dynamic companionship proximity checks (`ecologicalReport`).
- Microclimatic solar suitability checks.
- Coordinate system consistency.

It MUST NOT depend on persistence or API layers.

---

# 2. SCOPE

Includes:

- `SpatialService` (pure computations, validation, and report generation).
- `SpatialContext` (environment state encapsulation).
- Distance and overlap validation logic.
- Crop rotation historical heuristics.

---

# 3. CORE PRINCIPLE

Spatial logic is pure computation.

Rules:

- Deterministic.
- Stateless.
- No direct I/O.
- No database or repository access inside computation methods.

---

# 4. SPATIAL MODEL

## 4.1 SpatialContext

Represents the environment state required for spatial and ecological calculations.

Includes:

- Bed geometry (all dimensional values use `PositiveNumber` value objects) and environmental protection properties.
- Existing plant positions and biological species IDs.
- Active companion planting rules (retrieved from `PlantRelation`).
- Historical plant instances (for crop rotation).

---

## 4.2 SpatialService

Responsible for:

- Validating placement against boundaries and overlaps.
- Detecting volumetric soil constraints.
- Generating the dynamic `ecologicalReport`.

---

# 5. RULES

## 5.1 Collision & Boundary Rules (Advisory/Non-blocking)

Neither plant-to-plant overlap nor bed boundary validation is blocking. Spacing and dimensions are advisory: rather than blocking placement (e.g., throwing a 400 Bad Request error or aborting the transaction), the spatial system generates proximity and boundary warnings/alerts that are returned to the user, allowing them to proceed with the planting if desired.

**Critical Exception (Geometric Hard Collision) `[TARGET STATE (Pending Iteration 59)]`:** To prevent impossible physical overlays, an exact geometric collision (where the distance between any two active plant instances is exactly $0\text{cm}$ or they occupy the exact same physical coordinates) remains strictly **blocking** and MUST throw a domain exception (halting execution and returning a 400 Bad Request error).

_Migration Note: In the current codebase, `BasicSpatialService.ts` throws a hard `InvalidArgumentException` on any collision or out-of-bounds, halting execution and returning a 400 Bad Request error. Transitioning these validations to a non-blocking advisory model (where alerts are recorded and returned without interrupting mutations, except for the exact $0\text{cm}$ geometric collision) is a target state slated for the Phase 4 Spatial Bed Design iterations._

All dimensional comparisons rely on `PositiveNumber` value objects.

### 5.1.1 Geometric 2D Collision (Ground/Raised Beds) `[TARGET STATE (Pending Iteration 56)]`

- Used for `raised_bed` and `in_ground` bed types.
- Evaluated as 2D proximity models using the biological spacing of the plants:
  - **Current & Definitive State (Agronomically Safe):** To ensure that the space vital of the most demanding species is respected, the distance between any two plants $P_1$ and $P_2$ must not be less than the maximum of their mature advisory spacing values:
    $$\text{distance}(P_1, P_2) \ge \max(\text{spacingCm}_1, \text{spacingCm}_2)$$
    where `spacingCm` corresponds to the value of the species' biological spacing (the codebase currently uses the `spacingCm.max` property from the catalog). This formula is agronomically correct because it prevents larger crops (like a Tomato requiring 50cm) from having their root zone or canopy space invaded by smaller companions (like a Tagete requiring 40cm), which would occur under simpler subdivision models.
- Boundary checks verify that the center coordinate $(x, y)$ of each plant lies within the $(0, 0)$ to $(\text{width}, \text{height})$ coordinate plane.

### 5.1.2 Volumetric Collision & Soil Constraint (Containers) `[TARGET STATE (Pending Iteration 58)]`

- Used for the `container` bed type.
- **Root Depth Constraint:** Compares the plant's mature root depth requirements (e.g., 40cm for tomatoes) against the container's physical `depthCm`. Emits alerts if the container is too shallow.
- **Soil Volume Capacity:** Tracks total soil capacity. Each plant species requires a minimum volume in liters. The service aggregates the total volume of all active plant instances and compares it against the container's `volumeLiters`. Emits a soil exhaustion warning if the capacity is exceeded.
- **No Coordinate Checks:** Placed without coordinates (coordinates are `null` in virtual containers), bypassing coordinate-plane overlapping checks.

### 5.1.3 Square Foot Gardening (SFG) Grid Conversion & Snapping `[TARGET STATE (Pending Iteration 57)]`

To support both physical spacing tools (spacing tools) and urban grid-based layout systems, the continuous 2D coordinate system (`(x, y)` in centimeters) is compatible with a **virtual Square Foot Gardening (SFG) projection**:

- **Unified Data Model:** The database always stores crop positions in continuous centimeters `(x, y)`, keeping the core `SpatialService` pure, unified, and free of separate grid-based storage structures.
- **Virtual Grid Projection:** If a Bed has `isSfg === true`, the system projects a grid over the physical space using a standardized cell size of **exactly 30 cm x 30 cm** (rounding the 1-foot cell for clean integer arithmetic and easy physical measurement).
- **Coordinate Snapping (Quantization):** When planting in a grid cell `(col, row)` (0-indexed columns and rows), the system maps the placement to continuous centimeters:
  - **Single Crop per Cell (Density = 1, e.g., Tomatoes):** The position is mapped directly to the geometric center of the cell:
    $$x = (\text{col} + 0.5) \times 30$$
    $$y = (\text{row} + 0.5) \times 30$$
  - **High Density Crops (Density = 4, 9, or 16, e.g., Carrots, Spinach):** The system divides the 30 cm x 30 cm cell into a nested regular sub-grid and generates individual continuous coordinates `(x, y)` for each seed station. This returns a discrete spatial representation for each sub-plant (e.g., creating 9 or 16 individual `PlantInstance` coordinates) allowing high granularity and coordinate-by-coordinate life-cycle management.
- **Architectural Boundary (No Side-Effects):** The `SpatialService` acts purely as a geometric and biological compatibility calculator. It **DOES NOT** access or mutate the `SeedBatch` inventory. The creation of discrete `PlantInstance` documents and subsequent inventory deduction are orchestrated entirely outside the spatial engine (via Application use cases and asynchronous Event Bus handlers).
- **Seamless Proximity Analysis:** Because grid placements map to continuous physical centimeters, companions and spacing warnings automatically work using standard Euclidean distance calculations, meaning adjacent cells ($\approx 30\text{--}42\text{ cm}$ apart) are evaluated naturally by the existing companion engine.

---

## 5.2 Distance & Companionship Analysis (ecologicalReport) `[TARGET STATE (Pending Iteration 60)]`

When querying or rendering a Bed layout, the service evaluates active plants against the global directed `PlantRelation` graph:

- **Euclidean Proximity:** Calculates Euclidean distances between all active plant instances in coordinate-based beds.
- **Mutual Influence Distance:** For any two plants $P_1$ and $P_2$, the mutual influence distance limit is determined as:
  - First, the system attempts to use the explicit `maxDistanceCm` defined in their direct relationship edge inside the `PlantRelation` graph (if it exists).
  - If no relationship is defined or if `maxDistanceCm` is omitted, it falls back to the maximum of their mature advisory spacing values:
    $$\text{fallbackLimit} = \max(\text{spacingCm}_1, \text{spacingCm}_2)$$
    where `spacingCm` corresponds to the mature advisory spacing value of the species.
- **Companion Evaluation:** For any two plants $P_1$ and $P_2$ within mutual influence distance:
  - Identifies beneficial synergies (e.g., Basil repelling pests from Tomatoes) and flags them as active companions.
  - Raises warnings for biological "enemies" (harmful interactions) placed too close together.
- **Directional Sensitivity:** Honors the directed nature of the relationship (e.g., plant A helps plant B, but plant B might not help plant A) as defined in `plant-relation.md`.

---

## 5.3 Crop Rotation Advisory Heuristic `[TARGET STATE (Pending Iterations 77 & 78)]`

To maintain soil health, prevent nitrogen depletion, and minimize pathogen accumulation, the `ecologicalReport` includes crop rotation recommendations:

- **Pure Computational Flow (No Repository Access):** In compliance with architectural boundaries, the `SpatialService` **MUST NOT** directly query databases or access repositories. The Application layer use case (e.g., compiling the report or saving the layout) is responsible for retrieving the historical dataset and injecting it into the `SpatialContext` before running validations.
- **RAM Optimization via Flat Projections (Opportunity 2.6):** To prevent severe memory overhead and Event Loop blocking under high concurrency (Risk 1.7), use cases do not load or hydrate full `PlantInstance` domain aggregates. Instead, they query an optimized, lightweight flat projection from MongoDB:
  ```typescript
  type HistoricalCropSummary = {
    familyId: string;
    plantedAt: Date;
    deletedAt: Date | null;
  };
  ```
- **Heuristic: Cumulative Occupancy:** Instead of a complex, error-prone sequential analysis of consecutive plantings in code, rotation suitability is evaluated using a **cumulative temporal occupancy** metric:
  - The database layer executes an optimized **MongoDB Aggregation Pipeline** that groups historical crops in the target `Bed` over the past 36 months by botanical `familyId`, summing up their active growing days:
    $$\text{activeDays} = \sum (\min(T, \text{deletedAt}) - \text{plantedAt})$$
    where $T$ represents the evaluation time (now) and `deletedAt` defaults to $T$ for crops that are still active/alive.
  - The `SpatialService` receives this aggregated temporal summary `[{ familyId: string, activeDays: number }]` via the context.
  - **Invariant Warning:** If any botanical family (such as Solanaceae) has occupied the bed for more than a critical threshold (e.g., more than **365 cumulative days** out of the past 36 months), the engine generates a non-blocking advisory warning suggesting restorative, nitrogen-fixing crops (like Leguminosae).

---

## 5.4 Microclimate & Sun Exposure Validation `[TARGET STATE (Pending Iterations 61 & 62)]`

The service performs solar compatibility checks:

- **Local Exposure Resolution:** For coordinate-based beds, the system resolves the localized sun exposure at the plant's exact placement coordinate $(x, y)$:
  - If the coordinate $(x, y)$ falls within any of the Bed's defined `shadeZones` (bounding box checks: $startX \le x \le endX$ and $startY \le y \le endY$), the localized exposure level is overridden by that zone's exposure.
  - Otherwise, it defaults to `'full_sun'`.
- **Sun Exposure Matching:** Compares this localized resolved exposure against the biological light requirements and preferences defined in the `Plant` aggregate catalog.
- **Environment Bypass:** Under the centralized **Protected Environment Bypass Rules (Section 5.4.1)**, the solar check is strictly bypassed for `'indoor'` environments, or any bed where `hasArtificialLight === true`.
- **Advisory Alarm:** Emits a warning if a mismatch occurs (e.g., placing shade-loving lettuce in a `'full_sun'` area, or placing solar-loving tomatoes in a `'full_shade'` zone).

### 5.4.1 Centralized Protected Environment Bypass Rules

To ensure realistic climate and biological modeling, environmental protection bypasses are decoupled based on physical structure:

1. **Solar Exposure (Spatial System):**
   - **Bypassed strictly ONLY for `'indoor'` environments, or any Bed with the explicit `hasArtificialLight === true` flag**, assuming complete or supplementary reliance on artificial lighting.
   - **Active for `'greenhouse'` and `'outdoor'` environments** unless overridden by `hasArtificialLight === true`. Greenhouses are transparent structures that rely entirely on natural sunlight; therefore, plants inside a greenhouse still undergo standard solar checks and shade zone validations by default.
2. **Precipitation / Rain Silencing (Reminders System):**
   - **Bypassed for both `'indoor'` and `'greenhouse'` environments.** Both structures feature physical roofs that block external rainfall. Thus, watering reminders for these protected environments must never be delayed or silenced by outdoor precipitation forecasts (detailed in `reminders.md`).

---

## 5.5 Exclusion of Terminated Instances & Temporal Space Liberation (Time-Travel) `[TARGET STATE (Pending Iterations 40 & 56)]`

- The spatial system processes space-time coordinates. All spatial calculations (collision detection, boundary checks, and companion distance calculations) are evaluated relative to a target datetime parameter `T` (defaulting to the current execution time).
- A plant instance is considered physically occupying space in the bed at time `T` if and only if:
  1. It has been planted (`plantedAt <= T`)
  2. It has NOT been soft-deleted by mistake (`status !== 'removed'` or `deletedAt > T`)
  3. It has NOT reached a terminal biological state (`growthStatus !== 'harvested'` AND `growthStatus !== 'dead'`).
- Any plant instance that has been soft-deleted or has reached a terminal biological state (e.g., via a `harvest` event with `isFinal: true`) immediately liberates the physical space it occupied in the bed.
- This temporal coordinate calculation allows new plant instances to be placed in that same location without collision warnings.
- **Undelete / Restore Validation (Collision Prevention):** If a user attempts to "undo" a deletion (e.g., restoring a soft-deleted plant instance back to `status: 'active'`), this mutation MUST NOT be treated as a simple database flag toggle. The backend MUST feed the restoring plant back through the `SpatialService` synchronous checks. If the liberated physical space has been occupied by another active plant instance in the meantime resulting in a hard geometric collision ($0\text{cm}$ overlay), the restoration transaction MUST be aborted and return a `409 Conflict`.

---

## 5.6 Determinism

Same input MUST produce same output always.

---

## 5.7 Dry-Run Layout Simulation and Batch Save Patterns (KonvaJS Optimization)

To support real-time visual drag-and-drop on a spatial canvas (using rendering engines like KonvaJS) without flooding the database with hundreds of writing requests or throwing frequent concurrency errors, the system enforces a strict distinction between **Draft Layout Simulation** and **Consolidated Layout Saving**:

### 5.7.1 Dry-Run Layout Simulation (Stateless Verification) `[TARGET STATE (Pending Iteration 66)]`

- **Concept:** When a user is interacting with the spatial canvas (dragging crops, arranging spacing), the client-side app sends debounce requests (e.g. on dragging finish) to simulate the layout in-memory.
- **Backend Execution:** The backend usecase retrieves the corresponding `Bed` and its static background (like 36-month rotation history summary) and feeds the proposed layout array (sent entirely by the client in the request body) into `SpatialService` inside memory.
- **Inventory Bypass Rule (Dry-Run):** To guarantee sub-millisecond responsiveness and complete isolation of concerns, **the simulation engine strictly ignores all SeedBank stock availability limits**. It does not perform any seed-level queries or stock evaluations during the dry-run, focusing exclusively on geometric boundaries, overlaps, solar microclimates, and rotation histories.
- **Database Impact:** **0 writes, 0 updates, zero state mutation.** The database is read-only, preventing write locks or OCC version bumps while the user is playing with ideas.
- **Response:** Instantly returns the calculated `ecologicalReport` (including companion indices, boundary alerts, and spacing warnings) so the Canvas can immediately paint interactive color rings (green/yellow/red) for real-time user feedback.

### 5.7.2 Consolidated Layout Saving (Batch Persistence & Planning Modes) `[TARGET STATE (Pending Iterations 67 & 68)]`

- **Concept:** Once the user is satisfied with their canvas configuration, they press "Save Layout". Because the tool serves both as a future planner and a current execution log, the API accepts a `linkToSeedBank: boolean` flag in the payload.
- **Mode: Planning (`linkToSeedBank: false`):** The layout is saved to the database. No inventory checks are made, and no stock deduction events are dispatched to Kafka. The user is freely planning a future season (e.g., planning in June for September) without needing the physical seeds on hand.
- **Mode: Execution (`linkToSeedBank: true`):** The backend performs a **synchronous, blocking read validation** against the SeedBank inventory. If the required quantities exceed the user's active stock, the transaction is aborted and a 400 Bad Request error is returned. If stock is sufficient, the layout is persisted.
- **Backend Execution:** The backend clears previous active instances inside the Bed, runs a final synchronous validation of the whole layout (including the blocking stock check if in Execution Mode), and persists the new crop coordinates in a single database transaction (`ClientSession`).
- **Pre-computed Read Model Optimization:** During this write step, the final synchronous `ecologicalReport` and calculated crop `warnings` are computed once and stored **directly as persisted fields** inside the `Bed` (and `PlantInstance` documents).
- **Fast GET Pathways (O(1) Reads):** Subsequent GET requests requesting the Bed or its list of plant instances do **NOT** execute the `SpatialService` or run Euclidean distance checks on-the-fly. They simply return the pre-computed and stored warnings/report directly from the database document, securing absolute sub-millisecond retrieval speeds under high load.
- **Eventual Consistency Pattern `[TARGET STATE]`:** To prevent these pre-computed snapshots from becoming stale when the global botanical catalog (`Plant`) or the companion graph (`PlantRelation`) is modified by administrators, the system uses Kafka. Updates to the catalog emit domain events that trigger asynchronous background workers. These workers recalculate the snapshots for any beds containing the affected species, maintaining data consistency without impacting standard API read times.
- **Algorithm Upgrade Mass Recalculation `[TARGET STATE]`:** If the backend codebase is deployed with improved spatial algorithms (e.g., transitioning from 2D collision rules to 3D root volume intersections or trigonometric shadow mapping), existing pre-computed snapshots will become mathematically dissonant with the new rules, causing UX confusion. To resolve this, deployments carrying spatial engine upgrades MUST manually trigger a global system event (e.g., `SystemSpatialEngineUpgraded`) to Kafka. Throttled asynchronous workers will consume this event and progressively recalculate all bed snapshots worldwide over several hours, ensuring the entire database eventually speaks the exact same mathematical language without saturating production.
- **Unified Event Dispatching:** If `linkToSeedBank` is true, saving the layout generates a single consolidated `BedLayoutSaved` domain event, which is pushed to Kafka post-commit for asynchronous side-effects (like recalculating care schedules and executing the actual inventory decrement in the background).

---

# 6. CURRENT STATUS

## Implemented

- SpatialService pure implementation (basic math spacing).
- SpatialContext model.
- spacingCm validation rule.
- Math-based distance calculations.

## Pending `[TARGET STATE (Pending Phase 9, 10 & 13 Iterations)]`

- Container volumetric & capacity collision rules `[TARGET STATE (Pending Iteration 58)]`
- Sun exposure microclimate matching `[TARGET STATE (Pending Iteration 62)]`
- PlantRelation companions graph proximity queries (`ecologicalReport`) `[TARGET STATE (Pending Iterations 32, 56 & 64)]`
- 36-month Crop rotation event analytics `[TARGET STATE (Pending Iteration 77)]`
- Temporal time-travel space liberation logic `[TARGET STATE (Pending Iterations 40 & 56)]`
- **`[TARGET STATE (Pending Iteration 63)]` Vertical Canopy Strata & Guild Layering:**
  - **Concept:** Permaculture systems utilize up to 7 distinct vertical canopy layers (root, ground cover, herbaceous, shrub, low tree/sub-canopy, overstory canopy, and climber/vine). A single physical 2D location can hold multiple plants growing at different heights/root zones.
  - **Collision Override:** The 2D geometric collision engine is upgraded to incorporate the biological `stratum` attribute. Two plants occupying overlapping physical positions do NOT generate space invasion or proximity warnings if they occupy complementary strata (e.g., growing carrots in the `'root'` layer under trellised tomatoes in the `'climber'` layer).
- **`[TARGET STATE (Pending Iteration 64)]` Dynamic Companion Proximity Scaling:**
  - **Concept:** Monoculture spacing guidelines: $\text{distance}(P_1, P_2) \ge \max(\text{spacingCm}_1, \text{spacingCm}_2)$ are agronomically conservative. High-density polyculture guilds achieve synergistic density increases through root and canopy complementation.
  - **Dynamic Scaling:** If a strong `'beneficial'` companion relationship is active between two plants in the directed graph, the advisory spacing limit is dynamically reduced (e.g., scaled down by a factor of `0.75` or `0.80`), allowing closer planting of mutualistic partners without triggering visual alerts.

---

# 7. ANTI-PATTERNS

- No repository or direct database access inside computation methods (data must be fetched and mapped in application layer first).
- No API or transport layer logic.
- No mutation of domain objects.
- No reliance on global temporal state.
