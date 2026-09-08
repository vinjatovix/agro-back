# MODULE: PERSISTENCE + PATCH SYSTEM CORE

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

This module defines the persistence model and update mechanics for AgroApp.

It is responsible for:

- translating domain primitives to persistence storage
- applying partial updates through a deterministic patch system
- maintaining consistency between stored state and domain model
- supporting structured query-based read operations (filter/sort/pagination DSL)
- translating **Query DSL → database queries (MongoDB)**

It MUST NOT contain business logic.

---

## 2. SCOPE

This module includes:

- MongoCrudRepository base abstraction (shared CRUD layer for aggregates)
- MongoRepository specialized base abstraction
- PlantRepository implementation
- BedRepository implementation
- PlantInstanceRepository implementation
- Patch/diff system
- DeepPartial update model
- DTO mapping layer
- persistence lifecycle handling
- **query translation layer (MongoQueryTranslator)**

---

## 3. CORE PRINCIPLE

Persistence is a projection of the domain state.

Rules:

- domain is source of truth
- persistence is derived state
- persistence MUST NOT modify business rules

---

## 4. PATCH MODEL

### 4.1 DeepPartial<T>

Used for partial updates.

#### Semantics

- `undefined` → no operation (field unchanged)
- `null` → explicit deletion (field removed)

#### Constraints

- must preserve type structure
- must not introduce unknown fields
- must not bypass domain validation

---

### 4.2 Diff / Patch Pipeline

#### Update flow

1. Current persisted state is loaded.
2. Explicit business method on the Aggregate Root is called (or patch is applied) to create the "next state" in memory.
3. Domain aggregate updates its own internal audit `metadata` (e.g., `updatedAt` and `updatedBy`) _in memory_ as part of the state transition.
4. Resulting state is validated against domain rules.
5. ONLY if validation passes -> persistence `updateWithDiff` is executed with the validated next state.
6. Persistence layer applies the deterministic diff between states.
7. **`[TARGET STATE (Pending Iteration 8)]`** The application use case immediately returns the in-memory aggregate, completely eliminating any redundant `findById` post-update reads.

---

### CRITICAL RULE: METADATA OWNERSHIP

The persistence layer (`updateWithDiff`, repositories, or DB-level triggers) MUST NOT dynamically alter or inject metadata values (like `updatedAt` or `updatedBy`) under the hood. All audit metadata is owned strictly by the Domain/Application layers and must be synchronized in memory before the persistence step.

---

### CRITICAL RULE

Domain validation MUST occur **before any persistence side effect**.

Persistence MUST ONLY receive a **validated final state transition**.

---

### NOTE

- Patch application is a **transformation step**, not a persistence action
- Diff calculation is **internal to persistence layer**, not part of domain flow
- The system MUST NOT persist unvalidated intermediate states

---

## 5. REPOSITORY CONTRACT

### 5.1 MongoCrudRepository

Shared abstraction for CRUD repositories across aggregates.

Used by:

- PlantRepository
- BedRepository

#### Responsibilities

- generic CRUD operations
- query normalization
- common Mongo access patterns
- eliminating duplicated repository logic between aggregates

#### Rules

- MUST NOT contain domain logic
- MUST remain aggregate-agnostic
- MUST operate only on primitives or DTOs
- MUST be extended, not bypassed, by concrete repositories

---

### 5.2 MongoRepository

Base abstraction for Mongo persistence.

Responsibilities:

- serialization/deserialization
- ensuring domain <-> persistence mapping integrity
- shared persistence utilities not covered by Crud layer

---

### 5.3 PlantRepository

Specialized repository for Plant aggregate.

Responsibilities:

- persistence of PlantPrimitives
- enforcing updateWithDiff contract
- ensuring id consistency
- uses MongoCrudRepository as base abstraction

---

### 5.4 BedRepository

Specialized repository for Bed aggregate.

Responsibilities:

- persistence of BedPrimitives
- CRUD operations via MongoCrudRepository
- ensuring spatial + identity consistency
- uses shared diff/patch pipeline

---

### 5.4.1 PlantInstanceRepository `[TARGET STATE (Pending Iteration 38)]`

Specialized repository for PlantInstance aggregate.

Responsibilities:

- persistence of PlantInstancePrimitives
- CRUD operations via MongoCrudRepository (standalone `plant_instances` collection)
- retrieving active plant instances associated with a specific `bedId`
- uses shared diff/patch pipeline

---

### 5.5 REPOSITORY RETRIEVAL SEMANTICS

#### 5.5.1 Retrieval Contract Principle `[TARGET STATE (Pending Iteration 5)]`

Repositories MAY return `null` or `undefined` when an entity does not exist in persistence.

Repositories MUST NOT interpret absence as a domain error.

Repositories MUST NOT throw domain-level exceptions (e.g. notFound, forbidden).

_Migration Note: In the current codebase, `MongoCrudRepository` (along with concrete implementations like `MongoFamilyRepository`) throws `DomainNotFoundException` directly when an entity is not found by ID or slug in `findById`. Refactoring repositories to return null and shifting exception-throwing logic entirely to application use cases is a target state slated for Iterations 5 & 6._

---

#### 5.5.2 Responsibility Boundary

| Layer       | Responsibility                                            |
| ----------- | --------------------------------------------------------- |
| Repository  | Data access only (no semantic interpretation)             |
| Application | Truth enforcement (notFound, forbidden, validation rules) |

---

#### 5.5.3 Truth Enforcement Rule

All semantic decisions regarding entity existence MUST be handled at the Application Layer:

- `notFound` errors
- `forbidden` access checks
- ownership validation
- authorization rules

---

#### 5.5.4 Repository Contract Clarity

Repositories are:

> data retrieval mechanisms, not domain interpreters

Therefore:

- `findById` = fetch attempt (nullable result allowed)
- NOT = guaranteed existence
- NOT = validation boundary

---

#### 5.5.5 Forbidden Behavior in Repositories

Repositories MUST NOT:

- throw `notFound` errors
- perform authorization checks
- infer intent from input
- transform absence into default domain objects
- validate business rules

---

#### 5.5.6 Design Rationale

This separation ensures:

- domain logic remains in application layer
- persistence stays deterministic and side-effect free
- testability of use cases is simplified
- repository implementations remain interchangeable

---

### 5.6 MAPPER RESPONSIBILITY RULE

#### 5.6.1 Core Rule

All transformations between persistence and domain MUST be handled by dedicated mapper modules.

Repositories MUST NOT contain transformation logic beyond delegation.

---

#### 5.6.2 Repository Responsibility

Repositories:

- MUST NOT transform MongoDocuments into domain logic structures
- MAY delegate transformation to mappers
- MUST operate on persistence documents and primitives only

---

#### 5.6.3 Mapper Responsibility

Mappers:

- are the ONLY layer allowed to transform:
  - MongoDocument → Domain
  - Domain → Primitives
  - DTO → Domain

- MUST be pure functions

- MUST NOT access persistence layer

- MUST NOT contain business logic

---

#### 5.6.4 Allowed Pattern

✔ correct:

```ts
return mapper.fromMongoDocumentToDomain(document);
```

---

#### 5.6.5 Forbidden Pattern

✘ incorrect:

```ts
return new Entity({ ...document, computed: x });
```

---

#### 5.6.6 Design Rationale

This rule ensures:

- repository simplicity and stability
- separation of transformation concerns
- prevention of hidden business logic in infrastructure
- consistent mapping strategy across aggregates

---

### 5.7 MIGRATIONS `[TARGET STATE (Pending Iteration 17)]`

#### 5.7.1 Purpose `[TARGET STATE (Pending Iteration 17)]`

Migrations are infrastructure lifecycle tools responsible for evolving the MongoDB schema over time.

They are NOT part of domain, application, or repository logic.

---

#### 5.7.2 Responsibilities

Migrations are responsible for:

- creating indexes (e.g. unique slug constraints)
- evolving collection structure
- backfilling data when necessary
- ensuring schema consistency across versions

---

#### 5.7.3 Execution Context

Migrations:

- run at application startup OR deployment phase
- are executed once per version
- MUST be idempotent or tracked via changelog collection

---

#### 5.7.4 Storage

Migration state is stored in:

- changelog collection

Each entry tracks:

- fileName
- appliedAt
- version block

---

#### 5.7.5 Critical Rule

Migrations MUST NOT:

- contain business logic
- depend on domain layer
- modify application behavior directly

---

#### 5.7.6 Schema Migration Boundary

- schema evolution is handled via migrations system
- migrations are executed at bootstrap phase
- persistence layer assumes schema is already up-to-date
- repositories MUST NOT trigger migrations

---

### 5.8 QUERY SYSTEM

#### 5.8.1 Purpose

Provides a generic query abstraction for repository read operations.

Includes:

- filtering (DSL-based operators)
- sorting
- pagination
- include (future)

---

#### 5.8.2 Query Model

Repositories accept a `QueryOptions<TFilter>` object.

This object MAY include:

- filter
- sort
- pagination
- include

---

#### 5.8.3 Filter Model (DSL)

**IMPORTANT: Query semantics are NOT defined in this module.**

This layer only TRANSLATES the Query DSL into database queries.

All filter/sort/pagination semantics are defined in:

> **Query DSL Contract v1.3.0**

Rules:

- filter operators are defined in Query DSL Contract v1.3.0
- sort semantics are defined in Query DSL Contract v1.3.0
- pagination semantics are defined in Query DSL Contract v1.3.0
- this module ONLY implements translation to MongoDB query operators

Supported translation targets:

- Equality → `$eq`
- String ops → regex / collation strategies
- Array ops → `$in`, `$all`
- Numeric ops → `$gt`, `$gte`, `$lt`, `$lte`

---

#### 5.8.4 Translation Layer

A `MongoQueryTranslator` is responsible for:

- converting Query DSL → MongoDB queries
- ensuring compatibility with Mongo operators
- normalizing CSV-based operators into arrays
- applying numeric coercion rules
- mapping DSL semantics to persistence-specific constructs

---

##### 5.8.4.1 Query Regex Sanitization `[TARGET STATE (Pending Iteration 11)]`

To secure the database against Regular Expression Injection vulnerabilities (ReDoS) and malicious filter bypasses on public endpoints, user-provided search parameters (like `contains`, `startsWith`, `endsWith`) MUST be sanitized.
The `MongoQueryTranslator` (and other query mappers like `FamilyQueryMapper`) MUST pass all raw string input used in regex operations through the `escapeRegex` utility prior to query compilation and execution.

---

#### 5.8.5 Defensive Behavior (CRITICAL)

Persistence layer MUST tolerate malformed or partial filter conditions.

Specifically:

- undefined conditions MUST be ignored
- empty filter objects MUST be ignored
- invalid operator combinations MUST NOT crash execution

This ensures robustness against imperfect upstream input.

---

#### 5.8.6 Responsibility Boundary

| Concern           | Layer                       |
| ----------------- | --------------------------- |
| Query semantics   | Query DSL Contract v1.3.0   |
| Query parsing     | API / Validation layer      |
| Query translation | Persistence layer           |
| Query execution   | Persistence layer (MongoDB) |

---

#### 5.8.7 Invalid Input Handling

Persistence layer MUST differentiate between:

- empty conditions (undefined, empty objects)
- invalid conditions (null values, malformed operators)

Rules:

- empty conditions MUST be ignored
- invalid conditions MUST NOT crash execution
- invalid conditions SHOULD be ignored or logged (non-blocking)

Persistence MUST NOT enforce validation rules.

---

#### 5.8.8 CQRS Read-Only Bypass `[TARGET STATE (Pending Iteration 18)]`

To optimize memory and CPU usage on search, list, and GET endpoints, the read pathway **is officially permitted to bypass full Domain aggregate hydration**.

- List/query repositories are permitted to return plain DTOs or primitives mapped directly from MongoDB documents.
- They are not required to instantiate domain Entities, Value Objects, or perform domain-level constructor validations during pure read operations.
- **Output DTO Validation**: While database-direct modifications are not expected, output validation schemas (Zod) in the API layer MUST be used to validate the response DTO contract, ensuring a robust safety net against data inconsistency with minimal performance friction.
- Dynamic fields and projected counts (e.g., counting plant instances inside a Bed) are resolved directly via MongoDB pipelines or mappers without domain aggregate overhead.
- This bypass is strictly prohibited for write operations (POST, PATCH, DELETE).

_(Note: For the architectural boundary enforcement rules governing this bypass, see **Module: Architecture Boundaries (architecture-boundaries.md) Sec. 7.1**)_

---

### 5.9 ACID TRANSACTIONS & CACHING INFRASTRUCTURE `[TARGET STATE (Pending Iterations 25 & 42)]`

#### 5.9.1 MongoDB ACID Multi-Document Transactions `[TARGET STATE (Pending Iterations 41 & 42)]`

To maintain strict data integrity across detached collections (e.g. creating a standalone `PlantInstance` while simultaneously incrementing the `version` on its associated `Bed` for Optimistic Concurrency Control):

- Concrete usecases MUST coordinate writes using **MongoDB ACID Transactions (`ClientSession`)**.
- The `MongoRepository` layer must support accepting and forwarding an optional `session` object to MongoDB driver write methods.
- Transactions are executed over the MongoDB Single-Node Replica Set configured for the local development docker-compose environment or MongoDB Atlas in production.
- If any operation fails or a version conflict occurs, the session is aborted, guaranteeing atomic rolls.

#### 5.9.1.1 Data Locality & Sharding Constraints (Future-Proofing) `[TARGET STATE]`

To prevent severe latency penalties and deadlocks caused by "Distributed Transactions" when the database scales horizontally across multiple nodes (Sharding):

- All cross-collection transactional workflows MUST be strictly isolated to a single Tenant (the User).
- **Shard Key Architecture:** All private, mutable collections that participate in ACID transactions together (`beds`, `plant_instances`, `events`, `reminders`, `seed_batches`) MUST include `userId` as the primary prefix of their Shard Key strategy.
- **Rationale:** By anchoring data to the `userId`, MongoDB guarantees that the entirety of a user's digital garden resides on the exact same physical shard (Data Locality). This ensures that any ACID transaction executed by a user is mathematically local to a single node, preserving ultra-low latency and preventing cluster-wide distributed locks.

#### 5.9.2 Redis Cache Infrastructure `[TARGET STATE (Pending Iteration 25)]`

To optimize external service integrations (such as Open-Meteo Weather or Geocoding APIs) and protect against API rate limits, database lookups, and high latency:

- The system defines a technology-agnostic `CacheRepository` port in the shared infrastructure/application layer.
- An adapter `RedisCacheRepository` implements this port using the official `redis` package.
- **Weather Cache Policy `[TARGET STATE]` (Multi-Tenant Optimization):** Weather forecasts MUST NEVER be cached using user-specific (`userId`) or bed-specific (`bedId`) keys, as this would trigger redundant API calls for thousands of neighboring users. Instead, weather records are cached using a **shared, normalized geospatial key** (e.g., a `GeoHash` of precision 4 or 5 covering a ~20km radius, or a concatenated `country:postalCode` string) with a **2-hour Time-To-Live (TTL)**. The first user in a region requesting the weather hydrates the cache, serving $O(1)$ responses to all other users in that region for the next two hours, drastically minimizing external API consumption.
- **User Location Cache Policy:** Resolved user-profile location configurations (`postalCode`, `country`, `timezone`, and `hemisphere`) are cached in Redis with a configurable, short Time-To-Live (TTL) to allow $O(1)$ in-memory resolution on subsequent crop placement or rendering requests, preventing database query bottlenecks on concurrent operations.
- **Resilient Fallback & Local Consistency Policy:** The caching service catches connection/unreachable errors on Redis and automatically falls back to an in-memory local JavaScript cache, ensuring the application remains functional even during Redis downtime. To minimize the risk of geographical data inconsistency across distributed instances during Redis downtime (e.g., if a user updates their hemisphere/location), the local in-memory fallback cache enforces a **very short TTL (e.g., 30 seconds)**, combined with **immediate programmatic cache invalidation** on the profile write/update path inside the same process instance.

---

## 6. SERIALIZATION CONTRACT

Domain objects MUST NOT be responsible for persistence serialization.

All transformations between:

- Domain → Persistence
- Persistence → Domain
- DTO → Domain

MUST be handled by dedicated mapper modules.

- **`[TARGET STATE (Pending Iteration 1)]` Separation of Persistence Primitives:** Under Clean Architecture, the domain layer must never depend on infrastructure or database models. This means primitive type structures currently residing inside `src/Contexts/shared/infrastructure/persistence/mongo/types/` (such as `MetadataPrimitives.ts`) are relocated to `src/Contexts/shared/domain/` (Iteration 1) to secure complete boundary purity.

---

### 6.1 Mapper responsibilities

Mappers MUST:

- be pure functions (no side effects)
- not contain business logic
- preserve domain invariants
- be deterministic

---

### 6.2 Example

Plant domain conversion is handled via:

- plantMapper.toPrimitives(plant)
- plantMapper.fromPrimitives(primitives)
- plantMapper.fromCreateDtoToDomain(dto)
- plantMapper.fromUpdateDtoToPrimitivesPatch(dto)

---

### 6.3 Forbidden patterns

- domain methods that serialize themselves
- persistence logic inside aggregates
- implicit mapping via frameworks

---

### 6.4 Event Mapping

Persistence layer includes **EventDocument ↔ DomainEvent mapping**.

#### Rules

- MUST use dedicated mapper (`EventMapper`)
- MUST NOT perform inline transformation in repositories
- MUST preserve discriminated union structure

---

#### EventDocument Contract

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

#### Critical Rule

Persistence MUST:

- store only primitives (string, number, ISO date)
- never store domain value objects
- never bypass mapper

---

## 7. INVARIANTS

### 7.1 Persistence invariants

- stored data MUST always be valid domain-compatible structure
- partial updates MUST NOT break structural integrity
- invalid updates MUST be rejected before persistence
- domain validation MUST run on fully reconstructed state AFTER patch

---

### 7.2 Patch invariants

- patch application is deterministic
- order of operations must not change result
- no implicit merges outside defined diff algorithm

---

## 8. CURRENT IMPLEMENTATION STATUS

### Implemented

- MongoCrudRepository abstraction
- MongoRepository abstraction
- PlantRepository implementation
- BedRepository implementation
- diffObjects + applyPatch system
- updateWithDiff pipeline
- PlantDtoMapper
- Query DSL + parser support (GenericQueryParser, QueryParserUtils)

---

### Partial

- strict typing of DeepPartial<T>
- elimination of unsafe casts in repository layer
- full consistency enforcement between DTO and domain

---

### Pending

- removal of all `as unknown` usage in persistence layer
- removal of `Record<string, unknown>` leakage
- formal contract enforcement for null vs undefined semantics
- stabilization of patch/diff boundary API
- unification of mapping strategy across all aggregates

---

## 9. ANTI-PATTERNS

The following are forbidden in this module:

- business logic inside repositories
- domain rules inside persistence layer
- direct mutation of domain objects
- untyped patch merges
- uncontrolled partial updates
- leaking HTTP or API concerns
- enforcing validation rules in query handling layer

---

## 10. EVOLUTION RULES

This module evolves under strict rules:

- patch system changes require explicit version bump
- query DSL changes require explicit version bump
- null/undefined semantics MUST NOT change silently
- repository contract changes MUST be backward compatible or versioned
- mapping rules MUST remain deterministic

---

## 11. RELATION TO DOMAIN

This module depends on:

- Domain Core v1.0.0

But:

- MUST NOT modify domain invariants
- MUST treat domain as immutable contract

---

## 12. FINAL NOTE

This module exists to isolate persistence complexity.

It enforces strict separation between:

- data access (repository)
- transformation (mapper)
- query translation (read model)
- business rules (application/domain)
