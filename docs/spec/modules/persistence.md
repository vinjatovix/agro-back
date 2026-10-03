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

`updateWithDiff(current, updated): Promise<WriteOutcome>` receives **two complete domain-mapper outputs** — the primitives of the same aggregate before and after the mutation method ran — and returns what it did: `'written'` (version advanced by one) or `'unchanged'` (confirmed no-op). It never returns a version number, so the aggregate cannot receive a version it could not have reached. It MUST NOT receive a partial object or a patch fragment.

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

An empty diff (no `$set`, no `$unset`) writes nothing and does not bump `version`; it is still confirmed against storage (Sec. 4.3).

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
6. Persistence layer applies the deterministic diff between states and returns a `WriteOutcome`.
7. The use case applies it with `aggregate.syncVersion(outcome)` and returns the in-memory aggregate: no `findById` after the write (successful edit = 1 read + 1 write).

---

### CRITICAL RULE: METADATA OWNERSHIP

The persistence layer (`updateWithDiff`, repositories, or DB-level triggers) MUST NOT dynamically alter or inject metadata values (like `updatedAt` or `updatedBy`) under the hood. All audit metadata is owned strictly by the Domain and is already set in memory before the persistence step.

**Explicit exception — `version`**: `updateWithDiff` advances `version` with `$inc: { version: 1 }` in the same conditional write. This is a concurrency mechanism, not audit data, and it is the only field storage changes on its own. Because every write advances it by exactly one, storage only reports whether it wrote and the aggregate derives its own version (`syncVersion`).

The User aggregate follows the same rule outside `MongoCrudRepository`: `MongoAuthRepository.update(patch)` stores the `UserPatch` as received, including the metadata the use case computed with `Metadata.update`, and adds no audit data of its own. The patch metadata is written with dotted paths (`metadata.updatedAt`, …), so a field stored under `metadata` that the patch does not carry is kept.

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
2. `PATCH /beds/{id}`, `PATCH /plants/{id}`, `PATCH /families/{idOrSlug}`, `DELETE /beds/{id}` and `DELETE /plants/{id}` require `If-Match` (RFC 9110 entity-tag list, validation.md §3.1). The `requireIfMatch` middleware runs after `auth`/`isAdmin` and before any body or params validation:
   - missing, empty or `*` → `428 Precondition Required`;
   - not an entity-tag list (`3`, `"3`, `"3" "4"`, `*, "3"`) or more than 50 tags → `400` with an `if-match` error key;
   - otherwise the versions named by its strong tags (`"2", "3"` → `[2, 3]`; `W/"3"` or `"abc"` → `[]`) are stored for the controller, which passes them to the use case as `expectedVersions`.
3. The use case loads the aggregate, then calls `ensureVersion(entity.version, expectedVersions, …)` right after the existence check and **before** any business rule. It passes when the list contains the stored version; otherwise (including an empty list) it throws `DomainStaleVersionException` (HTTP `412`), even when the patch would change nothing.

#### Conditional write

`updateWithDiff(current, updated): Promise<WriteOutcome>` keeps the check atomic:

1. Computes the diff. If it is empty, it writes nothing but runs `countDocuments` with the same `{ _id, $and: [activeFilter(), versionFilter] }` filter (`limit: 1`): a match returns `'unchanged'`; no match goes to step 3. This closes the window where another writer lands between `ensureVersion` and a no-op, which would otherwise answer `200` from a stale read.
2. Otherwise updates with filter `{ _id, $and: [activeFilter(), versionFilter] }` and `$inc: { version: 1 }`, alongside the diff's `$set` / `$unset`, and returns `'written'`. It never adds `updatedAt`/`updatedBy`. `$and` keeps both conditions even if they use the same top-level operator. When `current.version` is `0`, `versionFilter` also matches documents without a stored `version` field (mappers read a missing `version` as `0`), so legacy or imported documents are not locked out.
3. Only if no document matched (write or no-op confirmation), one `countDocuments({ _id, ...activeFilter() })` tells the two cases apart:
   - the aggregate still exists and is active → **`DomainStaleVersionException`** (HTTP `412`): another writer got there first;
   - otherwise → **`DomainNotFoundException`** (HTTP `404`).

A concurrent delete that lands between the failed check and the count yields `404` instead of `412`. This is accepted: the resource is indeed gone.

Cost: a successful edit is one read plus one conditional write; a no-op edit is one read plus one indexed count; the existence count only runs after a failed write or confirmation.

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

### 5.7 MIGRATIONS (Completed — [Iteration 17](../../roadmap.md#iteration-17-integrate-formal-schema-migrations-migrate-mongo))

#### 5.7.1 Purpose

Migrations are infrastructure lifecycle tools responsible for evolving the MongoDB schema over time. They are run by `migrate-mongo` and recorded in the `changelog` collection, which is the single source of truth for the schema version.

They are NOT part of domain, application, or repository logic.

---

#### 5.7.2 Responsibilities

Migrations are responsible for:

- creating, changing and dropping indexes (e.g. unique slug constraints)
- evolving collection structure
- backfilling data when necessary
- ensuring schema consistency across environments

**Indexes live only in migrations.** Opening a connection (`MongoClientFactory.createClient`) only connects: it never creates, changes or drops an index. The start-up index list (`MongoCollectionIndexes.ts`) was removed in Iteration 17 because several instances starting at once raced to build the same indexes, and nothing recorded when or why an index appeared. The only index not created by a migration is the TTL index `migrate-mongo` builds on its own lock collection (Sec. 5.7.4).

---

#### 5.7.3 Execution Context and Deployment Order

- `src/apps/agroApi/server.ts` calls `migrations.up()` (`migrations/index.ts`) before the HTTP server listens: migrations run, and must succeed, before the service serves requests.
- Every migration lives in one flat folder, `migrations/scripts/`, whatever the application version. `migrate-mongo` orders them by their timestamp prefix and skips those already in `changelog`, so a new database receives every migration ever written, oldest first. (Until Iteration 17 the folder was named after the `package.json` version, so a database started on a later version skipped earlier folders.)
- The production image ships `migrations/scripts/*.js` at `/app/migrations/scripts/` (`Dockerfile`), next to the working directory the runner resolves against; the `.d.ts` test types are not shipped.
- A failed migration aborts startup (`migrations/index.ts` logs and rethrows; the process exits with code `1`), so the API never serves over a partially migrated schema.
- Every migration MUST be safe to re-run (second line of defence behind the lock).

---

#### 5.7.4 Storage and Lock

| Setting                   | Value                | Notes                                                                                 |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `migrationsDir`           | `migrations/scripts` | Flat; no version folders.                                                             |
| `changelogCollectionName` | `changelog`          | Each entry: `fileName`, `appliedAt`, `migrationBlock`. Only the file name is matched. |
| `lockCollectionName`      | `changelog_lock`     | `migrate-mongo`'s built-in lock.                                                      |
| `lockTtl`                 | `300` seconds        | Fixed on purpose (see below).                                                         |

`buildMigrationsConfig(url)` in `migrations/index.ts` returns these settings (unit-tested).

**Lock behaviour**: `up` checks for a lock document, inserts one, applies the pending migrations and clears it (also when a migration fails). If a lock is already in place, start-up fails fast with `Could not migrate up, a lock is in place.`, serves no requests and applies nothing; the orchestrator's restart is the retry. A holder that dies leaves its lock to expire through the TTL index (`createdAt`, `expireAfterSeconds: 300`); MongoDB's TTL monitor runs every 60 s, so a dead holder blocks start-up for at most about 6 minutes.

**The TTL is frozen**: `migrate-mongo` creates the TTL index without awaiting it, so changing `lockTtl` later makes that `createIndex` reject and crash start-up (unhandled rejection). A change needs a migration that runs `collMod` on `changelog_lock` first.

**Known limit**: the lock checks and then inserts in two operations, so two instances starting in the same instant can both pass. Re-runnable migrations cover that case; a unique index on `changelog.fileName` is a roadmap proposal.

---

#### 5.7.5 Critical Rule

Migrations MUST NOT:

- contain business logic
- depend on domain layer or import any application code (they are frozen snapshots: constants such as the plant collation are repeated)
- modify application behavior directly
- change or delete data to make an index buildable

Each migration is a plain ESM `.js` file `<yyyyMMddHHmmss>-<kebab-case-name>.js` exporting `up(db)` and `down(db)`, with a sibling `.d.ts` declaring the minimal `db` shape it uses so its Jest tests can pass a fake database without `any`. Errors are thrown, never swallowed, and name the collection and index involved. Historical migrations are never edited.

---

#### 5.7.6 Schema Migration Boundary

- schema evolution is handled via migrations system
- migrations are executed at bootstrap phase
- persistence layer assumes schema is already up-to-date
- repositories MUST NOT trigger migrations or declare indexes

**Duplicates and conflicting definitions**: when stored data breaks a unique rule a migration declares, or an index with the same name exists with another definition, MongoDB rejects the index (codes `11000`, `85`, `86`). The migration stops with an error naming the collection and index, start-up fails, and no data is changed: the data is fixed by hand or by a dedicated data-fix migration, never guessed. The plant scientific name migration looks for repeated names before dropping any index and lists up to five of them.

**Duplicates at runtime**: a write that breaks a unique index (create through `MongoRepository.persist`, update through `MongoCrudRepository.updateWithDiff`) becomes `DomainConflictException` (`409`, `Duplicate document with {...}`) through `MongoErrorHandler`.

**Rollback**: every migration ships a `down` step covered by unit tests. The project has no rollback command yet (roadmap proposal).

---

#### 5.7.7 Current Migrations

| File                                              | Purpose                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260927120000-add-aggregate-version.js`         | Backfills `version: 0` on `beds`, `families` and `plants` documents that lack it (OCC, Sec. 4.3). Idempotent; `down` removes the field.                                                                                                                                                   |
| `20261002120000-normalize-plant-knowledge.js`     | Brings stored plants in line with the Plant model (seasons, propagation method names, pollination, required labels…); stops on anything it cannot fix.                                                                                                                                    |
| `20261003120000-plant-listing-indexes.js`         | Plant listing indexes with the plant collation (`es`, strength 2): rebuilds `plants_family_idx` (`identity.family`) and adds `plants_name_primary_idx` and `plants_scientific_name_idx` for the `name`/`scientificName` sort keys. Idempotent; `down` restores the start-up family index. |
| `20261003130000-account-family-unique-indexes.js` | Declares the unique rules once built at start-up: `users_email_unique`, `users_username_unique`, `families_slug_unique`, same names and options. A no-op where they already exist; `down` drops them.                                                                                     |
| `20261003131000-plant-scientific-name-unique.js`  | Plant scientific names unique ignoring case: replaces `plants_scientific_name_idx` and the undeclared case-sensitive `plants_scientificName_unique` with one index, `plants_scientific_name_unique`, that also serves the listing sort. `down` restores both old indexes.                 |

A string index only serves a query that uses the same collation, so plant indexes repeat the collation of `MongoPlantRepository`.

#### 5.7.8 Indexes

| Collection       | Index                           | Key                                | Options                    | Declared in                                    |
| ---------------- | ------------------------------- | ---------------------------------- | -------------------------- | ---------------------------------------------- |
| `users`          | `users_email_unique`            | `{ email: 1 }`                     | `unique`                   | `20261003130000-account-family-unique-indexes` |
| `users`          | `users_username_unique`         | `{ username: 1 }`                  | `unique`                   | `20261003130000-account-family-unique-indexes` |
| `families`       | `families_slug_unique`          | `{ slug: 1 }`                      | `unique`                   | `20261003130000-account-family-unique-indexes` |
| `plants`         | `plants_family_idx`             | `{ 'identity.family': 1 }`         | collation `es`/2           | `20261003120000-plant-listing-indexes`         |
| `plants`         | `plants_name_primary_idx`       | `{ 'identity.name.primary': 1 }`   | collation `es`/2           | `20261003120000-plant-listing-indexes`         |
| `plants`         | `plants_scientific_name_unique` | `{ 'identity.scientificName': 1 }` | `unique`, collation `es`/2 | `20261003131000-plant-scientific-name-unique`  |
| `changelog_lock` | `createdAt_1`                   | `{ createdAt: 1 }`                 | `expireAfterSeconds: 300`  | `migrate-mongo` itself (accepted exception)    |

Every collection also keeps the default `_id_` index. Plant scientific names are unique ignoring letter case only (strength 2 keeps accents distinct), soft-deleted plants included, as a soft-deleted family keeps its slug.

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

> **Query DSL Contract v1.5.0**

Rules:

- filter operators are defined in Query DSL Contract v1.5.0
- sort semantics are defined in Query DSL Contract v1.5.0
- pagination semantics are defined in Query DSL Contract v1.5.0
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
- mapping DSL semantics to persistence-specific constructs

Values arrive already decoded and typed by the listing schema (query.md), so translators never split CSV text or coerce numbers.

`PlantQueryMapper` translates every operator a plant field declares, into the stored plant paths: `identity` matches primary name, aliases or scientific name (one `$or`), `sowingMethod[in]` is an `$or` of `$exists` checks, and several `$or` clauses are combined under `$and` so none overwrites another. Plants sort by public keys: `MongoCrudRepository.toMongoSortField(key)` (identity by default) is overridden by `MongoPlantRepository` to map `name` → `identity.name.primary` and `scientificName` → `identity.scientificName`.

---

##### 5.8.4.1 Query Regex Sanitization ([Iteration 11](../../roadmap.md#iteration-11-implement-query-regex-sanitization))

To secure the database against Regular Expression Injection (ReDoS) and filter bypasses on public endpoints, text search values are always matched as literal text.

- `MongoQueryTranslator` and `PlantQueryMapper` build text patterns with the shared `textPatternCondition` (`Contexts/shared/infrastructure/persistence/mongo/`), which passes every `contains`, `startsWith` and `endsWith` value through `escapeRegex`, then adds the anchor outside the escaped text: `contains` → `escaped`, `startsWith` → `^escaped`, `endsWith` → `escaped$`. The result keeps the `{ $regex, $options: 'i' }` shape (case-insensitive).
- Text operator results skip identifier conversion: a UUID-shaped `contains` / `startsWith` / `endsWith` value is searched as text. Only `eq`, set (`in`, `has`, `hasAny`) and range values are converted with `toMongoId`.
- Any other query mapper that builds a pattern from filter text MUST use `textPatternCondition` or `escapeRegex` too (`PlantQueryMapper` keeps an escaped `RegExp` for `identity.contains`). No other code path builds a pattern from client text.

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
| Query semantics   | Query DSL Contract v1.5.0   |
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
- metadata ownership: `MongoCrudRepository` never injects `updatedAt`/`updatedBy`; `updateWithDiff` returns a `WriteOutcome` and confirms empty diffs against storage
- metadata ownership for User: `MongoAuthRepository.update(patch)` stores the audit data carried by `UserPatch` and never adds its own (`updateMetadata` removed)
- FamilyRepository implementation
- PlantDtoMapper
- formal schema migrations: every index declared in `migrations/scripts/` (flat, version-independent), runner lock on, start-up connection never touches indexes (Sec. 5.7)
- Query DSL support: Zod listing schemas (`listQuerySchema`, query.md), `MongoQueryTranslator` (Families) and `PlantQueryMapper` (Plants, every declared operator; public sort keys mapped by `toMongoSortField`)

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
- User mutation methods: `User` is still updated through a partial `UserPatch` built by use cases (proposal in [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow))

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
