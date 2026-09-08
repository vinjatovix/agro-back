# MODULE: TESTING

version: 1.3.0
source-spec: v1.3.0
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

- GenericQueryParser (filter DSL parsing)
- QueryParserUtils (CSV parsing, numeric coercion, sort/include parsing)
- DTO helpers:
  - buildPatch (path-based patch construction)
  - deepMerge (immutable merge utility)

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

- response MUST match OpenAPI schema
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

Added coverage:

- Beds feature scenarios (CRUD flows)
- cross-entity ownership rules (user/bed isolation)
- query-driven filtering scenarios (list endpoints with filters, sorting, pagination)

---

## 3. COVERAGE RULES

- minimum coverage: 80%
- enforced at CI level
- PRs failing coverage MUST be rejected

---

## 4. ASSERTION RULES

- NO dependency on exact error strings beyond those defined by the Zod validation contract.
- Use semantic matching and verify dot-notation path keys.
- Avoid brittle snapshots unless stable contract (OpenAPI).
- **`[TARGET STATE (Pending Iterations 9, 10, 12, 13 & 14)]`** Cucumber ATDD `.feature` tests will assert against clean, idiomatic Zod error messages (e.g., `"Required"`, `"Invalid UUID"`). Legacy express-validator error formats are fully retired.
- PATCH responses MUST be treated as full aggregate snapshots (not partial fragments).
- **Spatial Validation Testing Impact:** When migrating spatial calculations to a non-blocking advisory model, tests that previously asserted hard exceptions on collisions or borders MUST be refactored to verify warning lists in the response payload. Exact $0\text{cm}$ geometric collisions (impossible overlays) are the only physical exception that continues to assert hard HTTP 400 errors.

Contract tests enforce full-response strict equality against OpenAPI. ATDD tests MAY use partial matching for readability.

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
  request?: request.Test;
  responseRaw?: request.Response;
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
- ATDD step definition modularization (Cucumber scalability layer) `[TARGET STATE (Pending Iteration 16)]`
  - current step file structure is becoming too large
  - steps MUST be split by bounded context (Plant, Bed, Auth, Query, etc.)
  - shared steps MUST be extracted into reusable step utilities
  - step definition organization MUST follow domain-aligned structure rather than feature dump files

---

## 9. ANTI-PATTERNS

- testing implementation details instead of behavior
- coupling tests to Express internals
- missing contract alignment with OpenAPI
