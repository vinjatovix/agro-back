# MODULE: DOMAIN CORE

version: 1.1.0
source-spec: v1.1.0
status: stable

---

## 1. PURPOSE

Defines the core business entities of AgroApp.

This module is the root of all domain logic.

---

## 2. ENTITIES

### 2.1 Plant

Definition-only aggregate.

- identity
- traits
- phenology
- knowledge (optional reference)

Invariant rules:

- ranges valid (min ≤ max)
- months [1..12]
- UUID identity

---

### 2.2 PlantInstance

Runtime representation of a Plant in a Bed.

Responsibilities:

- spatial position
- lifecycle state
- link to Plant definition

---

### 2.3 Bed

Spatial container for PlantInstances.

Responsibilities:

- grid anchor
- spatial constraints
- grouping context

---

### 2.4 User

System actor.

Roles:

- admin
- collaborator
- user

Responsible for:

- ownership
- permissions
- audit trail

---

## 3. VALUE OBJECTS

- Uuid
- StringValueObject
- DateValueObject
- PositiveNumber
- Email
- Coordinates
- Range
- MonthSet
- Metadata

Rules:

- immutable
- self-validating
- no infrastructure dependency

---

## 4. SERIALIZATION RULE

Domain entities MUST NOT implement serialization methods.

All transformations:

- Domain → Primitives
- Primitives → Domain
- DTO → Domain

MUST be handled by dedicated mapper modules.

IMPORTANT:

- NO business logic inside primitives
- NO persistence logic

---

## 5. DOMAIN INVARIANTS

- no invalid state allowed at construction time
- range consistency enforced
- identity always validated

---

## 6. BOUNDARY RULES

Domain MUST NOT depend on:

- HTTP
- DB
- validation libraries
- frameworks
- query DSL or filter/parser utilities

---

## 7. RELATIONSHIP RULES

- PlantInstance depends on Plant
- Bed contains PlantInstances
- User is global root actor

---

## 8. QUERY INTEGRATION BOUNDARY (NEW)

The domain layer defines **no query implementation logic**, but MAY expose **query intent types** for read models.

### 8.1 Allowed concept

Domain MAY define:

- filter intent types (e.g. PlantFilterCriteria)
- sort intent enums (domain-level meaning only)

These are:

> semantic contracts, not execution logic

---

### 8.2 Forbidden in Domain

Domain MUST NOT contain:

- filter parsing logic
- CSV parsing
- query string interpretation
- pagination logic
- sorting implementation
- Mongo/SQL translation

---

### 8.3 Responsibility Split

| Concern           | Layer                          |
| ----------------- | ------------------------------ |
| Query parsing     | API / Validation               |
| Query translation | Persistence                    |
| Query execution   | Persistence                    |
| Query semantics   | Domain (optional intent types) |

---

### 8.4 Rationale

This prevents:

- leakage of HTTP query format into domain
- coupling to persistence DSL
- accidental business logic in query parsing layer

---

## 9. FINAL RULE

The Domain Core is:

> a pure, stable, persistence-agnostic model of AgroApp reality

It MUST remain unaffected by:

- transport changes
- Query DSL evolution
- storage strategy changes
