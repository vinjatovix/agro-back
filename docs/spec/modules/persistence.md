# MODULE: PERSISTENCE + PATCH SYSTEM CORE

version: 1.1.0
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

- MongoCrudRepository base abstraction (shared CRUD layer for aggregates)
- MongoRepository specialized base abstraction
- PlantRepository implementation
- BedRepository implementation
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

## 4.2 Diff / Patch Pipeline

### Update flow

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

## 5.1 MongoCrudRepository (NEW)

Shared abstraction for CRUD repositories across aggregates.

Used by:

- PlantRepository
- BedRepository

### Responsibilities

- generic CRUD operations
- query normalization
- common Mongo access patterns
- eliminating duplicated repository logic between aggregates

### Rules

- MUST NOT contain domain logic
- MUST remain aggregate-agnostic
- MUST operate only on primitives or DTOs
- MUST be extended, not bypassed, by concrete repositories

---

## 5.2 MongoRepository

Base abstraction for Mongo persistence.

Responsibilities:

- serialization/deserialization
- ensuring domain <-> persistence mapping integrity
- shared persistence utilities not covered by Crud layer

---

## 5.3 PlantRepository

Specialized repository for Plant aggregate.

Responsibilities:

- persistence of PlantPrimitives
- enforcing updateWithDiff contract
- ensuring id consistency
- uses MongoCrudRepository as base abstraction

---

## 5.4 BedRepository

Specialized repository for Bed aggregate.

Responsibilities:

- persistence of BedPrimitives
- CRUD operations via MongoCrudRepository
- ensuring spatial + identity consistency
- uses shared diff/patch pipeline

---

## 5.5 REPOSITORY RETRIEVAL SEMANTICS (NEW)

### 5.5.1 Retrieval Contract Principle

Repositories MAY return `null` or `undefined` when an entity does not exist in persistence.

Repositories MUST NOT interpret absence as a domain error.

Repositories MUST NOT throw domain-level exceptions (e.g. notFound, forbidden).

---

### 5.5.2 Responsibility Boundary

| Layer       | Responsibility                                            |
| ----------- | --------------------------------------------------------- |
| Repository  | Data access only (no semantic interpretation)             |
| Application | Truth enforcement (notFound, forbidden, validation rules) |

---

### 5.5.3 Truth Enforcement Rule

All semantic decisions regarding entity existence MUST be handled at the Application Layer:

- `notFound` errors
- `forbidden` access checks
- ownership validation
- authorization rules

---

### 5.5.4 Repository Contract Clarity

Repositories are:

> data retrieval mechanisms, not domain interpreters

Therefore:

- `findById` = fetch attempt (nullable result allowed)
- NOT = guaranteed existence
- NOT = validation boundary

---

### 5.5.5 Forbidden Behavior in Repositories

Repositories MUST NOT:

- throw `notFound` errors
- perform authorization checks
- infer intent from input
- transform absence into default domain objects
- validate business rules

---

### 5.5.6 Design Rationale

This separation ensures:

- domain logic remains in application layer
- persistence stays deterministic and side-effect free
- testability of use cases is simplified
- repository implementations remain interchangeable

---

# 5.7 MAPPER RESPONSIBILITY RULE (NEW)

## 5.7.1 Core Rule

All transformations between persistence and domain MUST be handled by dedicated mapper modules.

Repositories MUST NOT contain transformation logic beyond delegation.

---

## 5.7.2 Repository Responsibility

Repositories:

- MUST NOT transform MongoDocuments into domain logic structures
- MAY delegate transformation to mappers
- MUST operate on persistence documents and primitives only

---

## 5.7.3 Mapper Responsibility

Mappers:

- are the ONLY layer allowed to transform:
  - MongoDocument → Domain
  - Domain → Primitives
  - DTO → Domain

- MUST be pure functions
- MUST NOT access persistence layer
- MUST NOT contain business logic

---

## 5.7.4 Allowed Pattern

✔ correct:

```ts
return mapper.fromMongoDocumentToDomain(document);
```

---

## 5.7.5 Forbidden Pattern

✘ incorrect:

```ts
return new Entity({ ...document, computed: x });
```

---

## 5.7.6 Design Rationale

This rule ensures:

- repository simplicity and stability
- separation of transformation concerns
- prevention of hidden business logic in infrastructure
- consistent mapping strategy across aggregates

---

# 5.8 MIGRATIONS (NEW)

## 5.8.1 Purpose

Migrations are infrastructure lifecycle tools responsible for evolving the MongoDB schema over time.

They are NOT part of domain, application, or repository logic.

---

## 5.8.2 Responsibilities

Migrations are responsible for:

- creating indexes (e.g. unique slug constraints)
- evolving collection structure
- backfilling data when necessary
- ensuring schema consistency across versions

---

## 5.8.3 Execution Context

Migrations:

- run at application startup OR deployment phase
- are executed once per version
- MUST be idempotent or tracked via changelog collection

---

## 5.8.4 Storage

Migration state is stored in:

- changelog collection

Each entry tracks:

- fileName
- appliedAt
- version block

---

## 5.8.5 Critical Rule

Migrations MUST NOT:

- contain business logic
- depend on domain layer
- modify application behavior directly

---

## 5.9 SCHEMA MIGRATION BOUNDARY

- schema evolution is handled via migrations system
- migrations are executed at bootstrap phase
- persistence layer assumes schema is already up-to-date
- repositories MUST NOT trigger migrations

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

Persistence layer includes **EventDocument ↔ DomainEvent mapping**.

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

- MongoCrudRepository abstraction
- MongoRepository abstraction
- PlantRepository implementation
- BedRepository implementation
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
- null/undefined semantics MUST NOT change silently
- repository contract changes MUST be backward compatible or versioned
- mapping rules MUST remain deterministic

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

It enforces strict separation between:

- data access (repository)
- transformation (mapper)
- business rules (application/domain)
