# MODULE: ARCHITECTURE BOUNDARIES

version: 1.1.0
source-spec: v1.1.0
status: stable

---

## 1. PURPOSE

Defines strict separation rules across AgroApp architecture layers.

---

## 2. CORE RULES

- Domain has no IO
- Spatial has no persistence
- API has no domain leakage
- Events are append-only

---

## 3. QUERY SYSTEM BOUNDARY (NEW)

The Query System is a cross-layer concern and MUST respect strict separation:

- Query DSL definitions are **structural only**
- Query DSL MUST NOT contain business logic
- Query validation belongs to Validation layer
- Query translation belongs exclusively to Persistence layer
- Domain MUST NOT interpret query semantics

### Strict rule

Query objects are treated as:

> data transport structures, not domain concepts

---

## 4. ENFORCEMENT RULES

- no DTO in domain
- no repository in spatial
- no express in domain
- no business logic inside API layer
- no business logic inside persistence layer

---

## 5. SHARED UTILITIES BOUNDARY (NEW)

Shared utilities MUST follow strict purity rules:

- MUST be stateless
- MUST be side-effect free
- MUST NOT access persistence
- MUST NOT access domain services
- MUST NOT encode business rules

Examples of allowed behavior:

- string parsing
- object checks
- transformation helpers

---

## 6. VALIDATION BOUNDARY CLARIFICATION (UPDATED)

- Validation layer is responsible for:
  - input shape validation
  - query structure validation
  - DTO structure validation

- Validation layer MUST NOT:
  - enforce business rules
  - interpret domain meaning
  - perform persistence checks

---

## 7. PERSISTENCE BOUNDARY CLARIFICATION (UPDATED)

- Persistence layer:
  - translates query DSL → Mongo queries
  - applies patches
  - maps DTOs via mappers

- Persistence MUST NOT:
  - validate input correctness
  - enforce domain rules
  - interpret query intent beyond translation

---

## 8. GOAL

Prevent architectural erosion by enforcing strict separation between:

- domain logic
- transport layer
- persistence layer
- validation layer
- query system
- shared utilities

---

## 9. FINAL STATEMENT

Any violation of these boundaries is considered an architectural regression and MUST be corrected before feature completion.
