# MODULE: BED

version: 1.2.0
source-spec: v1.1.0
status: evolving

---

## 1. PURPOSE

Represents a physical or logical growing space where PlantInstances are placed.

It acts as the spatial and organizational boundary for cultivation.

---

## 2. CORE RESPONSIBILITY

The Bed aggregate is responsible for:

- defining spatial boundaries for planting
- acting as anchor for spatial computations
- grouping PlantInstances logically
- providing spatial context for placement validation
- enforcing ownership boundaries for access control

---

## 3. DOMAIN ROLE

Bed is:

- a spatial aggregate root
- a structural container
- a boundary for spatial rules
- an ownership-scoped resource

Bed is NOT:

- a plant manager
- a lifecycle orchestrator
- an event owner

---

## 4. RELATIONSHIPS

### 4.1 Bed → PlantInstances

- A Bed contains multiple PlantInstances
- PlantInstances are positioned within Bed space
- Spatial rules are evaluated at Bed level

### 4.2 Bed → Spatial System

- Bed provides spatial context
- Bed defines coordinate space assumptions
- Bed is input for SpatialService validation

### 4.3 Bed → User

- Bed is scoped to a single User
- Access is enforced per user ownership
- Cross-user access is forbidden

---

## 5. SPATIAL MODEL

### 5.1 Current model

- Bed defines logical space for placement
- SpatialService uses Bed context for validation
- PlantInstance positioning is validated against Bed occupancy

---

### 5.2 Constraints

- spacing rules apply inside Bed boundaries
- collision detection is Bed-scoped
- no global spatial state exists

---

## 6. QUERY INTEGRATION (NEW)

pending integration for admins ep

- Bed supports the global Query System for collection retrieval.

---

### 6.1 Supported operations

GET /api/v1/beds/audit (admin) MAY support:

- filtering (Query DSL)
- sorting
- pagination
- include (future)
- populate (future)

---

### 6.2 Filter support

Filters MUST follow the Query DSL defined in the API contract:

- string operators: eq, contains, startsWith, endsWith
- array operators: has, hasAny
- numeric operators: gt, gte, lt, lte

---

### 6.3 Validation alignment

- invalid filters MUST be rejected by Validation layer
- Bed domain MUST NOT interpret query semantics
- Bed remains unaware of query parsing internals

---

### 7. RULES

- Bed MUST NOT contain plant business logic
- Bed MUST NOT handle events
- Bed MUST NOT depend on persistence layer
- Bed MUST remain independent of API layer
- Bed MUST NOT allow ownership (userId) modification once created

---

## 8. CURRENT IMPLEMENTATION STATUS

### Implemented

- Bed aggregate structure
- basic spatial anchoring concept
- integration with SpatialService (logical)
- full REST lifecycle coverage (create, read, update, delete)
- ownership enforcement in API layer
- validation contract enforcement (OpenAPI-driven tests)

### Partial

- spatial indexing not implemented
- grid abstraction not formalized in domain
- PATCH semantics validation rules still evolving

### Pending

- persistence layer (admin audit ep not implemented)
- formal grid model (cellSize, coordinate system)
- BedRepository full implementation
- integration with PlantInstance lifecycle
- spatial optimization layer (SpatialIndex)

---

## 9. FUTURE EVOLUTION

### 9.1 Grid system (planned)

- cellSize becomes domain concept
- snapping rules defined at Bed level
- alignment constraints formalized

---

### 9.2 Spatial scaling

- SpatialIndex integration
- performance optimization for large beds
- O(n²) → O(k) resolution

---

### 9.3 PlantInstance integration

- Bed becomes primary container for PlantInstances
- lifecycle queries scoped per Bed
- event aggregation per Bed (future extension)

---

## 10. BOUNDARY RULES

Bed MUST remain:

- domain-only
- persistence-agnostic
- API-agnostic
- deterministic
- ownership-immutable after creation

---

## 11. RELATION TO SPATIAL SYSTEM

Bed is the primary input to:

- SpatialContext
- SpatialService validation
- collision detection
- spacing validation

---

## 12. FINAL NOTE

Bed is a structural aggregate, not a behavioral system.

Its complexity increases only through spatial modeling, not business logic.
