# MODULE: SEED BANK `[TARGET STATE (Pending Iterations 52 & 55)]`

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE `[TARGET STATE (Pending Iterations 52 & 55)]`

The Seed Bank module manages the user's private seed inventory.

It enables gardeners and permaculturists to keep track of their available seed packets (lots), log historical germination tests, and calculate viability success rates over time.

---

## 2. CORE RESPONSIBILITY

The Seed Bank module is responsible for:

- Tracking seed batch metadata, stock, and origin.
- Logging detailed, condition-specific germination test runs.
- Dynamically calculating seed viability (germination rate) based on test results.
- Managing seed batch depletion during nursery or direct sowing events.

---

## 3. DOMAIN ROLE

Seed Bank is:

- A private inventory aggregate root (`SeedBatch` acts as its own aggregate root).
- A support tool for crop placement (Phase 4).

Seed Bank is NOT:

- A public botanical catalog (this is managed by the `Plants` module).
- Spatially situated (it holds seed inventories, but has no coordinates).

---

## 4. DATA MODEL

### 4.1 SeedBatch (Aggregate Root)

Each seed batch is scoped to a single authenticated user and represents a physical seed envelope or harvest.

- `id`: UUID (value object)
- `userId`: UUID (foreign key pointing to `users`)
- `plantId`: UUID (foreign key pointing to `plants`)
- `acquiredYear`: integer (the year the user obtained the seeds)
- `acquiredFrom`: string (optional brand, company, or origin, e.g. "Batlle", "Felix", "Neighbor share")
- `packagedYear`: integer (optional packaging year printed on commercial envelopes)
- `expirationDate`: ISODate (optional expiration date printed on the envelope or estimated)
- `initialQuantity`: integer (optional initial seed count in the lot)
- `remainingQuantity`: integer (optional remaining seed count; null if unlimited or unchecked)
- `unlimited`: boolean (if true, stock decrement rules are bypassed)
- `germinationRate`: float (defaults to `0.85` / 85%; dynamically updated when germination tests are recorded)
- `status`: enum (`active` | `exhausted` | `expired`)
- `germinationTests`: array of nested `GerminationTest` sub-documents
- `metadata`: Audit metadata

---

### 4.2 GerminationTest (Sub-document) `[TARGET STATE (Pending Iteration 53)]`

Represents a structured test run by the user to evaluate seed viability under specific conditions:

- `id`: UUID
- `testDate`: ISODate
- `seedsTested`: integer (number of seeds placed in the test medium)
- `seedsGerminated`: integer (number of seeds that successfully sprouted)
- `medium`: enum (`paper_towel` | `cotton` | `substrate_surface` | `substrate_buried` | `vermiculite` | `other`)
- `temperatureCelsius`: float (optional ambient temperature during test)
- `lightHours`: integer (optional daily hours of light received)
- `notes`: string (optional custom details, e.g., "Molded slightly", "Sprouted very fast")

---

## 5. RELATIONSHIPS & Lifecycles

### 5.1 SeedBank ↔ Plants Catalog

- `SeedBatch` references a `plantId`.
- **User-Provided Expiration:** The user directly inputs `packagedYear` and `expirationDate` based on their real commercial seed envelopes.
- **Dynamic Catalog Fallback:** If `expirationDate` is omitted, the system calculates a fallback expiration date in-memory by looking up the `seedViabilityYears` property on the associated `Plant` from the central catalog and adding it to the batch's `acquiredYear`.
- **Database Catalog Evolution Note:** The botanical catalog (`Plant`/`Family` schema) must be enriched with the `seedViabilityYears` (average lifespan in years) property to support this dynamic calculation. Until that catalog property is fully persisted, fallback calculation remains disabled or defaults to a hardcoded standard (e.g., 3 years).

---

### 5.2 SeedBank ↔ PlantInstance Lifecycle (Nursery & Direct Sowing)

- **Planning vs. Execution Mode:** Layout creation supports a `linkToSeedBank` flag. If `false` (Planning Mode), the seed bank is completely ignored. If `true` (Execution Mode), the backend performs a synchronous read-only check during the layout save to block the transaction if stock is insufficient.
- **Event-Driven Stock Deduction (Asynchronous & Eventual):** If in Execution Mode, actual inventory adjustments are executed asynchronously to prevent database lock contention during the layout canvas save.
- **Deduction Mechanics:**
  - Persisting a final Bed layout (`PUT /api/v1/beds/:id/layout` with `linkToSeedBank: true`) or starting a nursery synchronously commits the local states and dispatches a corresponding `BedLayoutSaved` or `SeedSown` domain event to the Kafka Event Bus.
  - An asynchronous consumer (`SeedBankStockSubscriber`) listens to this event, reads the `seedBatchId` and the quantities sown, and decrements `remainingQuantity` in the linked `SeedBatch` document (unless `unlimited === true`).
  - **Exhaustion State Mutation:** If the Kafka consumer decrements the `remainingQuantity` to `0`, it MUST synchronously update the `status` field of the `SeedBatch` document to `exhausted` and persist it.
  - **Grace Period Refund Rule `[TARGET STATE]` (UI Mistake Protection):** If a plant instance is soft-deleted shortly after creation (e.g., `deletedAt` is within 24 hours of `plantedAt`), it is assumed the user made a layout error on the Canvas (a "fat-finger" mistake). The event consumer processing the deletion MUST refund/increment the `remainingQuantity` of the linked `SeedBatch`. Deletions occurring after this 24-hour grace period are considered biological failures or genuine removals, and no stock is refunded.
  - **`[TEMPORAL PARADOX RESOLUTION - DEFERRAL NOTE]`**: Because `BedLayoutSaved` is introduced in Iteration 69 (Phase 11) but the stock-decrement consumer is not created until Iteration 76 (Phase 13), the consumer's stock-decrement actions are safely deferred during Iteration 69 to prevent dependency breaks. The handler is fully wired and operational once Iteration 76 is completed.
  - This guarantees that inventory adjustments are decoupled from synchronous coordinate placement, securing maximum API responsiveness.
- When seeds sprout in a nursery, the user records the germination outcome (how many seeds germinated) directly inside `GerminationTest` logs for that batch, updating its `germinationRate`.
- Seedlings that survive are eventually transplanted to a physical `Bed` (creating active coordinate positions). Any seedlings discarded or thinned (without penalties) do not negatively impact the germination rate statistic since they successfully sprouted.

---

## 6. RULES

- **Privacy Boundaries:** A user's `SeedBatch` records are strictly private and owned by the creator. Access by other users is forbidden.
- **Dynamic Recalculation `[TARGET STATE (Pending Iteration 54)]`:** The aggregate root dynamically computes `germinationRate` based on the latest logged `GerminationTest` runs:
  - `germinationRate = (sum of seedsGerminated) / (sum of seedsTested)`.
- **Stock Invariance:** `remainingQuantity` cannot be less than `0`. If `remainingQuantity === 0`, `status` is automatically updated to `exhausted` during the write operation.
- **Expiration Logic (Domain Purity):** Expiration is evaluated dynamically inside the Domain layer (Aggregate Root), not the Mapper. The `SeedBatch` aggregate provides a method `isExpired(currentDate: Date): boolean` that compares the dynamic fallback expiration date against the current time. Mappers simply invoke this pure domain method to construct the DTO response, preserving Clean Architecture boundaries without requiring active cron jobs.

---

## 7. FINAL NOTE

The Seed Bank is the operational foundation of the permacultural garden, linking raw physical inventory to active garden layouts and germination statistics.
