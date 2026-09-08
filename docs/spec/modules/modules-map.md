# MODULE: MODULES MAP

version: 1.3.0
source-spec: v1.3.0
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
- Auth system isolates session, JWT and user profile settings from business domain

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

- anomalies (unifying pests, pathogens, disorders, weeds)
- garden-inputs (organic remedies, nutrition)

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
- query DSL tests
- shared utilities tests

Rules:

- no implementation coupling
- 80% minimum coverage
- Sonar quality gate required
- MUST validate OpenAPI contract compliance
- MUST validate Query DSL Contract compliance

---

### 3.10 Plant Instance System `[TARGET STATE (Pending Iteration 38)]`

```sh
/modules/plant-instance.md
```

- runtime plant placement and lifecycle tracking
- spatial linkage inside Beds

Rules:

- depends on Plant and Bed
- interacts with Spatial System
- managed as standalone aggregate with its own dedicated repository

---

### 3.11 Bed System

```sh
/modules/bed.md
```

- spatial container
- coordinate system anchor
- grid alignment anchor

Rules:

- no plant logic
- no event logic
- no knowledge logic
- **`[TARGET STATE (Pending Iteration 38)]`** completely decoupled from individual plant aggregates (not responsible for saving or retrieving plant instances)

---

### 3.12 Families System

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

### 3.13 Query System

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

- **`[TARGET STATE (Pending Iteration 4)]`** Belongs to the API Delivery Mechanism (located in `src/apps/agroApi/shared/query/`). (Currently, `GenericQueryParser` and other parsing components temporarily reside in `src/shared/domain/query/`).
- API input → Query DSL Contract transformation.
- MUST implement Query DSL Contract rules.
- Translates raw Express request queries into clean Application Layer QueryOptions.
- No business or domain logic allowed.
- Deterministic parsing required.
- Invalid filters must be safely handled or rejected.
- May throw transport-layer/HTTP errors or domain validation exceptions during translation.

---

### 3.14 Query DSL Contract

```sh
/modules/query-dsl-contract.md
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

### 3.15 Shared Utilities System

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

### 3.16 Seed Bank System `[TARGET STATE (Pending Iteration 52)]`

```sh
/modules/seed-bank.md
```

- SeedBatch aggregate root
- seed inventories management (quantity tracking, unlimited stock bypass)
- germination tests log (nested tracking and dynamic rate calculation)
- commercial envelope properties tracking (packagedYear, direct expirationDate)

Rules:

- **`[TARGET STATE (Pending Iteration 52)]`** scoped to a single authenticated User
- references a specific Plant ID for biological rules
- managed via independent MongoDB collection `seed_batches`
- does not depend on spatial or temporal placement logic (completely decoupled from Beds)

---

### 3.17 Authentication & Identity System (Auth)

```sh
/modules/auth.md
```

- local and OAuth providers
- lightweight JWT contracts
- user profile location and hemisphere resolution
- user roles and authorization boundaries
- low-latency Redis caching policies for geographic context

Rules:

- session and JWT payload MUST NOT contain business state (e.g. hemisphere)
- profile attributes and location configurations are queried dynamically under-the-hood

---

### 3.18 Reminders System `[TARGET STATE (Pending Iterations 79 & 85)]`

```sh
/modules/reminders.md
```

- Reminder aggregate root and scheduling logic
- Persistent care schedules (watering, fertilizing, pruning, harvesting, rotations)
- Passive event-driven triggers and automatic rescheduling
- Cascading invalidation rules on soft-delete or container emptiness
- Meteorological adaptivity and weather precipitation delay overrides

Rules:

- Reminders are stateful, persisted records guaranteeing $O(1)$ read performance
- Must support explicit Bed and Instance target scopes
- Weather rain silencing is strictly bypassed for protected environments (indoors, greenhouse)

---

### 3.19 Plant Relations System `[TARGET STATE (Pending Iteration 32)]`

```sh
/modules/plant-relation.md
```

- PlantRelation aggregate root
- directional companionship modeling (helps, helped by, avoids)
- access security rules (admin | collaborator)

Rules:

- represented as a global directed biological graph
- mutable by authorized roles only
- referenced by ID only

---

### 3.20 Observability & Telemetry Pipeline `[TARGET STATE (Pending Iterations 48 & 43)]`

```sh
/modules/observability-pipeline.md
```

- Winston Kafka Transport adapter (equipped with bounded buffers).
- Ingestion agent and router (Vector or Promtail).
- Time-series log database (Grafana Loki).
- Interactive dashboard server (Grafana).

Rules:

- Purely an infrastructure and systems telemetry module.
- Strictly prohibited from containing business logic, agronomic rules, or accessing MongoDB.
- Its data transport lifecycle must be 100% asynchronous and non-blocking.

---

### 3.21 Distributed Event Bus (Kafka) `[TARGET STATE (Pending Iterations 47, 48 & 50)]`

```sh
/modules/event-bus.md
```

- Event Bus Port (`EventBus`) and Handlers.
- InMemory & Kafka adapter implementations (`kafkajs`).
- Transactional Outbox publisher and MongoDB Change Streams listener.
- Progressive Delay Retry Topics and Dead Letter Queue (DLQ).

Rules:

- Purely an application/infrastructure integration module for domain decouplings.
- Handlers MUST be strictly idempotent, tracking processed events to prevent duplicates.
- Message ordering is guaranteed via dynamic partitioning keys (`plantInstanceId` or `bedId`).

---

## 4. DEPENDENCY RULES

```sh
API → Application → Domain
API → Validation
API → Query System
API → Query DSL Contract
API → OpenAPI (HTTP contract only)
API → Auth
Validation → Query System (optional delegation)
Query System → Query DSL Contract
Application → Domain
Application → Spatial
Application → Knowledge (read-only)
Persistence → Domain (mapping only)
Testing → ALL MODULES (read-only, contract-aware)
Shared Utils → (used by API, Testing, Validation only)
Query DSL Contract → (no dependencies on transport or infra)
SeedBank → Domain (references Plant, User)
PlantInstance → SeedBank (references SeedBatch)
Auth → Domain (references User, Email, Uuid)
Reminders → Domain (references User, Uuid)
Reminders → Bed (references Bed)
Reminders → PlantInstance (references PlantInstance)
Reminders → Events (re-calculates on logged Events)
Spatial → PlantRelations (uses graph to compile reports)
PlantRelations → Domain (references Plant, User)
EventBus → Application (defines Port)
EventBus Adapters (InMemory / Kafka) → EventBus (implements Port)
Outbox Publisher → MongoDB (tails outbox via Change Stream)
Outbox Publisher → EventBus (dispatches to Kafka)
Winston Kafka Transport → Kafka App Logs Topic
Vector Agent → Kafka App Logs Topic ➔ Loki
Grafana → Loki
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

### 5.9 Bed/PlantInstance ↔ Auth (Geographic Context Inheritance)

- Beds and PlantInstances inherit geographic setting boundaries (like hemisphere) from the owning User's profile configuration defined in Auth module.

---

### 5.10 Reminders ↔ Core Systems

- Reminders reference Beds and optional PlantInstances.
- Deleting a Bed or soft-deleting a PlantInstance triggers automatic cascading invalidations (dismissal) of corresponding future Reminders.
- Creating, editing, or deleting cultivation Events triggers automatic scheduling and adjustment of scheduled Reminders.

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
| SeedBank           | Private seed inventories   | YES            |
| Auth               | Session & profile security | NO             |
| Reminders          | Stateful care schedules    | YES            |
| Plant Relations    | Directed companion graph   | YES            |

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
