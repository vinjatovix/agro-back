# System Context: Agro-Back

This document serves as the absolute technical baseline and source of truth for the **Agro** back-end. It details the actual implemented state of the codebase, maps it directly to the target architecture defined in the refined specification modules (`docs/spec/**`), and provides the gap analysis required to construct the new project roadmap.

---

## 1. Core System Purpose & Vision

**Agro-Back** is an enterprise-grade agricultural and urban garden layout planning engine. It operates as a biological and spatial calculator, going beyond simple CRUD operations to provide ecological intelligence. The system's vision is built on four core pillars:

1.  **Botanical Knowledge Catalog:** A taxonomical and cultural reference library of plants (`plants`) and families (`families`) describing optimal requirements (soil pH, sunlight exposure, root depths, watering) and seasonality calendars.
2.  **Spatial Distribution Validator:** A pure computational geometry engine that evaluates plant placement coordinate-by-coordinate in real-time. It computes spacing constraints and boundary collisions in an advisory, non-blocking manner (generating warnings), except for impossible $0\text{cm}$ physical overlaps which are strictly blocked.
3.  **Standalone Crop Instance Manager:** A temporal tracker of living crops (`plantInstance`) sown in physical spaces, tracking their growth phenology, establishment methods (nurseries vs. direct sowing), and dynamic warning lists.
4.  **Chronological Journal & Suggested Care Engine:** An append-only historical log of cultivation events (watering, pruning, harvests) that passively drives stateful, cached care reminders, dynamically adaptive to local weather forecasts (precipitation rain-silencing).

---

## 2. Technical Stack & Boundaries

The technical stack is strictly versioned and configured for high-performance, type-safe operations:

- **Runtime Engine:** Node.js v22.23.2 (running with native ES Modules, `"type": "module"`).
- **Language Specification:** TypeScript v6.0.2 in strict mode (no `any` types allowed).
- **Web Framework:** Express v4.22.1.
- **Dependency Injection (DI):** Awilix v13.0.3 and Awilix-Express v11.0.1 (scoped container-per-request).
- **Database / Persistence:** MongoDB v7.1.1 (Official native driver, binary UUID keys).
- **Logging & Diagnostics:** Winston v3.19.0.
- **Testing Ecosystem:** Jest v30.3.0 (`ts-jest`), Cucumber v12.8.1 (BDD features), Supertest v7.2.2.
- **Boundary Security:** Helmet v8.1.0, Cors v2.8.6, Express-Rate-Limit v8.3.2, BcryptJS v3.0.3, Google-Auth-Library v10.6.2, JSONWebToken v9.0.3.

### Tooling Transitions (Phase 0 Targets)

- **Request Validation:** Currently implemented using `express-validator` at the route boundary. The target state is migrating completely to **Zod**, utilizing a single source of schema truth to auto-generate the OpenAPI contract (`openapi.yaml`) and ensure zero contract drift.
- **Database Migrations:** Currently, schema indexes are declared programmatically on repository startup. The target state is transitioning to formal database migrations versioned under the `migrations/` folder and executed via `migrate-mongo` v14.0.7 during bootstrap.

---

## 3. Architecture & Clean Boundaries

The codebase adheres strictly to **Clean DDD-Inspired Hexagonal Architecture**, maintaining absolute separation of concerns across layers:

```
[ HTTP REST / Express Controllers ] ──► [ Application Use Cases ] ──► [ Pure Domain Model (Entities, VOs) ]
                 │                                                                     ▲
                 ▼                                                                     │
[ Validation Layer / Zod / OpenAPI ]                                          [ Spatial / Math Services ]
                 │                                                                     ▲
                 ▼                                                                     │
[ Persistence Layer / Mongo Query Translators ] ───────────────────────────────────────┘
```

### Strict Architectural Boundaries

1.  **Pure Domain Core:** The domain layer (`src/Contexts/*/domain`) is stateless, side-effect free, and holds zero technology dependencies. No database models, HTTP error structures, or framework utilities are allowed inside.
2.  **No DTOs in Domain:** Data Transfer Objects only exist at the system boundary (API / Use Case inputs). The domain only receives validated aggregates, entities, and rich Value Objects.
3.  **Audit Metadata Ownership:** Audit fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`) are mutated in memory directly by domain methods prior to persistence, ensuring read-after-write queries (`findById` post-update) can be completely bypassed.
4.  **CQRS Read-Only Bypass:** To maximize system throughput, read-only listings (GET queries) are officially permitted to bypass full rich domain aggregate hydration. Plain MongoDB projections map directly to boundary DTOs, validated by output schemas (Zod/OpenAPI).
5.  **Repository Retrieval Contract:** Repositories function purely as data retrieval mechanisms. They return nullable values (`null` or `undefined`) when a record is absent and never throw domain-level exceptions (like `DomainNotFoundException`), shifting error enforcement strictly to application use cases.

---

## 4. Modules Gap Analysis (Current vs. Target State)

To drive the new system roadmap, this section contrasts the current state of each module in the codebase against the target state defined in the refined specs.

### A. Beds Module

- **Current State in Code:**
  - Logical container representing physical growing boundaries.
  - Holds static physical dimensions (`width`, `height`, `depth`).
  - **Logical Coupling:** Physically embeds the array of `plantInstances` within its aggregate root (`Bed.ts`) and stores them nested inside the `beds` collection in MongoDB.
  - Soft-deletion uses a boolean flag (`deleted: boolean`) and timestamp (`deletedAt`).
- **Target State (Spec v1.3.0):**
  - **Decoupled Instances:** Completely detached from individual plant aggregates. Plant instances are persisted in their own independent `plant_instances` collection.
  - **Soft Delete Standardization:** Standardized to lowercase `status: 'active' | 'removed'` with `deletedAt: ISODate | null`.
  - **Resizing Validation Limits:** Modifying physical bed dimensions is validated against active plant instances. Resizing is strictly blocked (throwing a `DomainConflictException`) if any living crop center coordinate falls outside the proposed boundaries.
  - **Optimistic Concurrency Control (OCC):** Bed versioning tracks placements atomically using MongoDB ACID Multi-Document Transactions.

### B. PlantInstances Module

- **Current State in Code:**
  - Represented as a domain entity inside the Beds context directory structure (`src/Contexts/Agro/PlantInstances`), but has no application use cases, controllers, database collections, or repository interfaces of its own.
  - Managed strictly as an embedded array element within the `beds` database collection.
- **Target State (Spec v1.3.0):**
  - **Standalone Bounded Context:** Re-architected as a standalone aggregate root (`PlantInstance`) with its own dedicated MongoDB collection (`plant_instances`) and `PlantInstanceRepository`.
  - **Soft Delete & Space Liberation:** Standardized to `status: 'active' | 'removed'` with `deletedAt`. Soft-deleted instances are excluded from spatial checks, immediately liberating physical coordinates for subsequent plantings.
  - **Nursery Sowing & Seedbed Lifecycle:** Supports direct sowing vs. nursery trays (`establishment: 'direct' | 'nursery'`). Starter tray instances have null coordinates. Sprouting events update the linked `SeedBatch` germination success logs on-the-fly.
  - **Transplant Workflow:** Seedlings are moved to physical beds via a transplant endpoint, triggering on-the-fly spatial/collision validations and recording a `'transplant'` event.

### C. Plants Module

- **Current State in Code:**
  - Catalog of biological species, fully implemented with rich value objects (calendars, sowing traits).
  - Validation: Sowing block (`phenology.sowing`) is strictly mandatory.
  - Knowledge block holds unstructured arrays of strings.
- **Target State (Spec v1.3.0):**
  - **Sowing Refinement:** Sowing block becomes **optional** to support sterile or vegetatively propagated crops (such as Russian Comfrey).
  - **Structured Propagation:** Propagation methods are defined as detailed sub-objects mapping requirements (best practices, optimal seasons, estimated time weeks) per technique (division, cutting, seed).
  - **Favorites & Social Interactions:** Integrated with a private `user_bookmarks` collection. Community popular indicators (likes/dislikes) are desensitized and projected as numeric counters on the `Plant` aggregate root, avoiding write contention and document size bloat.

### D. Families Module

- **Current State in Code:**
  - Taxonomical classification fully implemented with CRUD, including public listings and custom seeders.
  - Supports polymorphic read-only lookups (by UUID ID or alphanumeric string Slug) on GET routes.
- **Target State (Spec v1.3.0):**
  - **Polymorphic Mutation:** Extend polymorphic `idOrSlug` resolution to mutations (`PATCH`, `DELETE`).
  - **Collaborator Role:** Authorization for a `collaborator` role to manage catalog taxonomies, separate from system administrators.

### E. Botanical Companions Graph (Plant Relations)

- **Current State in Code:**
  - Mock JSON data only (`mock_data/plantRelations.json`). No domain classes, schemas, or APIs exist.
- **Target State (Spec v1.3.0):**
  - **Directed Biological Graph:** Represented by `PlantRelation` aggregate root and collection, describing directional synergies (`beneficial`, `harmful`, `neutral`) with explicit ecological reasons (e.g., Tomato-Basil companionship).
  - **Proximity Calculations:** Feeds directly into the Spatial System, allowing companion distance evaluations inside the Bed designer.

### F. Chronological Events Module

- **Current State in Code:**
  - Domain entities, value objects, and mapping mappers (`EventMapper`, `EventDocument`) are fully implemented and unit-tested for core operations (watering, pruning, harvests).
  - **Temporarily Inactive:** Lacks application use cases, repositories, or HTTP controllers. No routes are wired.
- **Target State (Spec v1.3.0):**
  - **Scope-Based Journal:** Integrates an explicit `scope: 'bed' | 'instance'` field to track agricultural logs cleanly, preventing "magic nulls".
  - **Dual-Scope Harvesting:** Harvesting is logged per-instance (tracking exact coordinates) or per-bed (requiring an explicit `plantId` in the payload) for aggregated logging.
  - **Crop Rotation Heuristics:** Historical events over the past 36 months are analyzed to identify family repetitions (e.g., sequential Solanaceae plantings), generating soil-restoring suggestions.

### G. Reminders & Care Engine

- **Current State in Code:**
  - Non-existent.
- **Target State (Spec v1.3.0):**
  - **State-Based Care Agenda:** Stateful, persisted `Reminder` records (`pending`, `completed`, `dismissed`) to avoid real-time calculation overhead, ensuring $O(1)$ read performance.
  - **Passive Event-Driven Triggers:** Logged cultivation events passively mark reminders as completed and schedule subsequent tasks.
  - **Cascading Invalidations:** Soft-deleting plant instances or removing beds triggers immediate, automatic cancellation/dismissal of future reminders.
  - **Climatic Rain Silencing:** Integrates weather forecasts from Open-Meteo cached in Redis (2-hour TTL). Delays watering reminders when rain exceeds 5mm, with a protected environment bypass (indoor/greenhouse beds are never silenced).

### H. Authentication & Identity (Auth)

- **Current State in Code:**
  - Local and Google Sign-In verification, JWT token generation, and secure routes.
  - JWT payload carries minimum identifiers (`id`, `email`, `username`, `roles`).
- **Target State (Spec v1.3.0):**
  - **Location & Hemisphere Configuration:** User profiles store `postalCode`, `country`, and calculated `hemisphere` (north | south), cached in Redis. Checked dynamically during seasonality validations to prevent JWT payload bloat.
  - **Verification Mailer:** Proper transactional mailer infrastructure to support account validation.

---

## 5. Technical Debt & Refactoring Backlog (Phase 0 Targets)

The immediate focus to stabilize the codebase covers the following refactoring backlog:

1.  **Relocate Query System to Delivery Layer:**
    - _Symptom:_ `GenericQueryParser` and `QueryParserUtils` live in `src/shared/domain/query/`, coupling the domain core to Web/Express query representations.
    - _Remedy:_ Relocate these technical utilities to the delivery layer (`src/apps/agroApi/shared/query/`).
2.  **Purify Repository Retrieval Semantics:**
    - _Symptom:_ `MongoCrudRepository` throws `DomainNotFoundException` directly from the infrastructure layer when a document is absent.
    - _Remedy:_ Refactor to return `null` or `undefined`, shifting the exception-throwing logic strictly to application use cases.
3.  **Decouple Mongo Primitives:**
    - _Symptom:_ Database-specific types (like `MetadataPrimitives.ts`) live in infrastructure types folders.
    - _Remedy:_ Relocate database-independent primitives to the shared domain space.
4.  **Transition to Zod Schemas:**
    - _Symptom:_ Route verification uses `express-validator` with manual schemas, leading to potential OpenAPI contract drift.
    - _Remedy:_ Transition route boundaries to Zod, using schemas to drive runtime validation, TypeScript DTO compilation, and auto-generated Swagger documentation.
5.  **Awilix DI Auto-Wiring:**
    - _Symptom:_ `container.ts` contains verbose, manual registrations of every controller and use case.
    - _Remedy:_ Automate registration through directory scanning (`container.loadModules`).
6.  **Modularize ATDD Step Definitions:**
    - _Symptom:_ Cucumber test steps are concentrated in a few large feature-dump files.
    - _Remedy:_ Split step definitions by bounded context (Plant, Bed, Auth), extracting shared steps into reusable step utilities.

---

## 6. Realized Data Model (MongoDB)

The current MongoDB collection schemas are detailed below, highlighting embedded elements:

### Collection: `users`

- `_id`: Binary (UUID) - Primary Key.
- `email`: String (Unique index).
- `username`: String (Unique index).
- `password`: String (Hashed via bcrypt, null if federated).
- `emailValidated`: Boolean.
- `authMethods`: Array of sub-documents `[{ provider: string, createdAt: date }]`.
- `roles`: Array of Strings (e.g. `['user']`, `['admin']`).
- `metadata`: Audit object (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

### Collection: `beds`

- `_id`: Binary (UUID) - Primary Key.
- `userId`: Binary (UUID) - Foreign Key.
- `name`: String.
- `width`: Number (Positive).
- `height`: Number (Positive).
- `depth`: Number (Positive).
- `plantInstances`: Array of embedded crop documents:
  - `_id`: Binary (UUID)
  - `plantId`: Binary (UUID)
  - `position`: Coordinates object `{ x: number, y: number }`
  - `growthStatus`: String (Enum: `germinating`, `seedling`, etc.)
  - `instanceStatus`: String (Enum: `active`, `removed`)
  - `plantedAt`: ISODate
  - `removedAt`: ISODate (Optional)
  - `variety`: String (Optional)
  - `notes`: String (Optional)
- `metadata`: Audit object.
- `deleted`: Boolean (Logical deletion flag).
- `deletedAt`: ISODate (Optional).

### Collection: `families`

- `_id`: Binary (UUID) - Primary Key.
- `slug`: String (Unique index).
- `name`: String.
- `aliases`: Array of Strings.
- `scientificName`: String.
- `shortDescription`: String.
- `highlights`: Array of Strings.
- `extra`: Dynamic JSON.
- `metadata`: Audit object.

### Collection: `plants`

- `_id`: Binary (UUID) - Primary Key.
- `identity`: Object `{ name: { primary: string, aliases: string[] }, scientificName: string, family: string (ID) }`.
- `status`: String (Enum: `ACTIVE`, `DELETED`).
- `lifespan`: String.
- `traits`: Object `{ size: { height: range, spread: range }, spacingCm: range }`.
- `calendar`: Object `{ sowing: months, flowering: months, harvest: months }`.
- `propagation`: Object `{ methods: string[] }`.
- `metadata`: Audit object.

---

## 7. Entry Points & Routing Mechanism

Agro-Back implements an Express HTTP server starting at `src/index.ts`. All endpoints are registered dynamically via a glob scanner:

- **Scanner (`src/apps/agroApi/routes/registerRoutes.ts`):** Scans the route directory at runtime, identifying files matching `**/*.routes.{ts,js}`.
- **Invoker Resolution:** Route modules export an array of **Awilix-Express Invokers** (using `bindRun`) which lazily resolve controllers from the container per request.
- **Structured Exceptions Middleware:** Domain and validation exceptions are intercepted by `errorHandler.ts` and mapped automatically to HTTP codes:
  - `InvalidArgumentException` ──► **400 Bad Request**
  - `DomainUnauthorizedException` ──► **401 Unauthenticated**
  - `DomainForbiddenException` ──► **403 Forbidden**
  - `DomainNotFoundException` ──► **404 Not Found**
  - `DomainConflictException` ──► **409 Conflict**

### Detailed Active Routes

1.  **Auth (`/api/v1/auth`):**
    - `POST /register` ──► Registers local credentials.
    - `POST /login` ──► Standard local login.
    - `POST /google` ──► Verifies Google ID tokens.
    - `GET /validate/:token` ──► Validates registration token.
    - `POST /refresh` ──► Renews session token.
    - `POST /update` ──► Modifies profile password/credentials.
2.  **Beds (`/api/v1/beds`):**
    - `POST /` ──► Creates a bed.
    - `GET /` ──► Lists beds of the authenticated user.
    - `GET /:id` ──► Retrieves details of a specific bed.
    - `PATCH /:id` ──► Partially updates a bed via the patch/diff system.
    - `DELETE /:id` ──► Logically marks a bed as deleted.
3.  **Families (`/api/v1/families`):**
    - `POST /` ──► Creates a taxonomy (Admin only).
    - `GET /` ──► Public paginated listing.
    - `GET /:idOrSlug` ──► Polymorphic lookup by ID or Slug.
    - `PATCH /:id` ──► Partially updates a family (Admin only).
4.  **Plants (`/api/v1/plants`):**
    - `POST /` ──► Creates a plant variety (Admin only).
    - `GET /` ──► Public paginated listing.
    - `GET /:id` ──► Retrieves a specific variety.
    - `PATCH /:id` ──► Partially updates traits/phenology (Admin only).
    - `DELETE /:id` ──► Soft-deletes a variety (Admin only).
5.  **Health (`/api/v1/health`):**
    - `GET /` ──► Returns database and system status.
