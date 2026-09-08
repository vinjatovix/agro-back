# Roadmap: Modernized Garden Planning and Ecological Engine (Agro-Back)

## Final Goal

Deliver a secure, high-performance, and event-driven permaculture backend utilizing Domain-Driven Design. The system will evolve through strictly self-contained, deployable increments. It will support robust spatial algorithms (coordinate and SFG grid layouts, vertical strata, microclimates), an ecological companion graph, private seed inventories, adaptive meteorological care reminders, and chronological cultivation logs. All cross-module side-effects will scale safely via ACID outbox transactions and resilient Kafka telemetry, guaranteeing zero data ghosting.

---

# Phase 0: Core Architecture

## Iteration 1: Relocate Mongo Primitives to Shared Domain

- **Value delivered**: Secures domain purity by eliminating infrastructure type leakage.
- **Definition of Done**: `MetadataPrimitives.ts` is moved to the shared domain folder; imports are updated.
- **Dependencies**: None.
- **Risks**: Broken paths in existing mappers.
- **Prompt for /speckit.specify**:
  ```text
  RELOCATE MONGO PRIMITIVES TO SHARED DOMAIN
  WHY: The domain layer must not depend on database-specific structures.
  WHAT: Move `MetadataPrimitives.ts` from `persistence/mongo` to `shared/domain` and update all relative imports.
  ```

## Iteration 2: Implement Functional Branded Types

- **Value delivered**: Prevents primitive obsession and type blindness across aggregate IDs.
- **Definition of Done**: `Uuid` class is replaced with TypeScript intersection types (e.g., `type PlantId = string & { __brand: 'PlantId' }`).
- **Dependencies**: None.
- **Risks**: Heavy refactoring of test factories relying on the `.value` property.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT FUNCTIONAL BRANDED TYPES FOR IDENTIFIERS
  WHY: Using generic strings for IDs leads to accidental swaps (e.g., passing BedId as PlantId).
  WHAT: Replace the generic `Uuid` value object with domain-specific functional branded types using TypeScript intersections.
  ```

## Iteration 3: Standardize UUIDv7 Generation

- **Value delivered**: Optimizes MongoDB B-Tree insert operations and provides native chronological sorting.
- **Definition of Done**: ID factories generate UUIDv7. Validation schemas accept both UUIDv4 and UUIDv7.
- **Dependencies**: Iteration 2.
- **Risks**: Invalidating existing pre-seeded UUIDv4 data if backward compatibility is missed.
- **Prompt for /speckit.specify**:
  ```text
  STANDARDIZE UUIDV7 GENERATION
  WHY: UUIDv7 provides chronological sequencing, optimizing database index inserts and pagination.
  WHAT: Update identity factory functions to generate UUIDv7. Ensure parsing/validation remains backward compatible with UUIDv4.
  ```

## Iteration 4: Relocate Query Parser to API Layer

- **Value delivered**: Isolates transport-level parsing from the pure domain core.
- **Definition of Done**: `GenericQueryParser` and utilities are moved to `src/apps/agroApi/shared/query/`.
- **Dependencies**: None.
- **Risks**: Import resolution errors in controllers.
- **Prompt for /speckit.specify**:
  ```text
  RELOCATE QUERY PARSER TO API LAYER
  WHY: HTTP query string parsing is a delivery mechanism concern, not a domain concern.
  WHAT: Move `GenericQueryParser` and query utils out of the domain and into the API apps folder. Fix imports.
  ```

## Iteration 5: Refactor Repositories to Return Null

- **Value delivered**: Purifies repositories into pure data-access mechanisms devoid of domain logic.
- **Definition of Done**: `findById` methods return `null` instead of throwing `DomainNotFoundException`.
- **Dependencies**: None.
- **Risks**: Unhandled nulls crashing use cases if not immediately caught.
- **Prompt for /speckit.specify**:
  ```text
  REFACTOR REPOSITORIES TO RETURN NULL
  WHY: Repositories should not enforce domain existence invariants; they merely fetch data.
  WHAT: Refactor repository `findById` methods to return `null` or `undefined` on absence, removing internal exception throws.
  ```

## Iteration 6: Enforce Existence Invariants in Use Cases

- **Value delivered**: Centralizes business rules in the application layer.
- **Definition of Done**: All use cases check repository outputs and explicitly throw `DomainNotFoundException` if null.
- **Dependencies**: Iteration 5.
- **Risks**: Missing null checks leading to runtime crashes.
- **Prompt for /speckit.specify**:
  ```text
  ENFORCE EXISTENCE INVARIANTS IN USE CASES
  WHY: Following the repository refactor, use cases must take ownership of handling missing entities.
  WHAT: Update all application use cases to check for null repository results and throw `DomainNotFoundException`.
  ```

## Iteration 7: Encapsulate State Mutations in Aggregates

- **Value delivered**: Eliminates anemic domain models by enforcing mutations via explicit business methods.
- **Definition of Done**: Generic `applyPatch` helpers are removed from use cases. Aggregates expose methods like `updateTraits()`.
- **Dependencies**: None.
- **Risks**: Forgetting to map patch inputs to aggregate methods correctly.
- **Prompt for /speckit.specify**:
  ```text
  ENCAPSULATE STATE MUTATIONS IN AGGREGATES
  WHY: Anemic models leak business rules into the application layer.
  WHAT: Remove generic patch helpers from use cases. Implement semantic mutation methods on Aggregate Roots.
  ```

## Iteration 8: Implement In-Memory Audit Metadata

- **Value delivered**: Bypasses costly read-after-write operations by keeping audit trails perfectly synced in memory.
- **Definition of Done**: Aggregate mutation methods update `updatedAt` in memory. Usecases return the modified aggregate directly.
- **Dependencies**: Iteration 7.
- **Risks**: Database updates desyncing from in-memory objects if persistence patches are calculated incorrectly.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT IN-MEMORY AUDIT METADATA UPDATES
  WHY: Returning a mutated object directly from memory saves a redundant database read, but requires accurate audit metadata.
  WHAT: Ensure aggregate mutation methods update `metadata.updatedAt` in memory. Refactor use cases to bypass read-after-write.
  ```

## Iteration 9: Establish Zod Validation Middleware

- **Value delivered**: Provides a robust foundation for strict, type-safe payload validation.
- **Definition of Done**: Zod middleware is created. Output matches the dot-notation `ApiErrorResponse` contract.
- **Dependencies**: None.
- **Risks**: Error formatting mismatching the OpenAPI contract.
- **Prompt for /speckit.specify**:
  ```text
  ESTABLISH ZOD VALIDATION MIDDLEWARE
  WHY: We need a central middleware to intercept Zod errors and format them safely before migrating endpoints.
  WHAT: Create a generic Zod validation middleware that maps validation failures to dot-notation error dictionaries.
  ```

## Iteration 10: Migrate Health and Auth Endpoints to Zod

- **Value delivered**: Proves the Zod validation pattern on simple endpoints before tackling complex domains.
- **Definition of Done**: `express-validator` is retired for Health and Auth. Zod schemas are active.
- **Dependencies**: Iteration 9.
- **Risks**: Minor ATDD test assertions failing on error message strings.
- **Prompt for /speckit.specify**:
  ```text
  MIGRATE HEALTH AND AUTH ENDPOINTS TO ZOD
  WHY: Validating the middleware on simple endpoints ensures stability before migrating complex catalogs.
  WHAT: Replace express-validator with Zod schemas for Auth and Health routes. Update test assertions to match Zod messages.
  ```

## Iteration 11: Implement Query Regex Sanitization

- **Value delivered**: Secures the database against Regular Expression Injection (ReDoS).
- **Definition of Done**: `escapeRegex` utility is applied to all string filter inputs in the Query Translator.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT QUERY REGEX SANITIZATION
  WHY: Direct compilation of user string search terms into MongoDB regex patterns poses a security injection risk.
  WHAT: Integrate `escapeRegex` into `MongoQueryTranslator` and `FamilyQueryMapper` for all dynamic contains/startsWith filters.
  ```

## Iteration 12: Migrate Plants Endpoints to Zod

- **Value delivered**: Unifies runtime payload validation and TypeScript type-safety for the botanical catalog.
- **Definition of Done**: `express-validator` is retired for Plants routes. Zod schemas are implemented.
- **Dependencies**: Iteration 9.
- **Risks**: Breaking complex nested trait validation.
- **Prompt for /speckit.specify**:
  ```text
  MIGRATE PLANTS ENDPOINTS TO ZOD
  WHY: Consolidating schemas prevents API contract drift for the core biological catalog.
  WHAT: Replace express-validator with Zod schemas for all Plant endpoints. Update related ATDD feature tests.
  ```

## Iteration 13: Migrate Families Endpoints to Zod

- **Value delivered**: Secures taxonomy catalog endpoints with strict typing.
- **Definition of Done**: `express-validator` is retired for Families routes. Zod schemas are implemented.
- **Dependencies**: Iteration 9.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  MIGRATE FAMILIES ENDPOINTS TO ZOD
  WHY: Taxonomic updates require strict validation to maintain data integrity.
  WHAT: Replace express-validator with Zod schemas for all Family endpoints. Update ATDD tests.
  ```

## Iteration 14: Migrate Beds and Query DSL to Zod

- **Value delivered**: Completes the Zod transition, fully retiring `express-validator` and securing dynamic query parameters.
- **Definition of Done**: `express-validator` is removed from `package.json`. Beds and generic Query options (filters, pagination, sort) use Zod.
- **Dependencies**: Iteration 12, Iteration 13.
- **Risks**: Dynamic filter validation using Zod records can be tricky to type correctly.
- **Prompt for /speckit.specify**:
  ```text
  MIGRATE BEDS AND QUERY DSL TO ZOD
  WHY: Query parameter validation must be strict to prevent malformed operators reaching the database.
  WHAT: Implement Zod validation for Bed endpoints and generic Query DSL options. Completely remove express-validator.
  ```

## Iteration 15: Automate Awilix Dependency Injection

- **Value delivered**: Eliminates verbose DI registration boilerplate, preventing composition-root errors during scaling.
- **Definition of Done**: Manual `container.ts` class registrations are replaced with dynamic directory scanning (`container.loadModules`).
- **Dependencies**: None.
- **Risks**: Registration failure if files are incorrectly named.
- **Prompt for /speckit.specify**:
  ```text
  AUTOMATE AWILIX DI AUTO-WIRING
  WHY: Maintaining a massive manual registry of classes in `container.ts` is error-prone and hard to scale.
  WHAT: Refactor `container.ts` to utilize dynamic directory loading via Awilix, mapping interfaces to classes through naming convention rules.
  ```

## Iteration 16: Modularize Cucumber ATDD Step Definitions

- **Value delivered**: Improves test suite execution speed and resolves state cross-contamination.
- **Definition of Done**: Step files are split into bounded contexts. Execution state is strictly encapsulated inside Cucumber World (`this`).
- **Dependencies**: None.
- **Risks**: Flaky test failures during rewrite.
- **Prompt for /speckit.specify**:
  ```text
  MODULARIZE ATDD STEP DEFINITIONS
  WHY: Global test state variables in step definitions cause flaky cucumber runs and state leakage.
  WHAT: Move global variables to Cucumber World (`this`). Split massive step files into context-specific files.
  ```

## Iteration 17: Integrate Formal Schema Migrations (migrate-mongo)

- **Value delivered**: Establishes robust, traceable, and versioned database schema transformations.
- **Definition of Done**: `migrate-mongo` is configured. Programmatic collection index creation is removed from repository startup routines.
- **Dependencies**: None.
- **Risks**: Potential index deletion during deployment if migrations are misconfigured.
- **Prompt for /speckit.specify**:
  ```text
  INTEGRATE FORMAL SCHEMA MIGRATIONS
  WHY: Declaring indexes programmatically at repository startup creates race conditions and lacks schema version traceability.
  WHAT: Integrate `migrate-mongo`, write first migration scripts for active indexes, and purge index creation from repository boot.
  ```

## Iteration 18: Implement CQRS Read-Only Bypass for Catalog

- **Value delivered**: Optimizes read latency by skipping heavy domain aggregate hydration for public endpoints.
- **Definition of Done**: GET endpoints for Plants and Families bypass aggregate hydration, returning plain DTOs validated by Zod Unions.
- **Dependencies**: Iteration 12, Iteration 13.
- **Risks**: Field leakage if Zod schemas do not strictly filter output properties.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT CQRS READ-ONLY BYPASS FOR CATALOG
  WHY: Hydrating full domain aggregates for read-only listings adds CPU and memory overhead.
  WHAT: Allow GET pathways for Plants/Families to bypass aggregate hydration. Validate responses using strict Zod schemas supporting union types.
  ```

## Iteration 19: Support JSON:API Sparse Fields in Query Parser

- **Value delivered**: Reduces network payload sizes by allowing clients to request specific fields and relations.
- **Definition of Done**: `GenericQueryParser` parses JSON:API `include` and `fields` parameters.
- **Dependencies**: Iteration 4.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  SUPPORT JSON:API SPARSE FIELDS IN QUERY PARSER
  WHY: Fetching full entities when only a few fields are needed wastes bandwidth.
  WHAT: Update the query parser to extract and normalize JSON:API `include` and `fields` parameters into the QueryOptions model.
  ```

---

# Phase 1: Identity & Access

## Iteration 20: Implement Mailer Port and Local Bypass

- **Value delivered**: Establishes technology-agnostic email sending infrastructure.
- **Definition of Done**: `Mailer` port defined. In-memory adapter implemented. Local development bypass (`NODE_ENV === 'development'`) is active.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT MAILER PORT AND LOCAL BYPASS
  WHY: The system needs to send emails, but local developers must remain unblocked by external email infrastructure.
  WHAT: Build a Mailer port and adapters. Implement a bypass strictly limited to local NODE_ENV to simulate successful email delivery.
  ```

## Iteration 21: Implement Email Account Activation Flow

- **Value delivered**: Secures user workspace access through verifiable identities.
- **Definition of Done**: Account creation issues an activation token. Login is blocked for unverified users (except in local bypass).
- **Dependencies**: Iteration 20.
- **Risks**: Locking out existing test users.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT EMAIL ACCOUNT ACTIVATION FLOW
  WHY: Unverified registrations lead to fake accounts and spam.
  WHAT: Update registration to send an activation token. Create a validation endpoint. Block login if emailValidated is false.
  ```

## Iteration 22: Implement Stateless Google OAuth

- **Value delivered**: Enhances sign-in security and user onboarding with single-sign-on.
- **Definition of Done**: Google OAuth endpoint receives code, verifies it, resolves profile, and issues stateless JWT.
- **Dependencies**: None.
- **Risks**: External provider changes breaking authentication.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT STATELESS GOOGLE OAUTH
  WHY: Restricting SSO to local passwords reduces accessibility.
  WHAT: Create Google OAuth credentials link, verify codes statelessly at the delivery layer, and issue lightweight identity JWTs.
  ```

## Iteration 23: Implement Stateless GitHub OAuth

- **Value delivered**: Expands single-sign-on options for developer-centric users.
- **Definition of Done**: GitHub OAuth endpoint integrated following the exact same stateless flow as Google.
- **Dependencies**: Iteration 22.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT STATELESS GITHUB OAUTH
  WHY: Multiple OAuth providers must follow a unified stateless flow to prevent fragmentation.
  WHAT: Integrate GitHub OAuth login, verifying codes statelessly and linking them to a unified User account.
  ```

## Iteration 24: Add Geographic Fields to User Profile

- **Value delivered**: Sets the schema foundation for localized, climate-aware agricultural rules.
- **Definition of Done**: User profile stores `postalCode`, `country`, `timezone`, and `hemisphere`.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  ADD GEOGRAPHIC FIELDS TO USER PROFILE
  WHY: Storing geographic context in JWTs bloats headers. We need these fields on the User document for location-specific logic.
  WHAT: Add postalCode, country, timezone, and hemisphere properties to the User aggregate and schema.
  ```

## Iteration 25: Build Redis Cache Repository with Memory Fallback

- **Value delivered**: Enables rapid access to geographic contexts without database bottlenecks.
- **Definition of Done**: `RedisCacheRepository` implemented with immediate local memory fallback for resilience.
- **Dependencies**: Iteration 24.
- **Risks**: Redis connection drops causing hangs.
- **Prompt for /speckit.specify**:
  ```text
  BUILD REDIS CACHE REPOSITORY WITH MEMORY FALLBACK
  WHY: Dynamic geolocalized queries must utilize high-performance, resilient caching to avoid DB lag.
  WHAT: Build a CacheRepository port using Redis, incorporating an immediate, short-lived local memory fallback on connection failure.
  ```

---

# Phase 2: Taxonomy & Social

## Iteration 26: Introduce Collaborator Role in Auth Middleware

- **Value delivered**: Enables secure community-driven catalog updates.
- **Definition of Done**: `collaborator` role is recognized in authorization middleware and applied to catalog write endpoints.
- **Dependencies**: None.
- **Risks**: Broadening access inadvertently if role hierarchy is flawed.
- **Prompt for /speckit.specify**:
  ```text
  INTRODUCE COLLABORATOR ROLE IN AUTH MIDDLEWARE
  WHY: Admin-only catalog updates restrict cooperative maintenance of botanical data.
  WHAT: Add the collaborator role to UserRoles and authorization middleware, allowing read-write access to shared botanical datasets.
  ```

## Iteration 27: Enable Polymorphic Lookups for Family Mutations

- **Value delivered**: Simplifies API consumer usage by allowing slug-based updates.
- **Definition of Done**: Polymorphic `idOrSlug` lookup is extended to mutation routes (`PATCH`, `DELETE` Families).
- **Dependencies**: Iteration 26.
- **Risks**: Accidentally overriding records if slugs collide.
- **Prompt for /speckit.specify**:
  ```text
  ENABLE POLYMORPHIC LOOKUPS FOR FAMILY MUTATIONS
  WHY: Supporting polymorphic id/slug updates simplifies API consumer usage.
  WHAT: Refactor Family mutation endpoints (PATCH, DELETE) to accept both UUID and slug identifiers in the routing parameter.
  ```

## Iteration 28: Implement Private User Bookmarks Collection

- **Value delivered**: Provides a high-performance productivity tool for users to bookmark favorite plants without causing document size bloat.
- **Definition of Done**: Bookmarks are stored in a private `user_bookmarks` collection with CRUD endpoints.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT PRIVATE USER BOOKMARKS COLLECTION
  WHY: Storing active users lists inside a single catalog document leads to write contention and violates MongoDB 16MB limits.
  WHAT: Create a private user bookmarks aggregate, collection, and specific CRUD endpoints isolated per user.
  ```

## Iteration 29: Project Social Interaction Counters on Plant

- **Value delivered**: Enables social popularity ranking without heavy query joins.
- **Definition of Done**: Likes and dislikes project as read-only counters (`likesCount`, `dislikesCount`) on the `Plant` aggregate.
- **Dependencies**: None.
- **Risks**: Syncing projected counters with individual interaction events.
- **Prompt for /speckit.specify**:
  ```text
  PROJECT SOCIAL INTERACTION COUNTERS ON PLANT
  WHY: Dynamically aggregating likes on every catalog fetch destroys read performance.
  WHAT: Persist social actions in a separate collection, projecting them as read-only numeric counters on the Plant document.
  ```

---

# Phase 3: Botanical Enhancements

## Iteration 30: Make Plant Sowing Block Optional

- **Value delivered**: Enables cataloging non-seed and vegetatively propagated plants.
- **Definition of Done**: `Plant` aggregate sowing block is refactored to be optional.
- **Dependencies**: Iteration 12.
- **Risks**: Validation failure of legacy plant seed-mandatory records.
- **Prompt for /speckit.specify**:
  ```text
  MAKE PLANT SOWING BLOCK OPTIONAL
  WHY: Sterile or vegetatively propagated crops lack seed characteristics. The sowing block must be optional.
  WHAT: Refactor the `Plant` aggregate and its Zod schema to make the phenology.sowing block optional.
  ```

## Iteration 31: Apply Southern Hemisphere Sowing Calendar Shift

- **Value delivered**: Ensures global users receive accurate planting calendars without duplicating catalog data.
- **Definition of Done**: If user profile hemisphere is `'south'`, crop calendars shift by 6 months dynamically in-memory.
- **Dependencies**: Iteration 24.
- **Risks**: Calculation errors in circular modular arithmetic.
- **Prompt for /speckit.specify**:
  ```text
  APPLY SOUTHERN HEMISPHERE SOWING CALENDAR SHIFT
  WHY: Southern hemisphere users require circular calendar shifts applied to the northern catalog to prevent unseasonal crop failure.
  WHAT: Apply a dynamic 6-month modular shift to Plant sowing/flowering/harvesting months if the User profile hemisphere is 'south'.
  ```

## Iteration 32: Implement PlantRelation Aggregate and Repository

- **Value delivered**: Establishes the core data structure for biological synergies.
- **Definition of Done**: `PlantRelation` aggregate and repository (`plant_relations` collection) are created.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT PLANTRELATION AGGREGATE AND REPOSITORY
  WHY: Plants interact directionally. Storing synergies as independent directed edges enables graph-based proximity checks.
  WHAT: Create a standalone `PlantRelation` aggregate root and MongoDB repository for directed ecological interactions.
  ```

## Iteration 33: Expose PlantRelation CRUD Endpoints

- **Value delivered**: Allows authorized users to manage the companion planting graph.
- **Definition of Done**: Write APIs for `PlantRelation` are implemented, restricted to Admin/Collaborator roles.
- **Dependencies**: Iteration 26, Iteration 32.
- **Risks**: Orphaned relationships if a referenced plant species is deleted.
- **Prompt for /speckit.specify**:
  ```text
  EXPOSE PLANTRELATION CRUD ENDPOINTS
  WHY: The companion graph must be manageable by authorized ecological contributors.
  WHAT: Implement CRUD endpoints for PlantRelations, restricting write operations to Admin and Collaborator roles.
  ```

---

# Phase 4: Organics & Diagnostics

## Iteration 34: Implement Anomaly Domain and CRUD Endpoints

- **Value delivered**: Unifies crop diagnosis (pests, diseases, weeds) into a central database.
- **Definition of Done**: `Anomaly` aggregate, collection, and Admin/Collaborator CRUD endpoints are fully implemented.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT ANOMALY DOMAIN AND CRUD ENDPOINTS
  WHY: Small-scale growers require unified diagnosis guidance for pests, diseases, and disorders.
  WHAT: Implement `Anomaly` aggregate root, collection, and CRUD endpoints (Admin/Collaborator write, Public read).
  ```

## Iteration 35: Implement GardenInput Domain and CRUD Endpoints

- **Value delivered**: Catalogs organic remedies, treatments, and bio-stimulants with structured recipes.
- **Definition of Done**: `GardenInput` aggregate and CRUD endpoints are fully implemented.
- **Dependencies**: None.
- **Risks**: Schema complexity.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT GARDENINPUT DOMAIN AND CRUD ENDPOINTS
  WHY: Organic remedies need structured recipes and dosages to be effectively applied.
  WHAT: Implement `GardenInput` aggregate root, collection, and CRUD endpoints.
  ```

## Iteration 36: Map Therapeutic Links in Anomaly Documents

- **Value delivered**: Connects diagnostics to actionable cures.
- **Definition of Done**: `treatments` property (array of `GardenInput` UUIDs) is added to `Anomaly` documents.
- **Dependencies**: Iteration 34, Iteration 35.
- **Risks**: Broken reference links.
- **Prompt for /speckit.specify**:
  ```text
  MAP THERAPEUTIC LINKS IN ANOMALY DOCUMENTS
  WHY: Anomalies must point to the specific inputs used to cure them.
  WHAT: Add a treatments array to the Anomaly schema to persist therapeutic links as foreign references to GardenInputs.
  ```

## Iteration 37: Build Organic Dilution Calculator Service

- **Value delivered**: Eliminates crop-burn risk via precise, local spray-tank volumetric dilutions.
- **Definition of Done**: An application utility service calculates dilution formulas based on spray tank volume (L) and ratio strings (`1:N`).
- **Dependencies**: Iteration 35.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  BUILD ORGANIC DILUTION CALCULATOR SERVICE
  WHY: Simple dilution math ensures safe application of bio-stimulants, standardizing spray tank dosing.
  WHAT: Build a calculation utility mapping input liters and ratio factors (1:N) to milliliters and water liters.
  ```

---

# Phase 5: Spatial Engine Prep

## Iteration 38: Extract PlantInstance into Standalone Collection

- **Value delivered**: Resolves database size limits and enables efficient spatial queries by breaking the embedded document anti-pattern.
- **Definition of Done**: `PlantInstances` are extracted from the `Bed` aggregate into a standalone `plant_instances` collection with its own repository.
- **Dependencies**: Iteration 17.
- **Risks**: Breaking legacy spatial validation logic during extraction.
- **Prompt for /speckit.specify**:
  ```text
  EXTRACT PLANTINSTANCE INTO STANDALONE COLLECTION
  WHY: Embedding crop records inside Beds restricts direct querying and prevents efficient spatial checks.
  WHAT: Extract PlantInstance into its own aggregate, collection, and repository. Write a migrate-mongo script for existing embedded data.
  ```

## Iteration 39: Standardize Soft Deletion on Plant Aggregate

- **Value delivered**: Prepares the unified soft-deletion contract before building complex time-travel spatial engines.
- **Definition of Done**: `Plant` aggregate uses `status: 'active' | 'removed'` and `deletedAt: Date | null`.
- **Dependencies**: None.
- **Risks**: Breaking ATDD tests asserting old boolean properties.
- **Prompt for /speckit.specify**:
  ```text
  STANDARDIZE SOFT DELETION ON PLANT AGGREGATE
  WHY: Inconsistent soft-deletion schemas make analytics error-prone.
  WHAT: Refactor Plant aggregate to use a unified status field ('active'|'removed') and a deletedAt timestamp.
  ```

## Iteration 40: Standardize Soft Deletion on Bed and PlantInstance

- **Value delivered**: Completes the unified soft-deletion contract across all core aggregates.
- **Definition of Done**: `Bed` and `PlantInstance` use the unified `status` and `deletedAt` schema.
- **Dependencies**: Iteration 38.
- **Risks**: Breaking existing use cases that query using old legacy statuses.
- **Prompt for /speckit.specify**:
  ```text
  STANDARDIZE SOFT DELETION ON BED AND PLANTINSTANCE
  WHY: All spatial entities must follow the exact same soft-deletion contract for the time-travel engine to work correctly.
  WHAT: Refactor Bed and PlantInstance to use the unified status ('active'|'removed') and deletedAt timestamp fields.
  ```

## Iteration 41: Add Optimistic Concurrency Control (Version) to Bed

- **Value delivered**: Prepares the Bed for transactional locking to prevent spatial race conditions.
- **Definition of Done**: A `version` property is added to `Bed`. Write operations increment the version.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  ADD OPTIMISTIC CONCURRENCY CONTROL TO BED
  WHY: Concurrent crop placements in the same bed can cause overlapping errors if not locked.
  WHAT: Add a version property to the Bed aggregate. Ensure aggregate updates increment this version for OCC.
  ```

## Iteration 42: Wrap Cross-Aggregate Mutations in ACID Transactions

- **Value delivered**: Guarantees atomic spatial placements across decoupled collections.
- **Definition of Done**: Standalone `PlantInstance` creations and associated `Bed` version increments execute atomically inside a MongoDB `ClientSession`.
- **Dependencies**: Iteration 38, Iteration 41.
- **Risks**: Transactions require MongoDB Replica Sets, which must be perfectly configured in development.
- **Prompt for /speckit.specify**:
  ```text
  WRAP CROSS-AGGREGATE MUTATIONS IN ACID TRANSACTIONS
  WHY: Because PlantInstances and Beds are in separate collections, mutations must be atomic to preserve OCC locks.
  WHAT: Update use cases handling crop placement to wrap repository saves inside MongoDB ACID transaction sessions.
  ```

---

# Phase 6: Telemetry

## Iteration 43: Implement Winston Kafka Transport

- **Value delivered**: Offloads high-volume application logging from the HTTP thread to prevent response delays.
- **Definition of Done**: A custom Winston logging transport is built with a bounded in-memory ring buffer (fail-silent policy).
- **Dependencies**: None.
- **Risks**: High memory consumption if the ring buffer size is too large.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT WINSTON KAFKA TRANSPORT
  WHY: Writing logs synchronously blocks execution. Telemetry outages must never crash the server.
  WHAT: Implement a Winston Kafka transport with a bounded, fail-silent ring buffer that silently drops logs if Kafka is unreachable.
  ```

## Iteration 44: Add PII Masking Formatters for Telemetry

- **Value delivered**: Strictly protects user privacy and IP coordinates in telemetry logs.
- **Definition of Done**: Winston formatters apply regex masking on keywords (password, token, position) before dispatching.
- **Dependencies**: Iteration 43.
- **Risks**: Over-aggressive masking hiding useful diagnostic data.
- **Prompt for /speckit.specify**:
  ```text
  ADD PII MASKING FORMATTERS FOR TELEMETRY
  WHY: Personally identifiable information and exact coordinates must never leak to brokers.
  WHAT: Build Winston regex formatters to dynamically mask passwords, tokens, and location fields in diagnostic logs.
  ```

## Iteration 45: Stream Telemetry to Kafka App Logs Topic

- **Value delivered**: Completes the telemetry pipeline, feeding data to the PLG stack.
- **Definition of Done**: Winston transport is fully wired to stream structured JSON logs to the `agro.app.logs` topic.
- **Dependencies**: Iteration 44.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  STREAM TELEMETRY TO KAFKA APP LOGS TOPIC
  WHY: The PLG stack requires a stable, rate-limited Kafka buffer to ingest system logs.
  WHAT: Configure and wire the Winston Kafka transport to actively push sanitized logs to the `agro.app.logs` topic.
  ```

---

# Phase 7: Distributed Event Bus

## Iteration 46: Create Transactional Outbox Collection

- **Value delivered**: Establishes the database staging area for guaranteed event delivery.
- **Definition of Done**: An `outbox` collection is added to MongoDB schema.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  CREATE TRANSACTIONAL OUTBOX COLLECTION
  WHY: Publishing events directly to an external broker before DB commits succeed causes ghost events.
  WHAT: Create an outbox database collection to store serialized domain events temporarily.
  ```

## Iteration 47: Write Domain Events to Outbox within Transactions

- **Value delivered**: Guarantees atomic domain state and event logging without ghost events.
- **Definition of Done**: Application use cases write target aggregates and outbox event records atomically within single MongoDB client sessions.
- **Dependencies**: Iteration 42, Iteration 46.
- **Risks**: Increased write latency.
- **Prompt for /speckit.specify**:
  ```text
  WRITE DOMAIN EVENTS TO OUTBOX WITHIN TRANSACTIONS
  WHY: Events must be persisted in the exact same transaction as the state mutation they represent.
  WHAT: Update application use cases to persist aggregates and log serialized events into the outbox atomically via ClientSessions.
  ```

## Iteration 48: Implement MongoDB Change Stream Tailer for Outbox

- **Value delivered**: Enables decoupled, high-performance asynchronous event dispatching.
- **Definition of Done**: A background worker tails the `outbox` collection via Change Streams, processing unpublished entries.
- **Dependencies**: Iteration 46.
- **Risks**: Change stream socket drops.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT MONGODB CHANGE STREAM TAILER FOR OUTBOX
  WHY: Tailing database writes asynchronously ensures at-least-once non-blocking delivery.
  WHAT: Build a Change Stream tailer to poll the outbox collection for new inserts, including a fallback polling query for rotated oplogs.
  ```

## Iteration 49: Route Events to Kafka Domain Topic by Partition Key

- **Value delivered**: Guarantees strict chronological processing order for specific crops or beds.
- **Definition of Done**: The tailer publishes events to `agro.domain.events` using dynamic partition keys (`plantInstanceId` or `bedId`). Processed outbox events are flagged.
- **Dependencies**: Iteration 48.
- **Risks**: Broker connection failures.
- **Prompt for /speckit.specify**:
  ```text
  ROUTE EVENTS TO KAFKA DOMAIN TOPIC BY PARTITION KEY
  WHY: To prevent race conditions, events for the same bed or plant must be routed to the same physical Kafka partition.
  WHAT: Implement a Kafka EventBus adapter routing messages via plantInstanceId or bedId partitions, and flag them as processed in the outbox.
  ```

## Iteration 50: Implement Consumer Idempotence with TTL Store

- **Value delivered**: Protects asynchronous side-effects against duplicate message processing.
- **Definition of Done**: Kafka consumers implement an idempotence check, tracking processed UUIDs in a store with a TTL.
- **Dependencies**: Iteration 49.
- **Risks**: Redis/Store drops causing idempotence failures.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT CONSUMER IDEMPOTENCE WITH TTL STORE
  WHY: At-least-once delivery guarantees duplicates. Consumers must be strictly idempotent.
  WHAT: Build consumer idempotence validation using a TTL-backed event store (Redis/Mongo) to track processed message UUIDs.
  ```

## Iteration 51: Build Progressive Retry and DLQ Consumer Flows

- **Value delivered**: Secures event processing against transient drops and poison pills without blocking partitions.
- **Definition of Done**: Processing failures are redirected to progressive retry topics (`retry.5s`) and eventually to a DLQ.
- **Dependencies**: Iteration 50.
- **Risks**: Infinite message loops if offset commits fail.
- **Prompt for /speckit.specify**:
  ```text
  BUILD PROGRESSIVE RETRY AND DLQ CONSUMER FLOWS
  WHY: Poison pills or transient DB drops must not block healthy messages in the same partition.
  WHAT: Route consumer exceptions through progressive delay topics. If retries are exhausted, route to a Dead Letter Queue (DLQ).
  ```

---

# Phase 8: Inventory

## Iteration 52: Implement SeedBatch Aggregate and Repository

- **Value delivered**: Allows tracking of private seed stocks and packet properties.
- **Definition of Done**: `SeedBatch` aggregate root and collection are created.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT SEEDBATCH AGGREGATE AND REPOSITORY
  WHY: Small-scale farmers need to track personal seed stocks and expiration dates.
  WHAT: Build `SeedBatch` aggregate and MongoDB repository, tracking packet metadata and remaining quantities.
  ```

## Iteration 53: Add GerminationTest Subdocuments to SeedBatch

- **Value delivered**: Establishes the data structure for logging seed viability trials.
- **Definition of Done**: An array of nested `GerminationTest` sub-documents is added to `SeedBatch`.
- **Dependencies**: Iteration 52.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  ADD GERMINATIONTEST SUBDOCUMENTS TO SEEDBATCH
  WHY: Seed viability degrades; users must track germination trials under specific conditions.
  WHAT: Add nested `GerminationTest` sub-documents to the SeedBatch aggregate to record trial outcomes.
  ```

## Iteration 54: Calculate Germination Rates Dynamically in Domain

- **Value delivered**: Provides real-time, accurate seed viability statistics without background cron jobs.
- **Definition of Done**: Germination success dynamically updates the batch's `germinationRate` via pure domain methods.
- **Dependencies**: Iteration 53.
- **Risks**: Division by zero errors if no tests are present.
- **Prompt for /speckit.specify**:
  ```text
  CALCULATE GERMINATION RATES DYNAMICALLY IN DOMAIN
  WHY: Germination statistics must reflect the latest trials.
  WHAT: Implement pure domain methods on SeedBatch to dynamically compute `germinationRate` based on nested test results.
  ```

## Iteration 55: Expose SeedBatch CRUD Endpoints

- **Value delivered**: Allows the frontend to manage seed inventories.
- **Definition of Done**: CRUD endpoints for SeedBatches and GerminationTests are exposed and documented in OpenAPI.
- **Dependencies**: Iteration 54.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  EXPOSE SEEDBATCH CRUD ENDPOINTS
  WHY: Users need API access to manage their private seed inventories.
  WHAT: Implement CRUD routes for SeedBatches and a dedicated endpoint to append GerminationTests.
  ```

---

# Phase 9: Spatial Engine Core

## Iteration 56: Build 2D Euclidean Proximity Calculator

- **Value delivered**: Provides the math foundation for spacing validation.
- **Definition of Done**: `SpatialService` calculates distances between crops based on mature spacing constraints.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  BUILD 2D EUCLIDEAN PROXIMITY CALCULATOR
  WHY: Ground and raised beds require precise proximity math to enforce plant spacing constraints.
  WHAT: Implement the core 2D Euclidean distance calculation in `SpatialService` matching distances against plant spacing requirements.
  ```

## Iteration 57: Implement SFG 30cm Virtual Grid Snapping

- **Value delivered**: Supports highly optimized urban Square Foot Gardening layouts.
- **Definition of Done**: Continuous centimeter placements snap to virtual 30cm cell centers if `isSfg` is enabled.
- **Dependencies**: Iteration 56.
- **Risks**: Snapping logic breaking continuous geometry assumptions.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT SFG 30CM VIRTUAL GRID SNAPPING
  WHY: Urban setups are highly optimized for standardized Square Foot Gardening grids.
  WHAT: Add snapping math to `SpatialService` that quantizes continuous coordinates into 30cm cell centers if `isSfg` is true.
  ```

## Iteration 58: Implement Container Volumetric Capacity Validation

- **Value delivered**: Prevents root-bound stress and soil exhaustion in pot gardening.
- **Definition of Done**: `SpatialService` compares root depth requirements against container `depthCm` and tracks total soil capacity.
- **Dependencies**: Iteration 57.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT CONTAINER VOLUMETRIC CAPACITY VALIDATION
  WHY: Container gardening relies on finite soil volumes rather than endless 2D planes.
  WHAT: Implement capacity tracking in `SpatialService` for container beds, comparing total plant root volumes against container capacity.
  ```

## Iteration 59: Block Exact 0cm Geometric Overlaps

- **Value delivered**: Prevents impossible physical realities without frustrating the user with overly strict spacing errors.
- **Definition of Done**: Exact geometric collisions of 0cm throw hard domain exceptions.
- **Dependencies**: Iteration 58.
- **Risks**: Floating point rounding errors causing false 0cm flags.
- **Prompt for /speckit.specify**:
  ```text
  BLOCK EXACT 0CM GEOMETRIC OVERLAPS
  WHY: While spacing overlaps are advisory, two plants occupying the exact same mathematical point is physically impossible.
  WHAT: Enforce a strict blocking exception in `SpatialService` if two instances resolve to the exact same (x,y) coordinates.
  ```

## Iteration 60: Generate Advisory Warnings for Spatial Overlaps

- **Value delivered**: Provides flexible layout feedback without halting user actions.
- **Definition of Done**: Spacing and boundary validation failures are returned as advisory warnings inside the `ecologicalReport`.
- **Dependencies**: Iteration 59.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  GENERATE ADVISORY WARNINGS FOR SPATIAL OVERLAPS
  WHY: Strict blocking on spacing overlaps prevents dense permaculture techniques; users need warnings, not errors.
  WHAT: Refactor spatial calculations to return an array of advisory warnings instead of throwing exceptions for normal overlaps.
  ```

---

# Phase 10: Microclimates

## Iteration 61: Add shadeZones to Bed Aggregate

- **Value delivered**: Maps localized shadows to optimize crop placements.
- **Definition of Done**: `shadeZones` bounding boxes are added to `Bed` schema.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  ADD SHADEZONES TO BED AGGREGATE
  WHY: Beds have varied shadows; localized mapping is needed for microclimate optimizations.
  WHAT: Add `shadeZones` bounding boxes (startX, startY, endX, endY, exposure) to the Bed aggregate.
  ```

## Iteration 62: Validate Localized Sun Exposure against Plant Preferences

- **Value delivered**: Prevents solar stress by matching crops to their ideal light conditions.
- **Definition of Done**: `SpatialService` resolves (x,y) exposure and compares it against `Plant` light traits to generate warnings.
- **Dependencies**: Iteration 61.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  VALIDATE LOCALIZED SUN EXPOSURE AGAINST PLANT PREFERENCES
  WHY: Crops placed in incorrect localized exposure suffer solar stress or stunt.
  WHAT: Compute localized exposure at coordinate (x,y) using shadeZones, comparing it with Plant requirements to generate warnings.
  ```

## Iteration 63: Bypass 2D Collisions for Complementary Vertical Strata

- **Value delivered**: Enables dense permacultural designs like Three Sisters guilds.
- **Definition of Done**: Spatial engine incorporates biological `stratum` types to bypass overlap warnings for different vertical zones.
- **Dependencies**: Iteration 60.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  BYPASS 2D COLLISIONS FOR COMPLEMENTARY VERTICAL STRATA
  WHY: Permaculture layers (e.g., roots and climbers) share 2D footprints harmoniously without competing for physical canopy space.
  WHAT: Update `SpatialService` to bypass 2D collision alerts if the intersecting plants possess complementary strata traits.
  ```

## Iteration 64: Scale Down Advisory Spacing for Beneficial Companions

- **Value delivered**: Supports high-density synergistic plantings naturally.
- **Definition of Done**: Mature spacing requirements are scaled down by 20% for strong beneficial companions in the spatial math.
- **Dependencies**: Iteration 63.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  SCALE DOWN ADVISORY SPACING FOR BENEFICIAL COMPANIONS
  WHY: Strong companions thrive under tighter proximity than conservative monoculture defaults allow.
  WHAT: Update `SpatialService` to scale spacing requirements down by 20% if a beneficial edge exists in the PlantRelation graph.
  ```

---

# Phase 11: Interactive Layout API

## Iteration 65: Block Bed Resizing if Active Crops Overflow Boundaries

- **Value delivered**: Ensures physical reality isn't broken by shrinking a bed underneath living crops.
- **Definition of Done**: Modifying Bed dimensions throws `DomainConflictException` if active instances overflow.
- **Dependencies**: Iteration 38.
- **Risks**: Read-performance penalty during resizing check.
- **Prompt for /speckit.specify**:
  ```text
  BLOCK BED RESIZING IF ACTIVE CROPS OVERFLOW BOUNDARIES
  WHY: Resizing growing beds below the coordinates of active crops breaks the spatial model.
  WHAT: Build a boundary check orchestrated by the UpdateBed usecase, querying active crops and blocking updates if centers overflow.
  ```

## Iteration 66: Implement Stateless Layout Simulation Endpoint

- **Value delivered**: Optimizes network footprint during rapid visual Drag & Drop edits.
- **Definition of Done**: `POST /api/v1/beds/:id/layout/validate` runs spatial engine in-memory with 0 writes and ignores SeedBank checks.
- **Dependencies**: Iteration 60, Iteration 62.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT STATELESS LAYOUT SIMULATION ENDPOINT
  WHY: Direct persistence during drag-and-drop movement is a high-contention anti-pattern.
  WHAT: Create a stateless validation endpoint that runs the spatial engine in-memory, returning the ecological report with 0 database writes.
  ```

## Iteration 67: Implement Transactional Batch Save Layout Endpoint

- **Value delivered**: Consolidates grid modifications into safe, atomic operations.
- **Definition of Done**: `PUT /api/v1/beds/:id/layout` clears active instances and persists new coordinates in a single ClientSession transaction.
- **Dependencies**: Iteration 42, Iteration 66.
- **Risks**: OCC lock contention under concurrent saves.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT TRANSACTIONAL BATCH SAVE LAYOUT ENDPOINT
  WHY: Saving individual crop positions sequentially causes race conditions and broken states.
  WHAT: Create a transactional batch save endpoint that clears previous layout instances and persists the new coordinates atomically.
  ```

## Iteration 68: Persist Pre-computed Ecological Reports on Bed

- **Value delivered**: Guarantees ultra-fast O(1) reads for layout retrieval.
- **Definition of Done**: Batch save endpoint pre-calculates warnings and stores them natively on Bed/Instance documents. GET routes read these snapshots directly.
- **Dependencies**: Iteration 67.
- **Risks**: Snapshots becoming stale if catalog definitions change (solved eventually by background Kafka workers).
- **Prompt for /speckit.specify**:
  ```text
  PERSIST PRE-COMPUTED ECOLOGICAL REPORTS ON BED
  WHY: Recalculating Euclidean proximities on every GET request ruins read performance.
  WHAT: Modify the batch save endpoint to persist the computed `ecologicalReport` and `warnings` as direct document properties for O(1) reads.
  ```

## Iteration 69: Publish BedLayoutSaved Event to Kafka

- **Value delivered**: Triggers safe asynchronous side-effects (like inventory deductions) without blocking the HTTP thread.
- **Definition of Done**: Batch save endpoint writes `BedLayoutSaved` event to outbox, which streams to Kafka.
- **Dependencies**: Iteration 47, Iteration 68.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  PUBLISH BEDLAYOUTSAVED EVENT TO KAFKA
  WHY: Heavy side-effects like SeedBank deductions should not block the layout save transaction.
  WHAT: Emit a consolidated `BedLayoutSaved` domain event during layout saves to trigger asynchronous inventory and reminder recalculations.
  ```

---

# Phase 12: Garden Events

## Iteration 70: Implement Append-Only Event Aggregate with Scopes

- **Value delivered**: Provides a chronological agricultural log for tracking history.
- **Definition of Done**: Append-only `Event` entity implemented with explicit `scope: 'bed' | 'instance'`.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT APPEND-ONLY EVENT AGGREGATE WITH SCOPES
  WHY: Tracking horticultural history is essential for diagnostic analysis. Scope-based logging avoids "magic nulls".
  WHAT: Create append-only Event entity. Validate scopes ('bed'|'instance').
  ```

## Iteration 71: Validate plantId Presence Rules per Event Type

- **Value delivered**: Ensures precise agronomic logging (e.g., harvesting species vs watering soil).
- **Definition of Done**: Bed-scoped events restrict `plantId` correctly (mandatory for harvest, optional for pruning, forbidden for watering).
- **Dependencies**: Iteration 70.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  VALIDATE PLANTID PRESENCE RULES PER EVENT TYPE
  WHY: Watering targets soil (agnostic), but harvesting targets a specific species. The Event payload must enforce this.
  WHAT: Implement strict agronomic validation rules governing the presence of `plantId` in Bed-scoped events based on the event type.
  ```

## Iteration 72: Expose Event CRUD Endpoints

- **Value delivered**: Connects the UI to the chronological log engine.
- **Definition of Done**: CRUD endpoints for Events exposed with query filter support.
- **Dependencies**: Iteration 71.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  EXPOSE EVENT CRUD ENDPOINTS
  WHY: Users need API access to view and record agricultural journal entries.
  WHAT: Implement standard CRUD routes for Events, supporting query DSL filtering by type, bedId, and plantInstanceId.
  ```

## Iteration 73: Implement Nested Soil Analysis Log on Bed

- **Value delivered**: Tracks key chemical and structural soil measurements over time to enrich diagnostics.
- **Definition of Done**: A nested historical reading log (pH, texture, organic matter) is added to `Bed`.
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT NESTED SOIL ANALYSIS LOG ON BED
  WHY: Nutrient availability is heavily governed by structural soil health (pH, texture).
  WHAT: Create a nested chronological soil analysis reading log on the Bed aggregate, linking qualitative traits with amendments.
  ```

---

# Phase 13: Nurseries & Analytics

## Iteration 74: Support Null Coordinates for Nursery Establishments

- **Value delivered**: Replicates real physical gardening lifecycles (starter trays).
- **Definition of Done**: Sowing in nurseries (`establishment: 'nursery'`) allows `null` coordinates and bypasses spatial checks.
- **Dependencies**: None.
- **Risks**: UI components expecting strict coordinates crashing.
- **Prompt for /speckit.specify**:
  ```text
  SUPPORT NULL COORDINATES FOR NURSERY ESTABLISHMENTS
  WHY: Crops often begin in starter trays with no coordinates before being transplanted to final beds.
  WHAT: Update PlantInstance validation to support null coordinates for nursery establishment, bypassing geometric checks.
  ```

## Iteration 75: Implement Transplant API with Spatial Validation

- **Value delivered**: Transitions virtual seedlings into the physical spatial reality safely.
- **Definition of Done**: Transplant API takes `bedId` and coordinates, executes spatial checks, updates status, and records a `'transplant'` event.
- **Dependencies**: Iteration 74.
- **Risks**: Coordinate synchronization errors during transplant state transitions.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT TRANSPLANT API WITH SPATIAL VALIDATION
  WHY: Surviving nursery seedlings must be transplanted to physical beds safely.
  WHAT: Implement a transplant API that assigns positions, triggers on-the-fly spatial validations, updates status to vegetative, and logs an event.
  ```

## Iteration 76: Decrement SeedBatch Stock via Kafka Consumers

- **Value delivered**: Keeps inventory accurate without causing transaction bottlenecks.
- **Definition of Done**: Asynchronous consumer decrements `remainingQuantity` upon receiving `BedLayoutSaved` or nursery sowing events.
- **Dependencies**: Iteration 51, Iteration 52, Iteration 69.
- **Risks**: Inaccurate quantities if events are dropped (prevented by Outbox pattern).
- **Prompt for /speckit.specify**:
  ```text
  DECREMENT SEEDBATCH STOCK VIA KAFKA CONSUMERS
  WHY: Synchronous stock updates block layout saving. Inventory should deplete eventually.
  WHAT: Build an idempotent Kafka consumer listening to layout/sowing events that decrements SeedBatch remaining quantities asynchronously.
  ```

## Iteration 77: Compute 36-Month Family Occupancy via DB Aggregation

- **Value delivered**: Analyzes crop rotation histories rapidly without hydrating massive object graphs in Node.js.
- **Definition of Done**: An optimized MongoDB Aggregation Pipeline calculates cumulative active days per botanical family using flat `HistoricalCropSummary` projections.
- **Dependencies**: None.
- **Risks**: Aggregation pipeline performance on huge beds.
- **Prompt for /speckit.specify**:
  ```text
  COMPUTE 36-MONTH FAMILY OCCUPANCY VIA DB AGGREGATION
  WHY: Hydrating full historical entities in RAM to calculate rotation blocks the event loop.
  WHAT: Query 36 months of bed history using flat projections and compute cumulative active days per family via MongoDB Aggregations.
  ```

## Iteration 78: Generate Advisory Warnings for Soil Depletion

- **Value delivered**: Warns growers before pathogen and nutrient depletion occurs.
- **Definition of Done**: Spatial engine raises non-blocking warnings if cumulative family occupancy exceeds thresholds (e.g., 365 days).
- **Dependencies**: Iteration 77, Iteration 68.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  GENERATE ADVISORY WARNINGS FOR SOIL DEPLETION
  WHY: Growing the same botanical family repeatedly depletes specific soil nutrients.
  WHAT: Integrate the 36-month DB aggregation into the SpatialService to emit non-blocking advisory warnings if threshold active days are exceeded.
  ```

---

# Phase 14: Reminders Engine

## Iteration 79: Implement Stateful Reminder Aggregate and CRUD

- **Value delivered**: Minimizes cognitive overhead for growers by compiling an explicit daily care calendar.
- **Definition of Done**: `Reminder` aggregate, collection, and CRUD routes created (`pending`, `completed`, `dismissed`).
- **Dependencies**: None.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT STATEFUL REMINDER AGGREGATE AND CRUD
  WHY: Calculating crop schedules in real-time on every load causes massive bottlenecks. Persisted state ensures O(1) reads.
  WHAT: Implement `Reminder` aggregate and standard CRUD endpoints.
  ```

## Iteration 80: Reschedule Reminders Passively via Kafka Events

- **Value delivered**: Keeps care schedules perfectly synced with real actions.
- **Definition of Done**: Logging a cultivation event completes matching pending Reminders and schedules the next iteration asynchronously.
- **Dependencies**: Iteration 79, Iteration 72, Iteration 51.
- **Risks**: Race conditions in asynchronous scheduling.
- **Prompt for /speckit.specify**:
  ```text
  RESCHEDULE REMINDERS PASSIVELY VIA KAFKA EVENTS
  WHY: Care calendars must react to real logged actions to stay accurate.
  WHAT: Build Kafka consumers that listen to Event creation, complete matching pending Reminders, and schedule the next task automatically.
  ```

## Iteration 81: Dismiss Reminders on PlantInstance Deletion

- **Value delivered**: Prevents ghost alerts for plants that no longer exist.
- **Definition of Done**: Soft-deleting a PlantInstance triggers cascading dismissal of its pending Reminders.
- **Dependencies**: Iteration 80, Iteration 40.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  DISMISS REMINDERS ON PLANTINSTANCE DELETION
  WHY: Users shouldn't receive watering alerts for dead or removed plants.
  WHAT: Implement a cascading Kafka consumer rule to dismiss instance-scoped Reminders when a PlantInstance is soft-deleted.
  ```

## Iteration 82: Dismiss Reminders on Bed Deletion

- **Value delivered**: Cleans up schedules when entire physical structures are removed.
- **Definition of Done**: Deleting a Bed dismisses all associated pending Reminders in cascade.
- **Dependencies**: Iteration 81.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  DISMISS REMINDERS ON BED DELETION
  WHY: Deleting a Bed must clean up all associated pending care tasks to prevent ghost alerts.
  WHAT: Implement a cascading Kafka consumer rule to dismiss all bed-scoped and associated instance-scoped Reminders when a Bed is deleted.
  ```

## Iteration 83: Integrate Open-Meteo Forecasts with Redis GeoHash

- **Value delivered**: Lays the foundation for meteorologically adaptive agriculture.
- **Definition of Done**: Open-Meteo API integration fetches precipitation. Weather results cache in Redis by GeoHash with a 2-hour TTL.
- **Dependencies**: Iteration 25.
- **Risks**: External API failures or rate limits.
- **Prompt for /speckit.specify**:
  ```text
  INTEGRATE OPEN-METEO FORECASTS WITH REDIS GEOHASH
  WHY: Static calendars ignore real weather. Calling APIs per user hits rate limits.
  WHAT: Integrate Open-Meteo precipitation forecasts. Cache data in Redis using a shared GeoHash key with a 2-hour TTL.
  ```

## Iteration 84: Implement Promise Deduplication for Weather Fetching

- **Value delivered**: Protects against thundering herds when thousands of reminders fire simultaneously.
- **Definition of Done**: First thread initiates Open-Meteo fetch; concurrent threads await the same Promise without making new HTTP requests.
- **Dependencies**: Iteration 83.
- **Risks**: Memory leaks if the Promise Map is not cleared on resolution.
- **Prompt for /speckit.specify**:
  ```text
  IMPLEMENT PROMISE DEDUPLICATION FOR WEATHER FETCHING
  WHY: Thousands of concurrent reminders fetching weather simultaneously will overwhelm Open-Meteo if the Redis cache is empty.
  WHAT: Implement lazy fetching via Promise Deduplication, storing pending fetches in a memory Map to ensure only 1 HTTP request goes out.
  ```

## Iteration 85: Delay Irrigation Reminders based on Precipitation

- **Value delivered**: Prevents water waste and soil oversaturation.
- **Definition of Done**: Irrigation reminders delay or dismiss if precipitation > 5mm based on cached weather data.
- **Dependencies**: Iteration 84, Iteration 79.
- **Risks**: Missing local static schedule fallbacks on API outage.
- **Prompt for /speckit.specify**:
  ```text
  DELAY IRRIGATION REMINDERS BASED ON PRECIPITATION
  WHY: Watering crops during or after rain over-saturates soil.
  WHAT: Update Reminders engine to check the Redis weather cache and delay/dismiss watering tasks if local precipitation exceeds 5mm.
  ```

## Iteration 86: Bypass Rain Delays for Indoor/Greenhouse Beds

- **Value delivered**: Ensures protected crops do not wither during outdoor storms.
- **Definition of Done**: Meteorological checks are bypassed for `'indoor'` and `'greenhouse'` beds.
- **Dependencies**: Iteration 85.
- **Risks**: None.
- **Prompt for /speckit.specify**:
  ```text
  BYPASS RAIN DELAYS FOR INDOOR/GREENHOUSE BEDS
  WHY: Protected environments have roofs; external rainfall does not water these crops.
  WHAT: Apply the Protected Environment Bypass rule in the Reminders engine, skipping Open-Meteo checks for indoor and greenhouse beds.
  ```
