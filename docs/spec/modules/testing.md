## MODULE: TESTING

version: 1.1.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

Defines testing strategy across all AgroApp layers.

Ensures correctness, regression safety, and architectural compliance.

---

# 2. TESTING LEVELS

## 2.1 Unit Tests

Scope:

* Domain Core
* Value Objects
* Pure functions
* Spatial logic (pure computation)

Rules:

* no IO
* no persistence
* no API coupling

---

## 2.2 Integration Tests

Scope:

* Application use cases
* Persistence layer
* Repository behavior
* Patch system

Rules:

* real infrastructure allowed (test DB or mocks)
* no HTTP layer dependency

---

## 2.3 E2E Tests

Scope:

* API endpoints
* full request → domain → persistence → response cycle

Rules:

* validate real system behavior
* must reflect API contract

---

## 2.4 Contract Tests

Scope:

* API contract validation against OpenAPI spec

Rules:

* response MUST match OpenAPI schema
* no drift between implementation and spec
* failures block deployment

---

# 3. COVERAGE RULES

* minimum coverage: 80%
* enforced at CI level
* PRs failing coverage MUST be rejected

---

# 4. ASSERTION RULES

* NO dependency on exact error strings
* use semantic matching only
* avoid brittle snapshots unless stable contract (OpenAPI)
* asserting raw error strings is allowed ONLY when explicitly defined by validation contract

---

# 5. SONAR RULES

* PRs MUST pass Sonar checks
* no critical vulnerabilities allowed
* no duplicated logic above threshold
* maintainability rating enforced

---

# 6. FUTURE EVOLUTION

* mutation testing
* contract-driven test generation
* scenario-based DSL expansion

---

# 7. ANTI-PATTERNS

* testing implementation details instead of behavior
* coupling tests to Express internals
* missing contract alignment with OpenAPI