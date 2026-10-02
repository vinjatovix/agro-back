# MODULE: TESTING

version: 1.4.0
source-spec: v1.4.0
status: stable

---

## 1. PURPOSE

Defines testing strategy across all AgroApp layers.

Ensures correctness, regression safety, and architectural compliance.

---

## 2. TESTING LEVELS

### 2.1 Unit Tests

Scope:

- Domain Core
- Value Objects
- Pure functions
- Spatial logic (pure computation)
- Shared utilities (DTO + query parsing)

#### Added coverage

Unit tests now explicitly include:

- `listQuerySchema` (operators by field type, value decoding, hints, one operator per field, sort, pagination, no echoed values) and the per-resource listing requests (`listPlantsRequest`, `listFamiliesRequest`)
- request schemas per module (`controllers/<Module>/requestSchemas.test.ts`, Beds included)
- `PlantQueryMapper` (every declared operator, `$or` clauses combined under `$and`) and the plant sort keys in `MongoPlantRepository`
- migrations with a fake `db` (`tests/migrations/`)
- DTO helpers:
  - buildPatch (path-based patch construction)
  - deepMerge (immutable merge utility)
- `versionTags` (`ifMatchSchema` grammar table: lists, weak and never-emitted tags, `"a,b"`, empty elements, overflow, malformed; `setVersionETag`; `getExpectedVersions`) and `requireIfMatch` (`428`/`400` split)
- `ensureVersion` with version lists (an empty list never passes)
- use-case version checks (precedence `404 → 412 → 409`, no-op patches, call counts on the success path: 1 read + 1 `updateWithDiff`, no read after the write)
- in-memory audit metadata per mutation method: a real change sets `updatedAt`/`updatedBy` to the acting user and keeps `createdAt`/`createdBy`; a same-value call leaves the same `Metadata` instance; a failed call leaves metadata untouched; `syncVersion('written')` advances the version by one and `syncVersion('unchanged')` keeps it
- `Metadata.update` and `hasStateChanged` (including rejecting value objects, nested or inside arrays, and objects whose prototype has no `constructor`, instead of silently reporting no change)
- one timestamp per request: `UpdateBed` and `UpdatePlant` pass the same `at` to every mutation they call, and the returned aggregate carries it as `updatedAt`
- `Bed` does not mutate the plant list it was built from
- Auth writes: each `UserPatch` sent by `ValidateMail`, `UpdatePasswordLocal` and `AuthenticateWithGoogle` carries audit data by the acting user and keeps `createdAt`/`createdBy` (`AuthRepositoryMock.assertUpdateAuditedBy`); `MongoAuthRepository.update` stores that metadata as received and keeps any other field stored under `metadata`

Use-case tests use the in-memory fake `BaseMongoCrudRepositoryMock`, which mirrors `updateWithDiff(current, updated)`: the write, or on an empty diff the no-op confirmation, only succeeds on an active entity at the expected version; a write stores `updated` exactly as received with the version bumped and never adds audit data; it returns `'written'` after a write and `'unchanged'` after a confirmed no-op; stale → `DomainStaleVersionException`, missing/inactive → `DomainNotFoundException` (on both paths). It checks a persisted snapshot of version/active state, so mutating a read instance (e.g. `markAsDeleted(user)`) does not change what is "stored" until it is written. `getStoredPrimitives(id)` lets tests compare the returned aggregate with what was stored.

Rules:

- no IO
- no persistence
- no API coupling

---

### 2.2 Integration Tests

Scope:

- Application use cases
- Persistence layer
- Repository behavior
- Patch system
- Query system translation layer

#### Added coverage

Integration tests MUST include:

- MongoQueryTranslator behavior (filter DSL → Mongo queries)
- repository query execution using QueryOptions
- interaction between parsed queries and persistence filtering

Rules:

- real infrastructure allowed (test DB or mocks)
- no HTTP layer dependency

---

### 2.3 E2E Tests

Scope:

- API endpoints
- full request → domain → persistence → response cycle
- Beds module flows

Rules:

- validate real system behavior
- must reflect API contract

---

### 2.4 Contract Tests

Scope:

- API contract validation against OpenAPI spec

Rules:

- response MUST match OpenAPI schema, including declared response headers (e.g. the required `ETag`) and `Content-Type`
- no drift between implementation and spec
- failures block deployment
- includes Beds endpoints validation
- includes query parameter validation where defined in OpenAPI

---

### 2.5 ATDD / Cucumber Tests

Scope:

- feature-based system tests
- shared world state
- scenario-driven API behavior

Features:

- Given/When/Then DSL
- stateful execution via World
- reusable fixtures (seeders)

Rules:

- Call the API only in the `When` step under test. Build prior state (created, updated to a given version, soft-deleted, bed with plants…) in `Given` steps with seeders or DB helpers (e.g. `the bed is stored at version 1`, `the plant was last updated by another user`, `a soft-deleted plant exists`), never with setup `PATCH`/`DELETE` requests.
- A read-only check after the `When` step (e.g. `a GET user request to "..." should return the same body`) is allowed in `Then`: it builds no state.
- When asserting the acting user (e.g. audit data), read the username from the token the step actually sends: login steps can replace the scenario's user token.

Added coverage:

- version preconditions on every protected write: `428` / `400` / `412` / `404` precedence, `ETag` on single-resource responses, CORS exposure, and concurrent writers with the same version (exactly one winner)
- in-memory audit metadata: a `PATCH` response equals a later `GET` (including `metadata` and `version`) with the acting user as `updatedBy`; a same-value `PATCH` keeps `ETag`, `version` and the stored document; a soft delete stores the deleting user with `updatedAt` equal to `deletedAt`
- Beds feature scenarios (CRUD flows)
- cross-entity ownership rules (user/bed isolation)
- query-driven filtering scenarios (list endpoints with filters, sorting, pagination)

---

## 3. COVERAGE RULES

- minimum coverage: 80%
- coverage is produced by `jest --coverage` (`coverage/lcov.info`), which SonarCloud consumes
- enforced at CI level
- PRs failing coverage MUST be rejected

---

## 4. ASSERTION RULES

- NO dependency on exact error strings beyond those defined by the Zod validation contract.
- Use semantic matching and verify dot-notation path keys.
- Avoid brittle snapshots unless stable contract (OpenAPI).
- Cucumber ATDD `.feature` tests assert against the Zod validation contract (error keys by path, `"Unknown field"`, project hints) and check that the submitted value is not echoed. The legacy `express-validator` error formats were retired in Iterations 10–14.
- Listing scenarios seed at least one matching and one non-matching resource in `Given`, so a filter cannot pass on an empty list (`the following plants exist:` table step, `the listed "<path>" should be …` assertions).
- PATCH responses MUST be treated as full aggregate snapshots (not partial fragments).
- **Spatial Validation Testing Impact:** When migrating spatial calculations to a non-blocking advisory model, tests that previously asserted hard exceptions on collisions or borders MUST be refactored to verify warning lists in the response payload. Exact $0\text{cm}$ geometric collisions (impossible overlays) are the only physical exception that continues to assert hard HTTP 400 errors.

Contract tests enforce full-response strict equality against OpenAPI. ATDD tests MAY use partial matching for readability.

Shared HTTP middlewares that no route uses yet (e.g. `validateRequest`) are proven with a Jest integration test: a minimal `express()` app with the middleware, a sample route and the real `errorHandler` (mocked logger), called through `supertest`, with each error body checked by `assertResponseMatchesOpenApi` against a documented operation that uses the same shared response. No DB and no app container.

---

## 5. SONAR RULES

- PRs MUST pass Sonar checks
- no critical vulnerabilities allowed
- no duplicated logic above threshold
- maintainability rating enforced

---

## 6. SEEDERS

Test utilities MAY include:

- API-driven seeders (HTTP-based setup)
- domain factories (pure object creation)

Added seeders:

- BedSeeder for Beds module setup
- PlantSeeder for Plants module setup
- FamilySeeder for Families module setup
- cross-user seeders for ownership validation scenarios

Seeders are allowed to:

- interact with real HTTP server in E2E tests
- create deterministic test fixtures

---

## 7. WORLD MODEL (ATDD)

Cucumber tests MAY define:

```ts
class TestWorldImpl extends World {
  family?: string;
  familySlug?: string;
  plantId?: string;
  bedId?: string;
  token?: string;
  route?: string;
  method?: string;
  ifMatch?: string; // sent by PATCH/DELETE steps
  ifNoneMatch?: string; // sent by GET steps
  request?: request.Test;
  responseRaw?: request.Response;
  responses?: request.Response[]; // concurrent-request steps
}
```

Rules:

- state is isolated per scenario
- no cross-scenario leakage

Extended state usage:

- bedId used in Beds scenarios
- plantId used in Plants scenarios
- query/filter state used in list/filter scenarios

---

## 8. FUTURE EVOLUTION

- mutation testing
- contract-driven test generation
- scenario-based DSL expansion
- ATDD step definition modularization (Cucumber scalability layer) `[TARGET STATE (Pending [Iteration 16](../../roadmap.md#iteration-16-modularize-cucumber-atdd-step-definitions))]`
  - current step file structure is becoming too large
  - steps MUST be split by bounded context (Plant, Bed, Auth, Query, etc.)
  - shared steps MUST be extracted into reusable step utilities
  - step definition organization MUST follow domain-aligned structure rather than feature dump files

---

## 9. ANTI-PATTERNS

- testing implementation details instead of behavior
- coupling tests to Express internals
- missing contract alignment with OpenAPI
