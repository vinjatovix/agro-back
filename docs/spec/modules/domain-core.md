# MODULE: DOMAIN CORE

version: 1.4.0
source-spec: v1.4.0
status: stable

---

## 1. PURPOSE

Defines the core business entities of AgroApp.

This module is the root of all domain logic.

---

## 2. ENTITIES

### 2.1 Plant

Definition-only aggregate.

- identity
- traits
- phenology
- knowledge (optional reference)

Invariant rules:

- ranges valid (min ≤ max)
- months [1..12]
- UUID identity

---

### 2.2 PlantInstance

Runtime representation of a Plant in a Bed.

Responsibilities:

- spatial position
- lifecycle state
- link to Plant definition

---

### 2.3 Bed

Spatial container for PlantInstances.

Responsibilities:

- grid anchor
- spatial constraints
- grouping context

---

### 2.4 User

System actor.

Roles:

- admin
- collaborator
- user

**`[TARGET STATE (Pending [Iteration 29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate))]`** Geographic Configuration (Optional, used for climate/seasonality resolution and local time scheduling):

- `postalCode`
- `country`
- `hemisphere` (north | south, defaults to north)
- `timezone` (IANA format string, defaults to UTC)

Responsible for:

- ownership
- permissions
- geographical context fallback for agriculture systems
- audit trail

---

## 3. VALUE OBJECTS & BRANDED TYPES

- **Functional Branded Types (Completed):**
  - To prevent "Primitive Obsession" and structural type blindness, all identity fields (such as `PlantId`, `BedId`, `UserId`, `FamilyId`, `PlantInstanceId`, `EventId`, `FertilizerId`, `ProductId`) are modeled as **Functional Branded Types** (TypeScript intersection types) rather than instances of a generic class or raw strings:
    ```typescript
    export type Brand<K, T> = K & { readonly __brand: T };
    export type PlantId = Brand<string, 'PlantId'>;
    ```
  - **Type Safety**: The compiler prevents passing a `BedId` where a `PlantId` is expected.
  - **Performance & Serialization**: At runtime, these are plain native strings, resulting in zero allocation overhead, simplified mapping, and effortless API serialization without requiring `.value` destructuring or `.toPrimitives()` mapping.
  - **Comparison**: Simple string equality checks (`idA === idB`) are used instead of method calls like `.equals()`.

- **UUIDv7 Standardization (Completed):**
  - To optimize database write performance (B-Tree append-only inserts) and natively support perfect chronological cursor pagination, identity generator utilities (`createIdGenerator<T>(entityName)`) exclusively generate **UUIDv7** when invoking `.random()`.
  - **Backward Compatibility:** The validation schemas (Zod) and generator parsing functions (`.create(value)` via `UuidValidator.isValid()`) continue to accept any valid UUID format (including legacy UUIDv4). This guarantees absolute backward compatibility with pre-seeded entities (`Plants`, `Families`) already existing in development and production databases, requiring zero data migration.

- BrandedId (`Brand<string, Tag>`, `createIdGenerator`, `UuidValidator`)
- StringValueObject
- DateValueObject
- PositiveNumber
- Email
- Coordinates
- Range
- MonthSet
- Metadata

Rules:

- immutable
- self-validating
- no infrastructure dependency
- **Primitives Relocation (Completed):** To completely purge database-specific structures from the core model, primitive types and helpers (such as `MetadataPrimitives.ts`) reside inside `src/Contexts/shared/domain/`, ensuring zero outward dependency violations from the pure domain core.

---

## 4. SERIALIZATION RULE

Domain entities MUST NOT implement serialization methods.

All transformations:

- Domain → Primitives
- Primitives → Domain
- DTO → Domain

MUST be handled by dedicated mapper modules.

IMPORTANT:

- NO business logic inside primitives
- NO persistence logic

---

## 5. DOMAIN INVARIANTS

- no invalid state allowed at construction time
- range consistency enforced
- identity always validated

---

### 5.1 DOMAIN EXCEPTIONS

Business rule and constraint validation failures throw pure, technology-agnostic exceptions.

Hierarchy:

- `DomainException` (abstract base, supports field-specific error dictionaries)
  - `InvalidArgumentException` (validation / format violations)
  - `DomainNotFoundException` (query / entity absence)
  - `DomainConflictException` (state mutation / business invariant violations, e.g. deleting a bed that has plants)
  - `DomainStaleVersionException` (optimistic concurrency: the aggregate `version` differs from the one the caller read; mapped to HTTP `412`). It does not extend `DomainConflictException`, so stale versions and business conflicts never share a status code
  - `DomainUnauthorizedException` (access control rules / authentication failure)
  - `DomainForbiddenException` (authorization / ownership restriction rules)

The domain throws these exceptions directly by instantiating them using the standard `new` operator.

---

### 5.2 DOMAIN MUTATIONS & METADATA OWNERSHIP ([Iterations 7](../../roadmap.md#iteration-7-encapsulate-state-mutations-in-aggregates) & [8](../../roadmap.md#iteration-8-implement-in-memory-audit-metadata) done)

Aggregates MUST NOT be anemic. All state modifications (such as updating plant properties or resizing a bed) MUST be handled by explicit, business-oriented methods on the Aggregate Root itself (e.g., `bed.rename(name, user)`, `plant.updateTraits(changes, user)`).

Furthermore, the Domain is the sole owner of audit metadata:

- Every business method mutating aggregate state receives the acting user's username as its last argument and updates its own `metadata.updatedAt` timestamp and `metadata.updatedBy` username _in memory_ with `Metadata.update(previous, user, at?)`, which keeps `createdAt`/`createdBy`.
- Mutation methods take an optional `at: Date` after the user. A use case that calls several of them for one request (`UpdateBed`, `UpdatePlant`) creates one `at` and passes it to all of them, so the request leaves a single `updatedAt`.
- Aggregate state is immutable: every change replaces the frozen props object (`Bed` and `Family` with `Object.freeze`, `Plant` with `deepFreeze`) instead of mutating it.
- **Audit only on real change**: a method refreshes audit data only when the section of state it owns really changed. "Changed" is decided with `hasStateChanged(before, after)` (`src/shared/domain/diff/`), built on the same `diffObjects` that storage uses, so the aggregate and storage always agree on what a no-op is. A same-value call leaves the aggregate untouched (same `Metadata` instance, no new timestamp).
- **Plain snapshots only**: `hasStateChanged` receives primitives (`toPrimitives()`, `.value` or a snapshot), never value objects. `diffObjects` only sees own enumerable keys, so data held in a `Set` (`MonthSet`), a `Map` or a private field (`PlantLifecycle`) would read as unchanged and the change would be silently lost. It checks this at runtime and throws `createError.internal` (500) on any non-plain object (`Date` and arrays are allowed), including one whose prototype has no `constructor`, so a wrong call fails in the unit tests of the mutation method. A compile-time guard (a recursive plain-data parameter type that class instances cannot satisfy) was considered and not adopted: it would move the failure from unit tests to compilation, but requires every snapshot type to be a plain-data type (`RangePrimitives` and `IdentityPrimitives` are `interface`s, and the `Family`/`Plant` snapshots return `UnknownRecord`).
- Methods stay atomic: if they throw, nothing changes, including metadata. Soft delete uses one timestamp for `deletedAt` and `updatedAt`.
- `syncVersion(outcome: WriteOutcome)` applies what storage reported after `updateWithDiff`: `'written'` advances the version by one, `'unchanged'` keeps it (`versionAfter`, `src/Contexts/shared/domain/repositories/WriteOutcome.ts`). Storage never returns a version number, so an impossible version cannot reach the aggregate and there is nothing to validate at runtime. It is not a mutation method and never touches metadata.
- This ensures that the mutated aggregate returned by the application layer directly from memory (without a read-after-write `findById`) has an accurate audit trail and version, equal to what a later `GET` returns.

---

## 6. BOUNDARY RULES

Domain MUST NOT depend on:

- HTTP
- DB
- validation libraries
- frameworks
- query DSL or filter/parser utilities

---

## 7. RELATIONSHIP RULES

- PlantInstance depends on Plant
- Bed contains PlantInstances
- User is global root actor

---

## 8. QUERY INTEGRATION BOUNDARY

The domain layer defines **no query implementation logic**, but MAY expose **query intent types** for read models.

### 8.1 Allowed concept

Domain MAY define:

- filter intent types (e.g. PlantFilterCriteria)
- sort intent enums (domain-level meaning only)

These are:

> semantic contracts, not execution logic

---

### 8.2 Forbidden in Domain

Domain MUST NOT contain:

- filter parsing logic
- CSV parsing
- query string interpretation
- pagination logic
- sorting implementation
- Mongo/SQL translation

---

### 8.3 Responsibility Split

| Concern           | Layer                          |
| ----------------- | ------------------------------ |
| Query parsing     | API / Validation               |
| Query translation | Persistence                    |
| Query execution   | Persistence                    |
| Query semantics   | Domain (optional intent types) |

---

### 8.4 Rationale

This prevents:

- leakage of HTTP query format into domain
- coupling to persistence DSL
- accidental business logic in query parsing layer

---

## 9. FINAL RULE

The Domain Core is:

> a pure, stable, persistence-agnostic model of AgroApp reality

It MUST remain unaffected by:

- transport changes
- Query DSL evolution
- storage strategy changes
