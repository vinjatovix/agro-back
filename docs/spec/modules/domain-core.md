# MODULE: DOMAIN CORE

version: 1.0.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

Defines the core business entities of AgroApp.

This module is the root of all domain logic.

---

# 2. ENTITIES

## 2.1 Plant

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

## 2.2 PlantInstance

Runtime representation of a Plant in a Bed.

Responsibilities:
- spatial position
- lifecycle state
- link to Plant definition

---

## 2.3 Bed

Spatial container for PlantInstances.

Responsibilities:
- grid anchor
- spatial constraints
- grouping context

---

## 2.4 User

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

# 3. VALUE OBJECTS

- Uuid
- Range
- MonthSet
- Lifecycle
- Metadata

Rules:
- immutable
- self-validating
- no infrastructure dependency

---

# 4. SERIALIZATION RULE

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

# 5. DOMAIN INVARIANTS

- no invalid state allowed at construction time
- range consistency enforced
- identity always validated

---

# 6. BOUNDARY RULES

Domain MUST NOT depend on:

- HTTP
- DB
- validation libs
- frameworks

---

# 7. RELATIONSHIP RULES

- PlantInstance depends on Plant
- Bed contains PlantInstances
- User is global root actor