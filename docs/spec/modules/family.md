# MODULE: FAMILY

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

Defines the botanical family taxonomy system used for plant classification.

It provides ecological grouping metadata for Plant entities.

---

## 2. CORE RESPONSIBILITY

The Families module is responsible for:

- defining botanical family entities
- providing classification metadata for plants
- enabling ecological grouping and comparison
- serving as reference dataset for domain modeling

---

## 3. DOMAIN ROLE

Families is:

- a botanical taxonomy dataset
- a Domain Aggregate Root mutable by administrators and collaborators
- a classification layer for the Plant domain

Families is NOT:

- an active lifecycle manager (like Bed or PlantInstance)
- mutable by standard users

---

## 4. DATA MODEL

Each Family includes:

- id (UUID)
- name
- scientific classification metadata (scientificName, aliases)
- descriptive traits (shortDescription, highlights)
- extra (additional dynamic classification properties)
- metadata (audit trails)

---

## 5. RELATIONSHIPS

### 5.1 Families → Plant

- Plants reference a Family ID
- Family does not depend on Plant
- Relationship is unidirectional

---

### 5.2 Families → Knowledge System

- Families overlap conceptually with ecological knowledge
- Families remain an independent dataset
- No direct coupling allowed

---

## 6. RULES

- **`[TARGET STATE (Pending Iteration 26)]` Access Control & Security (Collaborator Role):** Read-only operations (catalog queries) are completely unauthenticated. Mutating operations (creation, updates, deletion) are currently implemented for the **Administrator** role. Authorizing the **Collaborator** role is strictly pending Iteration 26.
- **Polymorphic idOrSlug Lookup:**
  - **Read Operations (CURRENTLY IMPLEMENTED):** Queries targeting a family resource by its polymorphic identifier dynamically resolve the target (implemented in Express routing using the `:idOrSlug` parameter, refactored from `:slug`). If the identifier is a valid UUID, it retrieves the entity by `id`; otherwise, it evaluates it as an alphanumeric string and performs a lookup on the indexed `slug` property.
  - **Mutation Operations `[TARGET STATE (Pending Iteration 27)]`:** Supporting polymorphic lookup (`idOrSlug`) on mutating endpoints (`PATCH`, `DELETE`) is strictly pending Iteration 27.
- Families MUST NOT contain plant lifecycle business logic
- Families MUST NOT depend on persistence layer

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

---

## 7. CURRENT IMPLEMENTATION STATUS

### Implemented

- Core domain entity and Value Objects
- Persistence mapping and MongoDB repository
- API endpoints (create, retrieve, list, update) `[TARGET STATE (Pending Iteration 13)]`
- Dataset seeding strategy (JSON-based)
- Validation rules for family references

---

## 8. FUTURE EVOLUTION

### 8.1 Dataset management

- static seed dataset
- versioned taxonomy updates

---

### 8.2 Plant integration

- Plant → Family linkage enforcement
- validation of family IDs at Plant creation/update

---

## 9. FINAL NOTE

Families is a classification layer, not a behavioral domain.

It exists to enrich Plant semantics, not to control them.
