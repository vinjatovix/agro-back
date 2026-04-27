# MODULE: BED

version: 1.0.0
source-spec: v1.0.0
status: evolving

---

# 1. PURPOSE

Represents a physical or logical growing space where PlantInstances are placed.

It acts as the spatial and organizational boundary for cultivation.

---

# 2. CORE RESPONSIBILITY

The Bed aggregate is responsible for:

* defining spatial boundaries for planting
* acting as anchor for spatial computations
* grouping PlantInstances logically
* providing spatial context for placement validation

---

# 3. DOMAIN ROLE

Bed is:

* a spatial aggregate root
* a structural container
* a boundary for spatial rules

Bed is NOT:

* a plant manager
* a lifecycle orchestrator
* an event owner

---

# 4. RELATIONSHIPS

## 4.1 Bed → PlantInstances

* A Bed contains multiple PlantInstances
* PlantInstances are positioned within Bed space
* Spatial rules are evaluated at Bed level

## 4.2 Bed → Spatial System

* Bed provides spatial context
* Bed defines coordinate space assumptions
* Bed is input for SpatialService validation

---

# 5. SPATIAL MODEL

## 5.1 Current model

* Bed defines logical space for placement
* SpatialService uses Bed context for validation
* PlantInstance positioning is validated against Bed occupancy

---

## 5.2 Constraints

* spacing rules apply inside Bed boundaries
* collision detection is Bed-scoped
* no global spatial state exists

---

# 6. RULES

* Bed MUST NOT contain plant business logic
* Bed MUST NOT handle events
* Bed MUST NOT depend on persistence layer
* Bed MUST remain independent of API layer

---

# 7. CURRENT IMPLEMENTATION STATUS

## Implemented

* Bed aggregate structure
* basic spatial anchoring concept
* integration with SpatialService (logical)

## Partial

* persistence layer (CRUD not fully defined)
* spatial indexing not implemented
* grid abstraction not formalized in domain

## Pending

* formal grid model (cellSize, coordinate system)
* BedRepository full implementation
* integration with PlantInstance lifecycle
* spatial optimization layer (SpatialIndex)

---

# 8. FUTURE EVOLUTION

## 8.1 Grid system (planned)

* cellSize becomes domain concept
* snapping rules defined at Bed level
* alignment constraints formalized

---

## 8.2 Spatial scaling

* SpatialIndex integration
* performance optimization for large beds
* O(n²) → O(k) resolution

---

## 8.3 PlantInstance integration

* Bed becomes primary container for PlantInstances
* lifecycle queries scoped per Bed
* event aggregation per Bed (future extension)

---

# 9. BOUNDARY RULES

Bed MUST remain:

* domain-only
* persistence-agnostic
* API-agnostic
* deterministic

---

# 10. RELATION TO SPATIAL SYSTEM

Bed is the primary input to:

* SpatialContext
* SpatialService validation
* collision detection
* spacing validation

---

# 11. FINAL NOTE

Bed is a structural aggregate, not a behavioral system.

Its complexity increases only through spatial modeling, not business logic.
