# MODULE: EVENTS SYSTEM

version: 1.0.0
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
* state mutators directly
* computation engines

Events ARE:

* history records
* triggers for derived state
* inputs for simulation systems

---

# 4. EVENT MODEL

## 4.1 Base Event Structure

Each event includes:

* id
* userId
* plantInstanceId
* bedId
* type
* date
* data (payload)
* notes
* metadata (audit fields)

---

## 4.2 Event Types

### Core lifecycle events

* watering
* fertilization
* pruning
* harvest
* transplant
* planting
* removal

---

### Health & environment events (future)

* pest_detection
* disease_detection
* stress_signal
* recovery

---

### Growth simulation events (future)

* growth_update
* stage_transition

---

# 5. EVENT PRINCIPLES

## 5.1 Immutability

Once created, an event MUST NOT be modified.

---

## 5.2 Append-only log

Events form a chronological log per PlantInstance.

---

## 5.3 Determinism

Given the same event sequence, derived state MUST be reproducible.

---

## 5.4 Traceability

Every event MUST be traceable to:

* user (actor)
* PlantInstance
* Bed

---

# 6. RELATIONSHIPS

## 6.1 Event → PlantInstance

* Events belong to PlantInstances
* PlantInstance state is derived from event history (future evolution)

---

## 6.2 Event → Bed

* Events are spatially contextualized
* Bed defines environmental context

---

## 6.3 Event → Plant

* Indirect relationship through PlantInstance

---

## 7. EVENT PAYLOAD (DATA FIELD)

The `data` field is type-specific.

Examples:

### watering

```json
{
  "amountLiters": 2
}
```

---

### fertilization

```json
{
  "fertilizerId": "fert_compost",
  "amount": "moderate"
}
```

---

### pest detection (future)

```json
{
  "pestId": "pest_aphids",
  "severity": "medium"
}
```

---

# 8. CURRENT IMPLEMENTATION STATUS

## Implemented

* Event schema defined
* basic persistence structure
* linkage to PlantInstance and Bed
* metadata tracking

---

## Partial

* event type system not strongly typed
* no validation per event type
* no event aggregation layer
* no query model optimized for time-series

---

## Pending

* EventRepository
* typed event system (discriminated unions)
* event validation per type
* event replay system (state reconstruction)
* derived state computation for PlantInstances

---

# 9. FUTURE EVOLUTION

## 9.1 Event sourcing layer

Events will become the source of truth for:

* PlantInstance state reconstruction
* analytics
* simulation

---

## 9.2 Derived state system

Future capability:

* PlantInstance state computed from events
* no manual state mutation
* fully event-driven lifecycle

---

## 9.3 Simulation engine

Events will feed:

* growth prediction
* yield estimation
* health forecasting

---

# 10. RULES

* Events MUST be immutable
* Events MUST NOT contain business logic
* Events MUST NOT directly modify state
* Events MUST be append-only
* Events MUST reference PlantInstance and Bed

---

# 11. BOUNDARY RULES

Events module:

* MUST NOT depend on API layer
* MUST NOT depend on UI
* MUST NOT depend on spatial implementation
* MUST remain domain-level

---

# 12. RELATION TO OTHER MODULES

Depends on:

* PlantInstance module
* Bed module
* User module

Will feed into:

* Simulation system (future)
* Analytics system (future)
* Recommendation engine (future)

---

# 13. FINAL NOTE

Events are what turn AgroApp from a CRUD system into a living model.

Without events, you have data.

With events, you have time.
