# APPLICATION CONTRACT (API SURFACE)

version: 1.5.0
source-spec: v1.5.0
status: evolving

---

## 1. PURPOSE

This module defines the external HTTP contract of AgroApp.

It specifies the resources exposed to clients, including:

- endpoints
- request/response shapes
- domain boundaries visible through HTTP

This module is the formal agreement between the backend and any external consumer.

---

## 2. DOMAIN RESOURCES

The system exposes the following domain resources:

- Plants
- PlantInstances
- Beds
- Events
- Users / Auth
- Families
- Anomalies
- GardenInputs
- SeedBank (seed inventories & germination tests)
- Plant Relations (companion system)
- Ecological Attributes

---

## 3. AUTH SYSTEM & USER SESSIONS

All authentication, session, JWT payload, and user profile location management details have been consolidated into their own dedicated specification:

> See **Module: Authentication & Identity (auth.md)**

### 3.1 Exposed Endpoints

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

### 3.2 Middleware Chains

Auth routes validate input with the shared Zod step `validateRequest` (validation.md §3.2–§3.3; rules per route in auth.md §3.3). They do not use `validateBody`: the strict body schema reports an empty body as one error per missing field. The request objects live in `controllers/Auth/requestSchemas.ts`: routes import them from the controllers barrel and controllers from the sibling file, so dependencies only go `routes → controllers`.

| Route                       | Chain                                                           |
| --------------------------- | --------------------------------------------------------------- |
| `POST /auth/register`       | `authLimiter → validateRequest(registerRequest) → controller`   |
| `POST /auth/login`          | `authLimiter → validateRequest(loginRequest) → controller`      |
| `POST /auth/google`         | `authLimiter → validateRequest(googleAuthRequest) → controller` |
| `GET /auth/validate/:token` | `validateRequest(validateMailRequest) → controller`             |
| `POST /auth/refresh`        | `auth → controller` (no input schema)                           |
| `POST /auth/update`         | `auth → validateRequest(updatePasswordRequest) → controller`    |

Health (`GET /health`, `GET /test-error`) reads no client input and has no input schema.

---

## 4. QUERY SYSTEM TRANSPORT

This section defines the transport-level HTTP query parameter behavior for all collection endpoints (GET list endpoints).

### 4.1 IMPORTANT BOUNDARY RULE

This module defines **HTTP transport query representation only** (e.g., deepObject encoding shape).

All semantic rules, CSV parsing rules, operator mapping (`eq`, `contains`, `has`, `hasAny`, etc.), pagination coercion, and sorting mechanics are defined exclusively in:

> **Query DSL Contract v1.4.0 (query-dsl-contract.md)**
> **Module: Query (query.md)**

### 4.2 DeepObject Transport Representation

Queries are passed using deepObject parameter encoding.

For detailed descriptions and concrete examples of the query string transport parameters, refer strictly to **Module: Query DSL Contract (query-dsl-contract.md) Section 8**.

### 4.3 Validation Boundary Rule

- Unknown filter keys or invalid operators are rejected by the Validation Layer at the boundary.
- The Query Parser assumes validated input. Invalid or malformed structures MUST NOT reach the persistence layer.

### 4.4 JSON:API Sparse Fields `[TARGET STATE (Pending [Iteration 19](../../roadmap.md#iteration-19-support-jsonapi-sparse-fields-in-query-parser))]`

The Query Parser extracts JSON:API options to dynamically limit fields and preload relations.

---

## 5. RESOURCE CONTRACTS

### 5.1 Plants

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

#### Access control

- Read access is public.
- Write access requires admin or collaborator roles (Pending [Iteration 31](../../roadmap.md#iteration-31-introduce-collaborator-role-in-auth-middleware)).

#### Query support

List endpoints support filtering, sorting, and pagination (as defined in Query DSL Contract v1.4.0).

---

### 5.1.1 Plant by ID

Behavior:

- returns a Plant aggregate by UUID
- public route: the requester may be anonymous
- soft-deleted plants are only visible to `admin` and `collaborator` roles; anonymous and other users get 404
- returns 404 if not found
- returns 400 if invalid UUID

---

### 5.1.2 Partial Updates (admin | collaborator)

Behavior:

- supports partial updates (deep merge semantics)
- only provided fields are modified
- returns full Plant resource after update

---

### 5.2 PlantInstances (user) `[TARGET STATE (Pending Iterations [20](../../roadmap.md#iteration-20-extract-plantinstance-into-standalone-collection) & [56](../../roadmap.md#iteration-56-build-2d-euclidean-proximity-calculator))]`

Represents a real instance of a Plant placed in a Bed, managed as its own standalone aggregate with a dedicated repository and endpoints.

The PlantInstance properties include a `warnings` field (an array of strings), representing calculated spatial, spacing, or biological companion alerts. Rather than executing heavy distance/overlapping computations on-the-fly during every standard `GET` call, these warnings are computed once and **persisted directly** during layout save mutations. Thus, standard `GET` requests read pre-computed warnings instantly in $O(1)$ time.

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

_Note on Deletion:_ Removing a plant instance MUST execute a soft delete by changing its status to `'removed'` and setting `deletedAt` (ISODate) to preserve event history integrity. This soft delete immediately liberates the spatial occupancy of the instance, allowing new plant instances to be placed in that same location without collision alerts.

#### 5.2.1 Transplant API `[TARGET STATE (Pending [Iteration 75](../../roadmap.md#iteration-75-implement-transplant-api-with-spatial-validation))]`

- **Endpoint:** `POST /api/v1/plant-instances/:id/transplant`
- **Behavior:** Takes a target `bedId` and coordinates `(x, y)`. Executes on-the-fly Bed boundary validations, geometric/volumetric spatial collision tests, and companion plant proximity checks.
- **State Transition:** Updates the instance's `bedId`, `position` coordinates `(x, y)`, and sets `growthStatus` to `'vegetative'`.
- **Events:** Registers a `'transplant'` Event in the chronological cultivation log.

---

### 5.3 Beds & Layout Canvas (user) `[TARGET STATE (Pending Iterations [56](../../roadmap.md#iteration-56-build-2d-euclidean-proximity-calculator), [66](../../roadmap.md#iteration-66-implement-stateless-layout-simulation-endpoint) & [67](../../roadmap.md#iteration-67-implement-transactional-batch-save-layout-endpoint))]`

In addition to traditional CRUD actions, the Beds API supports interactive spatial canvas layouts (e.g. drag-and-drop design using KonvaJS) through two specialized endpoints:

#### 5.3.1 Dry-Run Layout Simulation (Stateless)

- **Endpoint:** `POST /api/v1/beds/:id/layout/validate`
- **Behavior:** Receives a proposed list of plant instances with coordinates. Runs the spatial engine in-memory, checking boundaries, overlapping, microclimatic exposure, and 36-month rotation history.
- **Database Action:** None (0 writes).
- **Response:** Returns the full `ecologicalReport` and calculated crop warnings. Useful for drawing real-time visual feedback circles on the UI during drag-and-drop.

#### 5.3.2 Consolidated Batch Save (Transactional) `[TARGET STATE (Pending [Iteration 67](../../roadmap.md#iteration-67-implement-transactional-batch-save-layout-endpoint))]`

- **Endpoint:** `PUT /api/v1/beds/:id/layout`
- **Precondition:** requires `If-Match: "<bed version>"` (see §7.1). Missing or `*` → `428`, malformed → `400`, outdated → `412`, checked before any layout or stock validation. The response carries the new `ETag`. The dry-run `POST …/layout/validate` writes nothing and needs no `If-Match`.
- **Open question (decide when specifying this endpoint):** should `412` carry the current version as `ETag`? Today `412` returns only the standard error body and the client reloads with `GET`. A version header would only help if the layout editor wants to tell the user "someone saved in the meantime" before reloading; it does not replace the reload, because the client still needs the other user's changes.
- **Behavior:** Clears previous active plant instances for this Bed and batch-persists the new layout coordinates in a single database transaction.
- **Database Action:** Transactional update. Pre-calculates and persists the resulting `ecologicalReport` on the `Bed` document and the calculated `warnings` on each `PlantInstance` document, optimizing all subsequent read operations.
- **Events:** Dispatches a unified `BedLayoutSaved` event to Kafka post-commit for asynchronous care schedule recalculations.

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

---

### 5.4 Events (user) `[TARGET STATE (Pending Iterations [70](../../roadmap.md#iteration-70-implement-append-only-cultivationlog-aggregate-with-scopes) & [72](../../roadmap.md#iteration-72-expose-cultivationlog-crud-endpoints))]`

Lifecycle events associated with Beds or PlantInstances (governed by the explicit `scope: 'bed' | 'instance'` field).

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

Event payloads require `scope` and `bedId`; `plantInstanceId` is only allowed and mandatory if `scope === 'instance'`. If `scope === 'bed'`, `plantInstanceId` is forbidden, and the presence of `plantId` (UUID) is governed by strict agronomic rules:

- **`harvest`**: `plantId` is **mandatory** in the payload to identify the harvested botanical species.
- **`pruning`**: `plantId` is **optional** in the payload to optionally target a specific botanical species in a mixed bed.
- **`watering`, `fertilization`, `treatment`**: `plantId` is **forbidden** because these soil/environmental actions are applied to the entire Bed container.

---

### 5.5 Users

All endpoints, payload schemas, and session configurations for local registration, standard login, multi-provider OAuth, token refreshing, and geolocation update are specified in **auth.md**.

_Exposed endpoints contract can be referenced in Section 3.1 of this document._

---

### 5.6 Anomalies `[TARGET STATE (Pending [Iteration 39](../../roadmap.md#iteration-39-implement-anomaly-domain-and-crud-endpoints))]`

Unifies pests, diseases (pathogens), physiological disorders, and weeds into a single domain concept under Phase 5 ([Iteration 39](../../roadmap.md#iteration-39-implement-anomaly-domain-and-crud-endpoints)).

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

---

### 5.7 GardenInputs `[TARGET STATE (Pending [Iteration 40](../../roadmap.md#iteration-40-implement-gardeninput-domain-and-crud-endpoints))]`

Unifies organic remedies, treatments, repellents, and organic fertilizers into a single domain concept under Phase 5 ([Iteration 40](../../roadmap.md#iteration-40-implement-gardeninput-domain-and-crud-endpoints)).

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

---

### 5.8 Seed Bank (user) `[TARGET STATE (Pending [Iteration 52](../../roadmap.md#iteration-52-implement-seedbatch-aggregate-and-repository))]`

Manages seed packets (lots), quantities, and germination test runs as a private user-owned inventory.

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

_Note on Germination tests:_ Logging a germination test triggers dynamic `germinationRate` recalculation.

---

### 5.9 Families

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

_Note on Lookups:_ Read endpoints support polymorphic lookups by ID or Slug. Polymorphic lookups for mutations are pending [Iteration 32](../../roadmap.md#iteration-32-implement-deletefamily-and-enable-polymorphic-lookups-for-family-mutations).

Families list endpoints supports Query DSL filtering, sorting, and pagination as defined in Query DSL Contract v1.4.0.

---

### 5.10 Plant Relations `[TARGET STATE (Pending [Iteration 37](../../roadmap.md#iteration-37-implement-plantrelation-aggregate-and-repository))]`

Represents companion planting relationships.

> **For exposed HTTP endpoints, routing, payloads, and REST semantics, refer strictly to Module: OpenAPI Contract (openapi.md).**

---

## 6. ERROR CONTRACT

All endpoints MUST return a consistent error structure.

Refer strictly to **Module: Validation (validation.md) Section 4 and 5** for the canonical definition of the `ApiErrorResponse` type and the structured validation error behaviors.

- Errors thrown or rejected by async controllers and middlewares are forwarded to the global `errorHandler` by Express 5 itself; handlers MUST NOT be wrapped in custom async helpers.
- A write request with no body (Express 5 leaves `req.body` `undefined`) returns `400`, never `500`: `"Empty body is not allowed"` on routes still behind `validateBody`, a `body` error on routes validated with `validateRequest`.

---

## 7. STATUS CODES

- 400 → validation error
- 401 → unauthenticated
- 403 → forbidden (role mismatch)
- 404 → resource not found
- 409 → conflict: duplicate resource or domain invariant violation (e.g. deleting a bed that still has plants). Never used for stale versions.
- 412 → precondition failed: the `If-Match` version is not the current one (see §7.1)
- 428 → precondition required: `If-Match` missing or `*` on a protected write

### 7.1 Version preconditions (`If-Match` / `ETag`)

- The only entity tag the API emits is the version tag: `ETag: "<version>"` (strong, quoted decimal integer, equal to the body's `version`) on single-resource `GET`, `POST` and `PATCH` of beds, plants and families. Express's automatic `ETag` is disabled, so lists, `204` and error responses carry none.
- `PATCH /beds/{id}`, `PATCH /plants/{id}`, `PATCH /families/{idOrSlug}`, `DELETE /beds/{id}` and `DELETE /plants/{id}` require `If-Match` with exactly one strong tag. The `requireIfMatch` middleware runs after `auth`/`isAdmin` and before body/params validation: missing or `*` → `428`; malformed → `400` with an `if-match` error key. It performs no DB access.
- Precedence: `401/403 → 428 → 400 (If-Match) → 400 (body/params) → 404 → 412 → 409 → success`.
- **`[TARGET STATE (Pending [Iteration 67](../../roadmap.md#iteration-67-implement-transactional-batch-save-layout-endpoint))]`** `PUT /beds/{id}/layout` joins this list with the same rules.
- **`[TARGET STATE (Pending [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** `If-Match` follows the RFC 9110 entity-tag list grammar (see validation.md §3.1): a list is accepted, weak or never-emitted tags yield `412` (after the existence check) instead of `400`, and use cases receive the list of acceptable versions. `getExpectedVersion` moves from the middleware module to `apps/agroApi/shared/`, next to its setter, so controllers stop importing from a middleware.
- CORS exposes `ETag` (`Access-Control-Expose-Headers`) and reflects requested headers, so browsers can send `If-Match`.
- A matching `If-None-Match` on a single-resource `GET` returns `304` with no body. This is accepted framework behavior; no caching headers are added.

---

## 8. IDEMPOTENCY PROTECTION (MUTATIONS) `[TARGET STATE]`

To guarantee resilience against network instability (e.g., poor 3G/4G connectivity in the field) where a mobile client might automatically retry a `POST` request due to a dropped response, the API enforces an idempotency boundary:

- **Target Scope:** All critical state-mutating endpoints (primarily `POST` requests for resource creation like `Events`, `Beds`, and `PlantInstances`) MUST support an `Idempotency-Key` HTTP header.
- **Client Responsibility:**
  1. The client/frontend generates a unique **UUIDv7** for every distinct mutation attempt and attaches it to the `Idempotency-Key` header. Utilizing UUIDv7 guarantees that the idempotency key itself embeds the precise client-side initiation timestamp, aiding in distributed debugging and aligning with the system's chronological ID standardization ([Iteration 3](../../roadmap.md#iteration-3-standardize-uuidv7-generation)).
  2. **Payload Caching (Constraint):** The client MUST cache and reuse the exact original payload for any network retries. It MUST NOT regenerate dynamic fields (like `date` or `timestamps`) on subsequent attempts. Altering the payload during a retry will change its fingerprint and result in a `409 Conflict`.
- **Backend Execution (Atomic Lock Strategy):**
  1. Derive the storage key from the authenticated principal (when available), HTTP method, normalized route, and `Idempotency-Key`, and store a fingerprint of the request payload. **Deterministic Hashing (Constraint):** Before hashing the payload to create this fingerprint, the middleware MUST perform deterministic JSON serialization (e.g., sorting the JSON keys alphabetically). This prevents a `409 Conflict` if the client's HTTP library arbitrarily changes the key order during a retry.
  2. Atomically acquire the scoped lock before executing Domain/Application logic; cache the successful status and response against that scoped key for the configured TTL (e.g., 24 hours), replacing the lock.
  3. If the lock cannot be acquired (indicating a concurrent network retry in the exact same millisecond) or if a cached response already exists, the middleware immediately short-circuits the controller execution. It returns a `409 Conflict` (if still processing or if the payload fingerprint differs) or replays the cached HTTP response only when the operation and payload match exactly, completely bypassing the database and preventing race conditions leading to accidental data duplication (e.g., double-logging a harvest event).

---

## 9. GENERAL RULES

- No business logic in API layer
- No direct domain exposure
- DTOs are mandatory at boundary
- Plant and PlantInstance are strictly separated concepts
- Events are append-only by design
- API acts as translation layer only

---

## 10. CURRENT STATUS

### Implemented

- Plants, Beds: READ + CREATE + PATCH + DELETE
- Families: READ + CREATE + PATCH (DELETE is pending `[TARGET STATE (Pending [Iteration 32](../../roadmap.md#iteration-32-implement-deletefamily-and-enable-polymorphic-lookups-for-family-mutations))]`)
- Auth system (functional end-to-end, Swagger tested)
- validation middleware: Zod `validateRequest` on Auth; Plants, Families and Beds still on `express-validator` (Iterations 12–14)
- error handling (structured)

### Partially designed

- PlantInstances
- Events system

### Missing

- Anomalies and GardenInputs system (Mock Data Only)
- email provider integration

---

## 11. CONTRACT PRINCIPLE

This document defines the external contract of the system.

Any change affecting this module is a breaking change and MUST be versioned.

---

## 12. DEPENDENCY INJECTION STRATEGY

The system uses **Awilix PROXY MODE** as the active dependency injection mechanism.

### Current state

- Proxy mode is enabled, allowing controllers and services to receive dependencies lazily by property name destructuring.
- Manual bindings are currently maintained inside `src/apps/agroApi/container.ts` using explicit registrations (e.g., `asClass`, `asFunction`, `asValue`).

### Target State `[TARGET STATE (Pending [Iteration 15](../../roadmap.md#iteration-15-automate-awilix-dependency-injection))]`

- **Awilix Auto-Wiring**: Automate registrations through dynamic directory scanning (e.g. `container.loadModules`), completely eliminating the need for manual bindings inside `container.ts`.

### Impact

- Eliminates classic binding issues
- Reduces API composition boilerplate
- Standardizes dependency resolution across runtime and tests

---

## 13. FINAL NOTE

This document defines the external contract of the system.

It does NOT describe internal architecture decisions unless they directly affect the HTTP surface or execution contract.
