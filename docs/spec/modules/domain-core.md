# MODULE: DOMAIN CORE

version: 1.3.0
source-spec: v1.3.0
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

**`[TARGET STATE (Pending Iteration 24)]`** Geographic Configuration (Optional, used for climate/seasonality resolution and local time scheduling):

- `postalCode`
- `country`
- `hemisphere` (north | south, defaults to north)
- `timezone` (IANA format string, defaults to UTC)

Responsible for:

- ownership
- permissions
- geographical context fallback for agriculture systems
- audit trail

---

## 3. VALUE OBJECTS & BRANDED TYPES

- **Functional Branded Types `[TARGET STATE (Pending Iteration 2)]`**:
  - To prevent "Primitive Obsession" and structural type blindness, all identity fields (such as `PlantId`, `BedId`, `UserId`, `FamilyId`) MUST be modeled as **Functional Branded Types** (TypeScript intersection types) rather than instances of a generic class or raw strings:
    ```typescript
    declare const __brand: unique symbol;
    export type PlantId = string & { readonly [__brand]: 'PlantId' };
    ```
  - **Type Safety**: The compiler will prevent passing a `BedId` where a `PlantId` is expected.
  - **Performance & Serialisation**: At runtime, these are plain native strings, resulting in zero allocation overhead, simplified mapping, and effortless API serialization without requiring `.value` destructuring or `.toPrimitives()` mapping.
  - **Comparison**: Simple string equality checks (`idA === idB`) are used instead of method calls like `.equals()`.

- **`[TARGET STATE (Pending Iteration 3)]` UUIDv7 Standardization:**
  - To optimize database write performance (B-Tree append-only inserts) and natively support perfect chronological cursor pagination, identity factory objects (e.g., `PlantId.random()`) MUST exclusively generate **UUIDv7**.
  - **Backward Compatibility:** The validation schemas (Zod) and factory parsing functions (e.g., `PlantId.create(value)`) MUST continue to accept any valid UUID format (including the legacy UUIDv4). This guarantees absolute backward compatibility with the ~1900 pre-seeded entities (`Plants`, `Families`) already existing in the development databases, requiring zero data migration.

- Uuid (Legacy class, to be retired in Iteration 2)
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
- **`[TARGET STATE (Pending Iteration 1)]` Primitives Relocation:** To completely purge database-specific structures from the core model, any primitive types and helpers (such as `MetadataPrimitives.ts`) currently residing in `src/Contexts/shared/infrastructure/persistence/mongo/types/` must be relocated to the shared domain, ensuring zero outward dependency violations.

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

### 5.1 DOMAIN EXCEPTIONS

Business rule and constraint validation failures throw pure, technology-agnostic exceptions.

Hierarchy:

- `DomainException` (abstract base, supports field-specific error dictionaries)
  - `InvalidArgumentException` (validation / format violations)
  - `DomainNotFoundException` (query / entity absence)
  - `DomainConflictException` (state mutation / concurrency / invariant violations)
  - `DomainUnauthorizedException` (access control rules / authentication failure)
  - `DomainForbiddenException` (authorization / ownership restriction rules)

The domain throws these exceptions directly by instantiating them using the standard `new` operator.

---

### 5.2 DOMAIN MUTATIONS & METADATA OWNERSHIP `[TARGET STATE (Pending Iterations 7 & 8)]`

Aggregates MUST NOT be anemic. All state modifications (such as updating plant properties or resizing a bed) MUST be handled by explicit, business-oriented methods on the Aggregate Root itself (e.g., `bed.updateInfo()`, `plant.updateTraits()`).

Furthermore, the Domain is the sole owner of audit metadata:

- Any business method mutating aggregate state is responsible for updating its own `metadata.updatedAt` timestamp and `metadata.updatedBy` username _in memory_.
- **`[TARGET STATE (Pending Iteration 8)]`** This ensures that when the mutated aggregate is returned by the application layer directly from memory (without a redundant read-after-write `findById`), its audit trail is 100% accurate and up-to-date.

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

## 8. QUERY INTEGRATION BOUNDARY

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
