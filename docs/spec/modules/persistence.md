# MODULE: PERSISTENCE + DIFF SYSTEM CORE

version: 1.4.0
source-spec: v1.4.0
status: stable

---

## 1. PURPOSE

This module defines the persistence model and update mechanics for AgroApp.

It is responsible for:

- translating domain primitives to persistence storage
- computing and applying the deterministic full-state diff between aggregate states
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
- Full-state diff system (`diffObjects` / `updateWithDiff`)
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

## 4. DIFF MODEL

### 4.1 Full-State Contract

`updateWithDiff(current, updated, username)` receives **two complete domain-mapper outputs** — the primitives of the same aggregate before and after the mutation method ran. It MUST NOT receive a partial object or a patch fragment.

#### Diff semantics

| Field in `current` | Field in `updated` | Action                         |
| ------------------ | ------------------ | ------------------------------ |
| any value          | same value         | `noop` (no write, no `$unset`) |
| any value          | different value    | `$set`                         |
| present            | absent             | `$unset`                       |
| absent             | absent             | `noop`                         |
| absent             | present            | `$set`                         |
| `null` or absent   | `null` or absent   | `noop` (no `$unset`)           |

Nested objects are compared key by key. Lists are compared by value (serialized content, including element order) and, when different, replaced entirely with `$set`: the before and after states hold different list instances, so comparing by reference would turn every update into a write. `Date` values are compared by `getTime()`.

An empty diff (no `$set`, no `$unset`) skips the write entirely and does not bump `version`.

#### Constraints

- both arguments must be produced by the same domain mapper (`toPrimitives` before/after the mutation)
- a field absent from `updated` is treated as a deletion — never pass a partial object
- validation must occur before calling `updateWithDiff`

---

### 4.2 Diff Pipeline

#### Update flow

1. Current persisted state is loaded.
2. Explicit business method on the Aggregate Root is called to create the "next state" in memory; it validates and applies all changes atomically.
3. Domain aggregate updates its own internal audit `metadata` (e.g., `updatedAt` and `updatedBy`) _in memory_ as part of the state transition.
4. Resulting state is validated against domain rules.
5. ONLY if validation passes -> persistence `updateWithDiff` is executed with the validated next state.
6. Persistence layer applies the deterministic diff between states.
7. **`[TARGET STATE (Pending [Iteration 8](../../roadmap.md#iteration-8-implement-in-memory-audit-metadata))]`** The application use case immediately returns the in-memory aggregate, completely eliminating any redundant `findById` post-update reads.

---

### CRITICAL RULE: METADATA OWNERSHIP

The persistence layer (`updateWithDiff`, repositories, or DB-level triggers) MUST NOT dynamically alter or inject metadata values (like `updatedAt` or `updatedBy`) under the hood. All audit metadata is owned strictly by the Domain/Application layers and must be synchronized in memory before the persistence step.

---

### CRITICAL RULE

Domain validation MUST occur **before any persistence side effect**.

Persistence MUST ONLY receive a **validated final state transition**.

---

### NOTE

- Aggregate mutation methods are the **transformation step**, not a persistence action
- Diff calculation is **internal to persistence layer**, not part of domain flow
- The system MUST NOT persist unvalidated intermediate states
- `Date` values are compared as scalars (by `getTime()`) and replaced as a whole; they are never walked as nested objects
- Primitives SHOULD represent dates as ISO strings (e.g. `deletedAt`), matching the persisted document shape

---

### 4.3 Optimistic Concurrency Control (OCC)

All aggregates persisted through `MongoCrudRepository` (Bed, Plant, Family) carry an integer `version` (starts at `0`) in their props, primitives and Mongo documents. Entities apply the `0` default at construction, so the getter never has to.

#### Client-supplied version

The client states the version it is modifying; the server never assumes it.

1. Every single-resource response (`GET`, `POST`, `PATCH` of one bed, plant or family) carries a strong `ETag: "<version>"`, always equal to the body's `version`. Lists, `204` and error responses carry no `ETag` (Express's automatic `ETag` is disabled). CORS exposes `ETag` to allowed origins.
2. `PATCH /beds/{id}`, `PATCH /plants/{id}`, `PATCH /families/{idOrSlug}`, `DELETE /beds/{id}` and `DELETE /plants/{id}` require `If-Match: "<version>"`. The `requireIfMatch` middleware runs after `auth`/`isAdmin` and before any body or params validation:
   - missing, empty or `*` → `428 Precondition Required`;
   - anything other than exactly one strong tag with a non-negative integer (`W/"3"`, `"3", "4"`, `3`, `"-1"`, `"03"`, `"abc"`) → `400` with an `if-match` error key;
   - otherwise the parsed value is stored for the controller, which passes it to the use case as `expectedVersion`.
   - **`[TARGET STATE (Pending [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** RFC 9110 list grammar (validation.md §3.1): the controller passes a possibly empty list `expectedVersions` and `ensureVersion` checks that the stored version is among them.
3. The use case loads the aggregate, then calls `ensureVersion(entity.version, expectedVersion, …)` right after the existence check and **before** any business rule. A mismatch throws `DomainStaleVersionException` (HTTP `412`), even when the patch would change nothing.

#### Conditional write

`updateWithDiff(current, updated, username)` keeps the check atomic:

1. Computes the diff; if there are no changes, it returns without writing (the version is not bumped).
   - **`[TARGET STATE (Pending [Iteration 8](../../roadmap.md#iteration-8-implement-in-memory-audit-metadata))]`** an empty diff still runs a read with the same `{ _id, $and: [activeFilter(), versionFilter] }` filter and reports stale (`412`) or missing (`404`) exactly like a failed write. This closes the window where another writer lands between `ensureVersion` and a no-op, which today returns `200` based on a stale read.
2. Updates with filter `{ _id, $and: [activeFilter(), versionFilter] }` and `$inc: { version: 1 }`, alongside the diff's `$set` / `$unset`. `$and` keeps both conditions even if they use the same top-level operator. When `current.version` is `0`, `versionFilter` also matches documents without a stored `version` field (mappers read a missing `version` as `0`), so legacy or imported documents are not locked out.
3. Only if no document matched, one `countDocuments({ _id, ...activeFilter() })` tells the two cases apart:
   - the aggregate still exists and is active → **`DomainStaleVersionException`** (HTTP `412`): another writer got there first;
   - otherwise → **`DomainNotFoundException`** (HTTP `404`).

A concurrent delete that lands between the failed update and the count yields `404` instead of `412`. This is accepted: the resource is indeed gone.

On the success path the cost is one read plus one conditional write; the existence count only runs after a failed write.

#### Outcome precedence

`401/403 → 428 → 400 (If-Match) → 400 (body/params) → 404 → 412 → 409 → success`

- `404` wins over `412`: absent, soft-deleted or foreign resources never reveal their version.
- `412` wins over business-rule `409` (e.g. deleting a bed that has plants with an outdated version → `412`).
- `409` is reserved for business rules (duplicates, bed with plants); it no longer means "stale version".

Rules:

- `version` MUST NOT be set by patches or API input (request schemas reject it with `400`); it is exposed read-only in responses and in `ETag`.
- `save()` is reserved for creation (upsert of the initial document at `version: 0`). It MUST NOT be used to update existing aggregates, since it bypasses the version check.
- Restoring a soft-deleted aggregate cannot use `updateWithDiff` (it only matches active documents) and requires a dedicated method.
- Internal writes without an HTTP precondition (e.g. `addPlantToBed`) keep the in-request check: they read, then write with the version they read, and a concurrent change surfaces as `DomainStaleVersionException`.
  - **Open question (decide in [Iteration 24](../../roadmap.md#iteration-24-wrap-cross-aggregate-mutations-in-acid-transactions))**: once such a write is exposed over HTTP without `If-Match`, its `412` would answer a precondition the client never sent. Either the endpoint requires `If-Match`, or internal stale writes map to `409`.

---

## 5. REPOSITORY CONTRACT

### 5.1 MongoCrudRepository

Shared abstraction for CRUD repositories across aggregates.

Used by:

- PlantRepository
- BedRepository
- FamilyRepository

#### Responsibilities

- generic CRUD operations
- query normalization
- common Mongo access patterns
- eliminating duplicated repository logic between aggregates
- optimistic concurrency control on updates (see Sec. 4.3)

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
- uses shared diff pipeline

---

### 5.4.1 PlantInstanceRepository `[TARGET STATE (Pending [Iteration 20](../../roadmap.md#iteration-20-extract-plantinstance-into-standalone-collection))]`

Specialized repository for PlantInstance aggregate.

Responsibilities:

- persistence of PlantInstancePrimitives
- CRUD operations via MongoCrudRepository (standalone `plant_instances` collection)
- retrieving active plant instances associated with a specific `bedId`
- uses shared diff pipeline

---

### 5.5 REPOSITORY RETRIEVAL SEMANTICS

#### 5.5.1 Retrieval Contract Principle (Completed — Iteration 5)

Repositories return `null` or `undefined` when an entity does not exist in persistence.

Repositories MUST NOT interpret absence as a domain error.

Repositories MUST NOT throw domain-level exceptions (e.g. notFound, forbidden).

_Implementation Note: `MongoCrudRepository` (along with concrete implementations like `MongoFamilyRepository`, `MongoBedRepository`, and `MongoPlantRepository`) now returns `Nullable<Entity>` from `findById`. Exception-throwing logic has been shifted entirely to application use cases via the `ensureFound` utility (Iteration 5 & 6 in progress)._

---

#### 5.5.2 Responsibility Boundary

| Layer       | Responsibility                                            |
| ----------- | --------------------------------------------------------- |
| Repository  | Data access only (no semantic interpretation)             |
| Application | Truth enforcement (notFound, forbidden, validation rules) |

#### 5.5.2.1 Centralized Existence Validation Utility

To avoid repetitive null-check boilerplate across all use cases, the `ensureFound<T>(value, entityName, key, keyName?)` utility function (located in `src/Contexts/shared/application/utils/ensureFound.ts`) provides a centralized, type-safe mechanism for validating that repository results are not null.

**Contract:**

```ts
function ensureFound<T>(
  value: Nullable<T>,
  entityName: string,
  key: string,
  keyName?: string
): T;
```

**Behavior:**

- If `value` is not `null`, returns it immediately.
- If `value` is `null`, throws `DomainNotFoundException` with a formatted message.
- Optional `keyName` parameter (e.g. `'slug'`, `'id'`) enriches error messages for debugging.

**Usage in Use Cases:**

All application use cases that fetch entities via repositories MUST invoke `ensureFound` to validate the fetch result before proceeding:

```ts
const bed = await bedRepository.findById(bedId);
const validatedBed = ensureFound(bed, 'Bed', bedId, 'id');
```

This ensures a consistent, semantic error contract across the entire application layer.

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

### 5.7 MIGRATIONS `[TARGET STATE (Pending [Iteration 17](../../roadmap.md#iteration-17-integrate-formal-schema-migrations-migrate-mongo))]`

#### 5.7.1 Purpose `[TARGET STATE (Pending [Iteration 17](../../roadmap.md#iteration-17-integrate-formal-schema-migrations-migrate-mongo))]`

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
- a failed migration aborts startup (`migrations/index.ts` logs and rethrows; the process exits with code `1`), so the API never serves over a partially migrated schema

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

#### 5.7.7 Current Migrations

Migrations live in `migrations/<package version>/` as ESM modules exporting `up(db)` / `down(db)`, and are applied by `migrations/index.ts` at server start.

| Version | File                                      | Purpose                                                                                                                                 |
| ------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | `20260927120000-add-aggregate-version.js` | Backfills `version: 0` on `beds`, `families` and `plants` documents that lack it (OCC, Sec. 4.3). Idempotent; `down` removes the field. |

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

> **Query DSL Contract v1.4.0**

Rules:

- filter operators are defined in Query DSL Contract v1.4.0
- sort semantics are defined in Query DSL Contract v1.4.0
- pagination semantics are defined in Query DSL Contract v1.4.0
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

##### 5.8.4.1 Query Regex Sanitization `[TARGET STATE (Pending [Iteration 11](../../roadmap.md#iteration-11-implement-query-regex-sanitization))]`

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
| Query semantics   | Query DSL Contract v1.4.0   |
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

#### 5.8.8 CQRS Read-Only Bypass `[TARGET STATE (Pending [Iteration 18](../../roadmap.md#iteration-18-implement-cqrs-read-only-bypass-for-catalog))]`

To optimize memory and CPU usage on search, list, and GET endpoints, the read pathway **is officially permitted to bypass full Domain aggregate hydration**.

- List/query repositories are permitted to return plain DTOs or primitives mapped directly from MongoDB documents.
- They are not required to instantiate domain Entities, Value Objects, or perform domain-level constructor validations during pure read operations.
- **Output DTO Validation**: While database-direct modifications are not expected, output validation schemas (Zod) in the API layer MUST be used to validate the response DTO contract, ensuring a robust safety net against data inconsistency with minimal performance friction.
- Dynamic fields and projected counts (e.g., counting plant instances inside a Bed) are resolved directly via MongoDB pipelines or mappers without domain aggregate overhead.
- This bypass is strictly prohibited for write operations (POST, PATCH, DELETE).

_(Note: For the architectural boundary enforcement rules governing this bypass, see **Module: Architecture Boundaries (architecture-boundaries.md) Sec. 7.1**)_

---

### 5.9 ACID TRANSACTIONS & CACHING INFRASTRUCTURE `[TARGET STATE (Pending Iterations [30](../../roadmap.md#iteration-30-build-redis-cache-repository-with-memory-fallback) & [24](../../roadmap.md#iteration-24-wrap-cross-aggregate-mutations-in-acid-transactions))]`

#### 5.9.1 MongoDB ACID Multi-Document Transactions `[TARGET STATE (Pending [Iteration 24](../../roadmap.md#iteration-24-wrap-cross-aggregate-mutations-in-acid-transactions))]`

To maintain strict data integrity across detached collections (e.g. creating a standalone `PlantInstance` while simultaneously incrementing the `version` on its associated `Bed` for Optimistic Concurrency Control, already implemented per Sec. 4.3):

- Concrete usecases MUST coordinate writes using **MongoDB ACID Transactions (`ClientSession`)**.
- The `MongoRepository` layer must support accepting and forwarding an optional `session` object to MongoDB driver write methods.
- Transactions are executed over the MongoDB Single-Node Replica Set configured for the local development docker-compose environment or MongoDB Atlas in production.
- If any operation fails or a version conflict occurs, the session is aborted, guaranteeing atomic rolls.

#### 5.9.1.1 Data Locality & Sharding Constraints (Future-Proofing) `[TARGET STATE]`

To prevent severe latency penalties and deadlocks caused by "Distributed Transactions" when the database scales horizontally across multiple nodes (Sharding):

- All cross-collection transactional workflows MUST be strictly isolated to a single Tenant (the User).
- **Shard Key Architecture:** All private, mutable collections that participate in ACID transactions together (`beds`, `plant_instances`, `events`, `reminders`, `seed_batches`) MUST include `userId` as the primary prefix of their Shard Key strategy.
- **Rationale:** By anchoring data to the `userId`, MongoDB guarantees that the entirety of a user's digital garden resides on the exact same physical shard (Data Locality). This ensures that any ACID transaction executed by a user is mathematically local to a single node, preserving ultra-low latency and preventing cluster-wide distributed locks.

#### 5.9.2 Redis Cache Infrastructure `[TARGET STATE (Pending [Iteration 30](../../roadmap.md#iteration-30-build-redis-cache-repository-with-memory-fallback))]`

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

- **Separation of Persistence Primitives (Completed):** Under Clean Architecture, the domain layer must never depend on infrastructure or database models. This means primitive type structures (such as `MetadataPrimitives.ts`) reside inside `src/Contexts/shared/domain/` to secure complete boundary purity.

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
- plantInputMapper.toChanges(dto) → `Plant.update*` mutation methods

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
- domain validation MUST run inside the aggregate mutation method, before persistence

---

### 7.2 Mutation invariants

- mutation methods are deterministic
- order of operations must not change result
- no implicit merges outside defined diff algorithm

---

## 8. CURRENT IMPLEMENTATION STATUS

### Implemented

- MongoCrudRepository abstraction
- MongoRepository abstraction
- PlantRepository implementation
- BedRepository implementation
- diffObjects full-state diff (Date-aware; a field absent from the updated state is `$unset`)
- aggregate mutation methods (`Bed`, `Family`, `Plant`) replace generic patch merging
- updateWithDiff pipeline
- optimistic concurrency control (`version`) for Bed, Plant and Family
- FamilyRepository implementation
- PlantDtoMapper
- Query DSL + parser support (GenericQueryParser, QueryParserUtils)

---

### Partial

- elimination of unsafe casts in repository layer
- full consistency enforcement between DTO and domain

---

### Pending

- removal of all `as unknown` usage in persistence layer
- removal of `Record<string, unknown>` leakage
- formal contract enforcement for null vs undefined semantics
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

- diff / mutation contract changes require explicit version bump
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
