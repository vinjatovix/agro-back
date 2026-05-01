# MODULE: EVENTS SYSTEM

version: 1.1.0
source-spec: v1.0.0
status: evolving

---

# 1. PURPOSE

This module defines the event-driven layer of AgroApp.

It represents all time-based actions and state changes that occur in PlantInstances over time.

Events are the foundation for:

* lifecycle tracking
* historical analysis
* simulation
* future prediction

---

# 2. CORE CONCEPT

An Event is an immutable record of something that happened in the system.

Events are:

* append-only
* time-based
* contextual
* linked to PlantInstances and Beds

---

# 3. DOMAIN ROLE

Events are NOT:

* business logic executors
* state mutators
* computation engines

Events ARE:

* history records
* inputs for derived state systems
* simulation primitives
* audit trail foundation

---

# 4. EVENT MODEL

## 4.1 Base Event Structure

Each event includes:

* id (UUID value object)
* userId (UUID)
* plantInstanceId (UUID)
* bedId (UUID)
* type (discriminated union)
* date
* data (type-specific payload)
* notes (optional)
* metadata (audit fields, e.g. createdAt)

---

## 4.2 Event Typing (CURRENT IMPLEMENTATION)

Events are implemented as a **fully discriminated union type system**:

* DomainEvent = union of typed events
* Event<T> generic base
* EventDataMap for payload typing
* strict mapping in EventMapper (domain ↔ persistence)

---

## 4.3 Event Types

### Core lifecycle events (IMPLEMENTED)

* watering
* fertilization
* pruning
* harvest
* transplant
* treatment

---

### Future agronomic/health events

* pest_detection
* disease_detection
* stress_signal
* recovery

---

### Future simulation events

* growth_update
* stage_transition

---

# 5. EVENT PAYLOAD (DATA FIELD)

The `data` field is strictly typed per event.

## watering

```ts
{
  amountLiters: PositiveNumber
}
```

## fertilization

```ts
{
  fertilizerId: Uuid
  fertilizerType: FertilizerType
  method: FertilizationMethod
  amount: PositiveNumber
  concentration: PositiveNumber
}
```

## pruning

```ts
{
  type: PruningType
  intensity: PruningIntensity
}
```

## harvest

```ts
{
  yieldGrams: PositiveNumber
}
```

## transplant

```ts
{
  fromBedId: Uuid
  toBedId: Uuid
}
```

## treatment

```ts
{
  target: TreatmentTarget
  productId: Uuid
  dosage: PositiveNumber
}
```

---

# 6. EVENT PRINCIPLES

## 6.1 Immutability

Once created, an event MUST NOT be modified.

## 6.2 Append-only log

Events form a chronological log per PlantInstance.

## 6.3 Determinism

Given the same event sequence, derived state MUST be reproducible.

## 6.4 Traceability

Every event MUST be traceable to:

* user (actor)
* PlantInstance
* Bed

---

# 7. EVENT INFRASTRUCTURE (CURRENT STATE)

## Implemented

* Strongly typed discriminated union (`DomainEvent`)
* Domain ↔ persistence mapper (`EventMapper`)
* Persistence document model (`EventDocument`)
* Value objects:

  * `Uuid`
  * `PositiveNumber`
* Domain factories (test mothers)
* Unit tests covering full mapping roundtrip

---

## Partial / evolving

* repository layer (not defined yet)
* query model for time-series access
* validation layer per event type (beyond TS + VO constraints)
* No dedicated event processing layer beyond persistence + mapping

---

## Missing / future

* EventRepository abstraction

---

# 8. RELATIONSHIPS

## 8.1 Event → PlantInstance

* Events are linked to PlantInstance via `plantInstanceId`
* Used for historical traceability
* PlantInstance is NOT derived from events in current architecture

## 8.2 Event → Bed

* Events reference Bed via `bedId`
* Bed acts as a contextual location reference for the event

This means:
Events are tagged with where they happened, not that Bed has behavior here.

## 8.3 Event → Plant

* Indirect relationship through PlantInstance

## 8.4 ### Event → User

* Every event is attributable to a user (actor)

---

# 9. CURRENT IMPLEMENTATION STATUS

## Implemented (actual state)

* Fully typed event system (discriminated unions)
* strict EventMapper (domain ↔ persistence)
* persistence schema aligned with domain model
* value objects enforcing invariants
* test coverage for mapping correctness

---

## Partial

* event validation layer per type not formalize

---

## Missing

* repository abstraction
* Improve querying of event history (filters, ranges)
* Add aggregation helpers for analytics (optional)


---

# 10. RULES

* Events MUST be immutable
* Events MUST NOT contain business logic
* Events MUST NOT directly modify state
* Events MUST be append-only
* Events MUST reference PlantInstance and Bed
* Event payload MUST be type-safe per event type

---

# 12. BOUNDARY RULES (CRITICAL)

Events module:

* MUST NOT depend on API layer
* MUST NOT depend on UI layer
* MUST NOT depend on infrastructure specifics (DB engines, frameworks)
* MUST remain domain-level only
* MUST only expose domain contracts and types

---

# 13. RELATION TO OTHER MODULES

## Depends on

* PlantInstance module
* Bed module
* User module
* Shared kernel (Value Objects, Errors)

## Feeds into (future systems)

* Simulation system
* Analytics system
* Recommendation engine
* Time-series query layer

---

# 14. FINAL NOTE

Events are what turn AgroApp from a CRUD system into a temporal model.

Without events: data
With events: time, causality, and simulation capability
