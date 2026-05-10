# MODULE: MODULES MAP

version: 1.2.0
source-spec: v1.1.0
status: stable

---

## 1. PURPOSE

This document defines the global architecture map of AgroApp.

It describes how modules interact, their boundaries, and dependency direction.

It is the highest-level architectural contract of the system.

---

## 2. ARCHITECTURAL STYLE

AgroApp follows a **modular layered architecture with strict boundaries**:

- Domain modules are isolated
- Application layer orchestrates use cases
- Infrastructure implements persistence and external systems
- Knowledge system is external to core domain
- Spatial system is pure computation layer
- API is transport boundary
- OpenAPI is HTTP contract authority layer
- Query DSL Contract defines semantic query language

---

## 3. MODULES OVERVIEW

### 3.1 Domain Core

```sh
/modules/domain-core.md
```

- Plant aggregate
- Bed aggregate
- PlantInstance entity
- Value Objects
- invariants

Rules:

- no IO
- no persistence
- no external dependencies

---

### 3.2 Knowledge System

```sh
/modules/knowledge.md
```

- pests
- diseases
- remedies
- fertilizers
- plant relations graph

Rules:

- global dataset
- no domain ownership
- referenced by ID only

---

### 3.3 Spatial System

```sh
/modules/spatial.md
```

- collision detection
- spacing validation
- placement rules
- spatial context evaluation

Rules:

- pure computation
- no persistence
- no domain mutation

---

### 3.4 Events System

```sh
/modules/events.md
```

- temporal record of agronomic actions
- watering, fertilization, pruning, etc.

Rules:

- append-only model (future)
- references PlantInstance + Bed
- no domain mutation

---

### 3.5 Persistence System

```sh
/modules/persistence.md
```

- repositories
- DTO mapping
- patch/diff system

Rules:

- domain is source of truth
- persistence is projection
- no business logic

---

### 3.6 API Layer

```sh
/modules/api-layer.md
```

- HTTP controllers
- routing
- middleware
- request/response shaping
- dependency injection (Awilix PROXY mode)

Rules:

- no domain logic
- no persistence logic
- no spatial logic
- delegates query parsing to Query System
- delegates query semantics to Query DSL Contract
- dependency resolution via proxy container (no manual binding)

---

### 3.7 Validation System

```sh
/modules/validation.md
```

- request validation
- DTO schema enforcement
- structured error formatting

Rules:

- no domain logic
- transport-only layer
- MUST align with OpenAPI contract
- MAY delegate query parsing validation to Query System

---

### 3.8 OpenAPI Contract

```sh
/modules/openapi.md
```

- external HTTP API specification
- request/response schema authority
- error contract definition
- actively used via Swagger UI

Rules:

- defines transport contract ONLY
- MUST NOT define query semantics (delegated to Query DSL Contract)
- implementation MUST follow spec
- contract drift is critical failure
- used by tests as validation source

---

### 3.9 Testing System

```sh
/modules/testing.md
```

- unit tests (domain, spatial)
- integration tests (application, persistence)
- e2e tests (API)
- contract tests (OpenAPI validation)
- query DSL tests (NEW)
- shared utilities tests (NEW)

Rules:

- no implementation coupling
- 80% minimum coverage
- Sonar quality gate required
- MUST validate OpenAPI contract compliance
- MUST validate Query DSL Contract compliance

---

### 3.10 Plant Instance System

```sh
/modules/plant-instance.md
```

- runtime plant placement
- spatial linkage
- lifecycle tracking in relation to Beds

Rules:

- depends on Plant
- interacts with Spatial System
- no business logic

---

### 3.11 Bed System

```sh
/modules/bed.md
```

- spatial container
- grouping of PlantInstances
- grid alignment anchor

Rules:

- no plant logic
- no event logic
- no knowledge logic

---

### 3.12 Families System (NEW)

```sh
/modules/family.md
```

- botanical taxonomy classification
- plant grouping system

Rules:

- read-only ecological dataset
- referenced by Plant domain only
- no lifecycle or behavioral logic
- no persistence-driven mutation rules

---

### 3.13 Query System (NEW)

```sh
/modules/query.md
```

- GenericQueryParser
- QueryParserUtils
- pagination parsing
- CSV parsing utilities
- HTTP → QueryOptions transformation
- type coercion utilities

Rules:

- API input → Query DSL Contract transformation
- MUST implement Query DSL Contract rules
- no domain logic
- deterministic parsing required
- invalid filters must be safely handled or rejected
- no domain logic allowed

---

### 3.14 Query DSL Contract (NEW)

```sh
/modules/query-dsl.md
```

- filter operators definition
- sort semantics
- pagination rules
- include system
- QueryOptions model

Rules:

- defines semantic query language
- independent of HTTP/OpenAPI
- versioned contract
- consumed by Query System + Application Layer
- MUST NOT depend on transport or persistence

---

### 3.15 Shared Utilities System (NEW)

```sh
/modules/shared-utils.md
```

- DTO utilities (buildPatch, deepMerge)
- interpolation system (route + JSON)
- request builders for tests
- response comparison utilities
- CSV and type normalization helpers

Rules:

- framework agnostic
- no domain logic
- no persistence logic
- pure deterministic functions only
- safe for test + API reuse contexts

---

## 4. DEPENDENCY RULES

```sh
API → Application → Domain
API → Validation
API → Query System
API → Query DSL Contract
API → OpenAPI (HTTP contract only)
Validation → Query System (optional delegation)
Query System → Query DSL Contract
Application → Domain
Application → Spatial
Application → Knowledge (read-only)
Persistence → Domain (mapping only)
Testing → ALL MODULES (read-only, contract-aware)
Shared Utils → (used by API, Testing, Validation only)
Query DSL Contract → (no dependencies on transport or infra)
```

---

## 5. CROSS-MODULE RELATIONSHIPS

---

### 5.1 Plant ↔ Knowledge

- Plant references knowledge IDs
- Knowledge does not depend on Plant

---

### 5.2 Plant ↔ Spatial

- Spatial evaluates PlantInstances only
- Plant is definition layer, not position

---

### 5.3 Plant ↔ Families

- Plant MAY reference Family taxonomy
- Families are read-only
- Families MUST NOT depend on Plant

---

### 5.4 API ↔ Query System

- API delegates parsing to Query System
- Query System implements Query DSL Contract
- DSL semantics are NOT in API or OpenAPI

---

### 5.5 Query System ↔ Query DSL Contract

- Query System is runtime implementation
- Query System ensures deterministic transformation
- Query DSL Contract is specification
- strict compliance required
- Validation may enforce strict rules on parsed output

---

### 5.6 Testing ↔ Query DSL Contract

- tests validate:
  - filter operators
  - sort behavior
  - pagination rules
  - deterministic parsing

### 5.7 Testing ↔ Shared Utils

- Shared utilities provide deterministic helpers for:
  - request building
  - interpolation
  - response comparison

- used heavily in e2e and contract tests

---

### 5.8 Events ↔ Core Systems

Events reference:

- PlantInstance
- Bed
- Knowledge entities (optional)

No mutation allowed

---

## 6. SYSTEM BOUNDARIES SUMMARY

| Module             | Responsibility             | Mutates Domain |
| ------------------ | -------------------------- | -------------- |
| Domain Core        | Business model             | YES            |
| Knowledge          | Ecological intelligence    | NO             |
| Spatial            | Geometry / rules           | NO             |
| Events             | Temporal history           | NO             |
| API                | HTTP interface             | NO             |
| Validation         | Input validation           | NO             |
| Query System       | Query parsingnormalization | NO             |
| Query DSL Contract | Query semantics definition | NO             |
| Shared Utils       | Framework utilities        | NO             |
| OpenAPI            | HTTP contract              | NO             |
| Persistence        | Storage mapping            | NO             |
| Families           | Taxonomy dataset           | NO             |

---

## 7. EVOLUTION RULES

Any new module MUST:

- declare dependencies explicitly
- avoid circular references
- respect domain isolation
- be added here before implementation

---

## 8. FINAL NOTE

This document is the **architectural truth source of AgroApp**.

If something contradicts this map, the implementation is wrong — not the spec.
