# MODULE: PERSISTENCE + PATCH SYSTEM CORE

version: 1.0.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

This module defines the persistence model and update mechanics for AgroApp.

It is responsible for:

- translating domain primitives to persistence storage
- applying partial updates through a deterministic patch system
- maintaining consistency between stored state and domain model

It MUST NOT contain business logic.

---

# 2. SCOPE

This module includes:

- MongoRepository base abstraction
- PlantRepository implementation
- Patch/diff system
- DeepPartial update model
- DTO mapping layer
- persistence lifecycle handling

---

# 3. CORE PRINCIPLE

Persistence is a projection of the domain state.

Rules:

- domain is source of truth
- persistence is derived state
- persistence MUST NOT modify business rules

---

# 4. PATCH MODEL

## 4.1 DeepPartial<T>

Used for partial updates.

### Semantics

- `undefined` → no operation (field unchanged)
- `null` → explicit deletion (field removed)

### Constraints

- must preserve type structure
- must not introduce unknown fields
- must not bypass domain validation

---

Sí, ahora mismo está confuso porque mezcla pasos duplicados y da a entender dos pipelines distintos.

Te lo dejo corregido **mínimo y coherente con tu código real**:

---

# 4.2 Diff / Patch Pipeline

## Update flow

1. current persisted state is loaded
2. patch is applied to create "next state"
3. resulting state is validated against domain rules
4. ONLY if validation passes → persistence update is executed
5. persistence layer applies deterministic diff between states

---

## CRITICAL RULE

Domain validation MUST occur **before any persistence side effect**.

Persistence MUST ONLY receive a **validated final state transition**.

---

## NOTE

- Patch application is a **transformation step**, not a persistence action
- Diff calculation is **internal to persistence layer**, not part of domain flow
- The system MUST NOT persist unvalidated intermediate states

---

# 5. REPOSITORY CONTRACT

## 5.1 MongoRepository

Base abstraction for Mongo persistence.

Responsibilities:

- CRUD operations
- serialization/deserialization
- ensuring domain <-> persistence mapping integrity

---

## 5.2 PlantRepository

Specialized repository for Plant aggregate.

Responsibilities:

- persistence of PlantPrimitives
- enforcing updateWithDiff contract
- ensuring id consistency

---

# 6. SERIALIZATION CONTRACT

Domain objects MUST NOT be responsible for persistence serialization.

All transformations between:

- Domain → Persistence
- Persistence → Domain
- DTO → Domain

MUST be handled by dedicated mapper modules.

---

## 6.1 Mapper responsibilities

Mappers MUST:

- be pure functions (no side effects)
- not contain business logic
- preserve domain invariants
- be deterministic

---

## 6.2 Example

Plant domain conversion is handled via:

- plantMapper.toPrimitives(plant)
- plantMapper.fromPrimitives(primitives)
- plantMapper.fromCreateDtoToDomain(dto)
- plantMapper.fromUpdateDtoToPrimitivesPatch(dto)

---

## 6.3 Forbidden patterns

- domain methods that serialize themselves
- persistence logic inside aggregates
- implicit mapping via frameworks

---

## 6.4 Event Mapping

Persistence layer now includes **EventDocument ↔ DomainEvent mapping**.

### Rules

- MUST use dedicated mapper (`EventMapper`)
- MUST NOT perform inline transformation in repositories
- MUST preserve discriminated union structure

---

### EventDocument Contract

Persistence defines a **typed union**:

```ts
type EventDocument =
  | WateringEventDocument
  | FertilizationEventDocument
  | PruningEventDocument
  | HarvestEventDocument
  | TransplantEventDocument
  | TreatmentEventDocument;
```

---

### Critical Rule

Persistence MUST:

- store only primitives (string, number, ISO date)
- never store domain value objects
- never bypass mapper

---

# 7. INVARIANTS

## 7.1 Persistence invariants

- stored data MUST always be valid domain-compatible structure
- partial updates MUST NOT break structural integrity
- invalid updates MUST be rejected before persistence
- domain validation MUST run on fully reconstructed state AFTER patch

---

## 7.2 Patch invariants

- patch application is deterministic
- order of operations must not change result
- no implicit merges outside defined diff algorithm

---

# 8. CURRENT IMPLEMENTATION STATUS

## Implemented

- MongoRepository abstraction
- PlantRepository implementation
- diffObjects + applyPatch system
- updateWithDiff pipeline
- PlantDtoMapper

---

## Partial

- strict typing of DeepPartial<T>
- elimination of unsafe casts in repository layer
- full consistency enforcement between DTO and domain

---

## Pending

- removal of all `as unknown` usage in persistence layer
- removal of `Record<string, unknown>` leakage
- formal contract enforcement for null vs undefined semantics
- stabilization of patch/diff boundary API
- unification of mapping strategy across all aggregates

---

# 9. ANTI-PATTERNS

The following are forbidden in this module:

- business logic inside repositories
- domain rules inside persistence layer
- direct mutation of domain objects
- untyped patch merges
- uncontrolled partial updates
- leaking HTTP or API concerns

---

# 10. EVOLUTION RULES

This module evolves under strict rules:

- patch system changes require explicit version bump
- semantics of null/undefined MUST NOT change silently
- repository contract changes must be backward compatible or versioned
- mapping rules must remain deterministic

---

# 11. RELATION TO DOMAIN

This module depends on:

- Domain Core v1.0.0

But:

- MUST NOT modify domain invariants
- MUST treat domain as immutable contract

---

# 12. FINAL NOTE

This module exists to isolate persistence complexity.

It is intentionally strict to prevent:

- implicit state corruption
- uncontrolled partial updates
- domain leakage into infrastructure
