# MODULE: EVENTS SYSTEM

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE

This module defines the event-driven layer of AgroApp.

It represents all time-based actions and state changes that occur in PlantInstances over time.

Events are the foundation for:

- lifecycle tracking
- historical analysis
- simulation
- future prediction

---

## 2. CORE CONCEPT

An Event is an immutable record of something that happened in the system.

Events are:

- append-only
- time-based
- contextual
- linked to PlantInstances and Beds

---

## 3. DOMAIN ROLE

Events are NOT:

- business logic executors
- state mutators
- computation engines

Events ARE:

- history records
- inputs for derived state systems
- simulation primitives
- audit trail foundation

---

## 4. EVENT MODEL

### 4.1 Base Event Structure `[TARGET STATE (Pending Iteration 70)]`

Each event includes:

- id (UUID value object)
- userId (UUID)
- scope (explicit enum: `'bed'` | `'instance'`) — **`[TARGET STATE (Pending Iteration 70)]`** (The current codebase strictly maps all events to a specific plant instance ID and lacks a scope field).
- bedId (UUID) — always present to group events physically
- plantInstanceId (UUID) — mandatory only if `scope === 'instance'`; MUST NOT exist if `scope === 'bed'` (as the event targets the whole container).
- type (discriminated union)
- date
- data (type-specific payload, which may contain an optional/mandatory `plantId` when `scope === 'bed'` for specific allowed event types to target a botanical species) — **`[TARGET STATE (Pending Iteration 70)]`**
- notes (optional)
- metadata (audit fields, e.g. createdAt)

---

### 4.2 Event Typing (CURRENT IMPLEMENTATION)

Events are implemented as a **fully discriminated union type system**:

- DomainEvent = union of typed events
- Event<T> generic base
- EventDataMap for payload typing
- strict mapping in EventMapper (domain ↔ persistence)

---

### 4.3 Event Types

#### Core lifecycle events (IMPLEMENTED)

- watering
- fertilization
- pruning
- harvest
- transplant
- treatment

---

#### Future agronomic/health events

- pest_detection
- disease_detection
- stress_signal
- recovery (Explicitly resolves and closes an active anomaly cycle, instructing the Reminders Engine to cancel any ongoing recurring treatments).

---

#### Future simulation events

- growth_update
- stage_transition

---

## 5. EVENT PAYLOAD (DATA FIELD)

The `data` field is strictly typed per event.

### watering

```ts
{
  amountLiters: PositiveNumber;
}
```

### fertilization

```ts
{
  fertilizerId: Uuid;
  fertilizerType: FertilizerType;
  method: FertilizationMethod;
  amount: PositiveNumber;
  concentration: PositiveNumber;
}
```

### pruning

```ts
{
  type: PruningType;
  intensity: PruningIntensity;
  plantId?: Uuid; // Optional if scope === 'bed' to target/filter a specific botanical variety in the bed; implicitly resolved if scope === 'instance'
}
```

### harvest

```ts
{
  yieldGrams: PositiveNumber;
  isFinal: boolean; // `[TARGET STATE]` true if this harvest terminates the plant instance's lifecycle (triggering 'harvested' state and freeing space), false for partial/successive harvests
  plantId?: Uuid; // Mandatory if scope === 'bed' to identify the harvested botanical variety; implicitly resolved if scope === 'instance'
}
```

### transplant

```ts
{
  fromBedId: Uuid;
  toBedId: Uuid;
}
```

### treatment

```ts
{
  target: TreatmentTarget;
  productId: Uuid;
  dosage: PositiveNumber;
}
```

---

### 5.1 Agronomic Reasoning for Bed-Scoped plantId Filtering `[TARGET STATE (Pending Iteration 71)]`

When logging events at the Bed container scope (`scope === 'bed'`), the presence of the `plantId` (botanical variety reference) is selectively allowed/required based on strict permacultural and agricultural principles:

1. **`harvest` (Allows `plantId`):**
   - **Reasoning:** In associated or polyculture beds (e.g., a "Milpa" polyculture of maize, beans, and squash), harvesting is a species-specific activity. A gardener harvests 2kg of Beans, not "2kg of generic Bed biomass". Allowing `plantId` enables aggregating yields of a specific crop species across the whole bed without the overhead of logging 50 individual plant-instance events.

2. **`pruning` (Allows `plantId`):**
   - **Reasoning:** Pruning is highly specific to a plant's biological needs. In a mixed bed (e.g., tomatoes companion-planted with basil), a gardener will prune suckers on the tomatoes, but not touch the basil. Specifying `plantId` allows logging "I pruned all the tomatoes in Bed 1" as a single convenient event while maintaining accurate botanical history.

3. **`watering` (No `plantId` allowed):**
   - **Reasoning:** Irrigation (drip, sprinkler, or rain) perculates into the shared soil matrix, affecting the entire container/bed ecosystem. If a gardener performs highly localized watering, it should be logged under `scope === 'instance'`. At the bed level, watering represents soil hydration, which is species-agnostic.

4. **`fertilization` (No `plantId` allowed):**
   - **Reasoning:** Soil fertilization (compost or granular slow-release) amends the shared sustratum of the bed, supplying nutrients to all co-habiting species. Foliar sprays or isolated targeted applications should be registered at the `instance` level. Therefore, fertilizing a Bed amends the entire bed container.

5. **`treatment` (No `plantId` allowed):**
   - **Reasoning:** Applying ecological treatments (e.g., spraying neem oil or garlic infusion against pests) at the bed level is assumed to cover the entire vegetative canopy of that growing zone to prevent pest or pathogen spread/spores from companion plants. Localized treatments (e.g., painting a wound) must be logged as `instance` events.

---

## 6. EVENT PRINCIPLES

### 6.1 Immutability

Once created, an event MUST NOT be modified.

### 6.2 Append-only log

Events form a chronological log per PlantInstance.

### 6.3 Determinism

Given the same event sequence, derived state MUST be reproducible.

### 6.4 Traceability

Every event MUST be traceable to:

- user (actor)
- PlantInstance
- Bed

---

### 6.5 Decoupled Event Bus & Practice Usecase (Kafka) `[TARGET STATE (Pending Iterations 47, 48 & 50)]`

To maintain clean architecture boundaries, cross-module notifications (such as notifying the reminders module when a plant is soft-deleted or an agricultural event is logged) are propagated using an asynchronous event-driven pub/sub architecture.

To prevent conflation between the Agricultural Event logs (this module) and the underlying messaging system:

- All asynchronous messaging, Event Bus ports, Kafka adapters, transactional Outbox guarantees, dynamic partitioning keys, and retry topics are defined centrally in:
  > See **Module: Distributed Event Bus (event-bus.md)**

---

## 7. EVENT INFRASTRUCTURE (CURRENT STATE)

### Implemented

- Strongly typed discriminated union (`DomainEvent`)
- Domain ↔ persistence mapper (`EventMapper`)
- Persistence document model (`EventDocument`)
- Value objects:
  - `Uuid`
  - `PositiveNumber`

- Domain factories (test mothers)
- Unit tests covering full mapping roundtrip

---

### Partial / evolving

- repository layer (not defined yet)
- query model for time-series access
- validation layer per event type (beyond TS + VO constraints)
- No dedicated event processing layer beyond persistence + mapping

---

### Missing / future

- EventRepository abstraction

---

## 8. RELATIONSHIPS

### 8.1 Event → PlantInstance

- Events are linked to PlantInstance via `plantInstanceId`
- Used for historical traceability
- PlantInstance is NOT derived from events in current architecture

### 8.2 Event → Bed

- Events reference Bed via `bedId`
- Bed acts as a contextual location reference for the event.
- **Crop Rotation Chronological Source `[TARGET STATE (Pending Iteration 77)]`:** The collection of cultivation events linked to a given Bed is used as the chronological log history to evaluate crop rotation heuristics. The system queries events recorded in the last 36 months to verify whether sequential family repetitions (e.g., planting Solanaceae repeatedly) have occurred, generating non-blocking soil-restorative rotation suggestions.

This means:
Events are tagged with where they happened, not that Bed has behavior here.

### 8.3 Event → Plant

- Indirect relationship through PlantInstance

### 8.4 Event → User

- Every event is attributable to a user (actor)

---

## 9. CURRENT IMPLEMENTATION STATUS

### Implemented (actual state)

- Fully typed event system (discriminated unions)
- strict EventMapper (domain ↔ persistence)
- persistence schema aligned with domain model
- value objects enforcing invariants
- test coverage for mapping correctness

---

### Partial

- event validation layer per type not formalize

---

### Missing

- repository abstraction
- Improve querying of event history (filters, ranges)
- Add aggregation helpers for analytics (optional)

---

## 10. RULES

- Events MUST be immutable
- Events MUST NOT contain business logic
- Events MUST NOT directly modify state
- Events MUST be append-only
- Events MUST reference PlantInstance and Bed
- Event payload MUST be type-safe per event type

---

## 11. BOUNDARY RULES (CRITICAL)

Events module:

- MUST NOT depend on API layer
- MUST NOT depend on UI layer
- MUST NOT depend on infrastructure specifics (DB engines, frameworks)
- MUST remain domain-level only
- MUST only expose domain contracts and types

---

## 12. RELATION TO OTHER MODULES

### Depends on

- PlantInstance module
- Bed module
- User module
- Shared kernel (Value Objects, Errors)

### Feeds into (future systems)

- State-Based Reminders Engine (treatment/fertilization events passively trigger explicit pending `Reminder` records in the application layer; editing (`PATCH`) a historical Event triggers automatic recalculation, shifting, or invalidation of associated pending Reminders in cascade)
- Simulation system
- Analytics system
- Recommendation engine
- Time-series query layer

---

## 13. FINAL NOTE

Events are what turn AgroApp from a CRUD system into a temporal model.

Without events: data
With events: time, causality, and simulation capability
