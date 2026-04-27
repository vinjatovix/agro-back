# MODULE: MODULES MAP

version: 1.0.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

This document defines the global architecture map of AgroApp.

It describes how modules interact, their boundaries, and dependency direction.

It is the highest-level architectural contract of the system.

---

# 2. ARCHITECTURAL STYLE

AgroApp follows a **modular layered architecture with strict boundaries**:

* Domain modules are isolated
* Application layer orchestrates use cases
* Infrastructure implements persistence and external systems
* Knowledge system is external to core domain
* Spatial system is pure computation layer
* API is transport boundary
* OpenAPI is contract authority layer

---

# 3. MODULES OVERVIEW

## 3.1 Domain Core

```sh
/modules/domain-core.md
```

* Plant aggregate
* Bed aggregate
* PlantInstance entity
* Value Objects
* invariants

Rules:

* no IO
* no persistence
* no external dependencies

---

## 3.2 Knowledge System

```sh
/modules/knowledge.md
```

* pests
* diseases
* remedies
* fertilizers
* plant relations graph

Rules:

* global dataset
* no domain ownership
* referenced by ID only

---

## 3.3 Spatial System

```sh
/modules/spatial.md
```

* collision detection
* spacing validation
* placement rules
* spatial context evaluation

Rules:

* pure computation
* no persistence
* no domain mutation

---

## 3.4 Events System

```sh
/modules/events.md
```

* temporal record of agronomic actions
* watering, fertilization, pruning, etc.

Rules:

* append-only model (future)
* references PlantInstance + Bed
* no domain mutation

---

## 3.5 Persistence System

```sh
/modules/persistence.md
```

* repositories
* DTO mapping
* patch/diff system

Rules:

* domain is source of truth
* persistence is projection
* no business logic

---

## 3.6 API Layer

```sh
/modules/api-layer.md
```

* HTTP controllers
* routing
* middleware
* request/response shaping

Rules:

* no domain logic
* no persistence logic
* no spatial logic

---

## 3.7 Validation System

```sh
/modules/validation.md
```

* request validation
* DTO schema enforcement
* structured error formatting

Rules:

* no domain logic
* MUST align with OpenAPI contract
* transport-only layer

---

## 3.8 OpenAPI Contract

```sh
/modules/openapi.md
```

* external API specification
* single source of truth for API
* schema definitions for requests/responses
* error contract definition

Rules:

* implementation MUST follow spec
* contract drift is critical failure
* used by tests as validation source

---

## 3.9 Testing System

```sh
/modules/testing.md
```

* unit tests (domain, spatial)
* integration tests (application, persistence)
* e2e tests (API)
* contract tests (OpenAPI validation)

Rules:

* no implementation coupling
* 80% minimum coverage
* Sonar quality gate required
* MUST validate OpenAPI contract compliance

---

## 3.10 Plant Instance System

```sh
/modules/plant-instance.md
```

* runtime plant placement
* spatial linkage
* lifecycle tracking inside beds

Rules:

* depends on Plant
* interacts with Spatial System
* no business rules

---

## 3.11 Bed System

```sh
/modules/bed.md
```

* spatial container
* grouping of PlantInstances
* grid alignment anchor

Rules:

* no plant logic
* no event logic
* no knowledge logic

---

# 4. DEPENDENCY RULES

```sh  
API → Application → Domain
API → Validation
API → OpenAPI (contract source)
Application → Domain
Application → Spatial
Application → Knowledge (read-only)
Persistence → Domain (mapping only)
Testing → ALL MODULES (read-only, contract-aware)
```

---

# 5. CROSS-MODULE RELATIONSHIPS

## 5.1 Plant ↔ Knowledge

* Plant references knowledge IDs
* Knowledge does not depend on Plant

---

## 5.2 Plant ↔ Spatial

* Spatial evaluates PlantInstances only
* Plant is definition, not position

---

## 5.3 Events ↔ All systems

Events reference:

* PlantInstance
* Bed
* Knowledge entities (optional)

But do not modify them directly

---

# 6. SYSTEM BOUNDARIES SUMMARY

| Module      | Responsibility          | Mutates Domain |
| ----------- | ----------------------- | -------------- |
| Domain Core | Business model          | YES            |
| Knowledge   | Ecological intelligence | NO             |
| Spatial     | Geometry / rules        | NO             |
| Events      | Temporal history        | NO             |
| API         | HTTP interface          | NO             |
| Validation  | Input validation        | NO             |
| OpenAPI     | Contract authority      | NO             |
| Persistence | Storage mapping         | NO             |

---

# 7. EVOLUTION RULES

Any new module MUST:

* declare dependencies explicitly
* avoid circular references
* respect domain isolation
* be added here before implementation

---

# 8. FINAL NOTE

This document is the **architectural truth source of AgroApp**.

If something contradicts this map, the implementation is wrong — not the spec.
