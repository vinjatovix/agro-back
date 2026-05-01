# MODULE: SPATIAL SYSTEM

version: 1.0.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

This module defines spatial computation rules for AgroApp.

It is responsible for:

- plant placement validation
- spatial collision detection
- coordinate system consistency

It MUST NOT depend on persistence or API layers.

---

# 2. SCOPE

Includes:

- SpatialService
- SpatialContext
- distance and overlap validation logic
- spatial rules for PlantInstance positioning

---

# 3. CORE PRINCIPLE

Spatial logic is pure computation.

Rules:

- deterministic
- stateless
- no I/O
- no repository access

---

# 4. SPATIAL MODEL

## 4.1 SpatialContext

Represents environment state required for spatial calculations.

Includes:

- bed geometry
- existing plant positions
- spacing constraints

---

## 4.2 SpatialService

Responsible for:

- validating placement
- detecting collisions
- enforcing spacing rules

---

# 5. RULES

## 5.1 Collision rule

Two plants must not overlap based on spacingCm.

---

## 5.2 Distance rule

Distance between plants must respect minimum spacing constraints.

---

## 5.3 Determinism

Same input MUST produce same output always.

---

# 6. CURRENT STATUS

## Implemented

- SpatialService pure implementation
- SpatialContext model
- spacingCm validation rule
- Math-based distance calculations

## Pending

- spatial indexing (optimization layer)
- large-scale performance improvements

---

# 7. ANTI-PATTERNS

- no repository access
- no database queries
- no API logic
- no mutation of domain objects
