# MODULE: FAMILY

version: 1.4.0
source-spec: v1.4.0
status: stable

---

## 1. PURPOSE

Defines the botanical family taxonomy system used for plant classification.

It provides ecological grouping metadata for Plant entities.

---

## 2. CORE RESPONSIBILITY

The Families module is responsible for:

- defining botanical family entities
- providing classification metadata for plants
- enabling ecological grouping and comparison
- serving as reference dataset for domain modeling

---

## 3. DOMAIN ROLE

Families is:

- a botanical taxonomy dataset
- a Domain Aggregate Root mutable by administrators and collaborators
- a classification layer for the Plant domain

Families is NOT:

- an active lifecycle manager (like Bed or PlantInstance)
- mutable by standard users

---

## 4. DATA MODEL

Each Family includes:

- id (UUID)
- name
- scientific classification metadata (scientificName, aliases)
- descriptive traits (shortDescription, highlights)
- extra (additional dynamic classification properties)
- metadata (audit trails)

---

## 5. RELATIONSHIPS

### 5.1 Families → Plant

- Plants reference a Family ID
- Family does not depend on Plant
- Relationship is unidirectional

---

### 5.2 Families → Knowledge System

- Families overlap conceptually with ecological knowledge
- Families remain an independent dataset
- No direct coupling allowed

---

## 6. RULES

- **`[TARGET STATE (Pending [Iteration 31](../../roadmap.md#iteration-31-introduce-collaborator-role-in-auth-middleware))]` Access Control & Security (Collaborator Role):** Read-only operations (catalog queries) are completely unauthenticated. Mutating operations (creation, updates, deletion) are currently implemented for the **Administrator** role. Authorizing the **Collaborator** role is strictly pending [Iteration 31](../../roadmap.md#iteration-31-introduce-collaborator-role-in-auth-middleware).
- **Polymorphic idOrSlug Lookup:**
  - **Read Operations (CURRENTLY IMPLEMENTED):** Queries targeting a family resource by its polymorphic identifier dynamically resolve the target (implemented in Express routing using the `:idOrSlug` parameter, refactored from `:slug`). If the identifier is a valid UUID, it retrieves the entity by `id`; otherwise, it evaluates it as an alphanumeric string and performs a lookup on the indexed `slug` property.
  - **Update (IMPLEMENTED):** `PATCH /families/{idOrSlug}` passes the identifier to `UpdateFamily`, which loads the aggregate once through `FamilyRepository` (`findById` for a UUID, `findBySlug` otherwise). An unknown slug answers `Family not found with slug: <slug>`.
  - **Delete `[TARGET STATE (Pending [Iteration 32](../../roadmap.md#iteration-32-implement-deletefamily-and-enable-polymorphic-lookups-for-family-mutations))]`:** `DELETE /families/{idOrSlug}` does not exist yet.
- **Catalog text rules (create, load and update alike):** `slug`, `name`, `scientificName` and `shortDescription` are trimmed and never blank. `aliases`, `highlights` and `extra.subfamilies` follow one text-list rule (`uniqueTextList`): entries are trimmed, blank entries are dropped and repeated entries (compared after trimming, ignoring letter case) are dropped, keeping the first occurrence. `extra.order`/`extra.distribution` are trimmed and never blank, `extra.speciesCount` is an integer `>= 1`, an `extra` that is not an object (`null`, an array, a text) → `InvalidArgumentException`, and an `extra` without keys is never stored (absent). The `Family` constructor applies these rules, so every family built (created, loaded or updated) meets them.
- **Request shape vs rules:** the Zod request schemas (`controllers/Families/requestSchemas.ts`) check shape only (types, length limits, unknown fields, where `null` is allowed); dropping blank or repeated list entries is a domain rule and is never a `400`.
- Families MUST NOT contain plant lifecycle business logic
- Families MUST NOT depend on persistence layer

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

---

## 7. CURRENT IMPLEMENTATION STATUS

### Implemented

- Core domain entity and Value Objects
- Persistence mapping and MongoDB repository
- Optimistic concurrency control on updates: `PATCH` requires `If-Match: "<version>"`; an outdated version → `412` (missing header → `428`). Single-family responses carry `ETag: "<version>"`
- API endpoints (create, retrieve, list, update). `POST`, `GET /:idOrSlug` and `PATCH /:idOrSlug` validate with Zod (`validateRequest`, schemas in `controllers/Families/requestSchemas.ts`, [Iteration 13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod)): creation and update share the text rules; `aliases` is optional on create (defaults to `[]`); `extra: null` is rejected on create and `extra: {}` is stored as absent; `PATCH {}` and `PATCH { "extra": {} }` are no-ops (version unchanged, `If-Match` still checked); `id`, `version`, unknown fields and any query key → `400 Unknown field`; `GET` also rejects a body field. The list endpoint keeps its query parser until [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod)
- Read path (Iteration 18): `GetFamilyById`, `GetFamilyBySlug` and `ListFamilies` depend on the read port `FamilyReadRepository` (`application/queries/`) and return `FamilyReadView` without building a `Family`; `CreateFamily`/`UpdateFamily` keep the aggregate (persistence.md §5.8.8)
- Dataset seeding strategy (JSON-based)
- Validation rules for family references
- Aggregate mutation method: `Family.updateInformation(changes, user)` — refreshes `updatedAt`/`updatedBy` only when the information really changed (domain-core.md Sec. 5.2); `UpdateFamily` returns the in-memory family after `syncVersion` (1 read + 1 write); scalar fields (`slug`, `name`, `scientificName`, `shortDescription`) are trimmed; empty or whitespace-only after trim → `InvalidArgumentException` (`400`); `null` remains `400` (string fields are never nullable); `shortDescription` is a domain invariant (required and non-empty); lists (`aliases`, `highlights`) replace the current value in full and follow the text-list rule (§6), as `extra.subfamilies` does (a non-string entry → `400`); `extra: null` removes the field; `extra` object is merged key by key with `null` per key removing that key; an `extra` left without keys is removed (never stored as `{}`)

---

## 8. FUTURE EVOLUTION

### 8.1 Dataset management

- static seed dataset
- versioned taxonomy updates

---

### 8.2 Plant integration

- Plant → Family linkage enforcement
- validation of family IDs at Plant creation/update

---

## 9. FINAL NOTE

Families is a classification layer, not a behavioral domain.

It exists to enrich Plant semantics, not to control them.
