# MODULE: QUERY DSL CONTRACT

version: 1.3.0
source-spec: v1.3.0
status: formalized (derived from feature tests + QueryOptions implementation)

---

## 1. PURPOSE

Defines the canonical Query Language used across AgroApp.

This module specifies how external query parameters are translated into structured QueryOptions used by the application layer.

It is the **semantic contract of filtering, sorting and pagination**, independent of transport (HTTP/OpenAPI).

---

## 2. CORE PRINCIPLE

> The Query DSL is a domain-level language, not a transport format.

Rules:

- independent of HTTP encoding
- independent of OpenAPI
- independent of persistence layer
- deterministic and versioned

---

## 3. QUERY STRUCTURE

The system supports a unified query model:

```ts
QueryOptions<TFilter> {
  filter?: TFilter;
  sort?: SortOptions;
  pagination?: PaginationParams;
  include?: string[];
}
```

---

## 4. FILTER SYSTEM

### 4.1 Filter structure

Filters are expressed as:

```ts
filter[field][operator] = value;
```

Decoded into:

```ts
filter: {
  field: {
    operator: value;
  }
}
```

---

### 4.2 Supported filter types

#### ExactFilter

Operators:

- eq

---

#### StringFilter

Operators:

- eq
- contains
- startsWith
- endsWith

---

#### ArrayFilter

Operators:

- has

Semantics;
matches exact value

- hasAny

Semantics:
matches if ANY value is present

---

#### RangeFilter

Operators:

- eq

Semantics:

- eq: Represents the exact available environmental or physical value (e.g., soil pH, sunlight hours, available spacing). The domain-specific query mappers translate this single value under the hood to find plants whose biological optimal range covers it (exact-match-to-interval queries).

Note on traditional comparison operators (gt, gte, lt, lte):
These traditional range operators are fully supported at the infrastructure layer (GenericQueryParser and MongoQueryTranslator) as generic technical features for future modules (e.g., metric logging or telemetry). However, they are not active or exposed at the domain level (e.g., in `PlantFilter`) nor mapped by plant query mappers, since biological catalog queries adhere strictly to suitability-interval rules.

---

### 4.3 Nested field resolution

Filters MAY target nested domain paths:

Examples:

- identity.family
- phenology.sowing.months
- traits.spacingCm

---

## 5. SORT SYSTEM

### 5.1 Structure

```ts
SortOptions = Record<string, 'asc' | 'desc'>;
```

---

### 5.2 Rules

- multiple fields allowed
- deterministic ordering MUST be enforced by backend
- unknown fields MUST be ignored or rejected (implementation-specific, default: ignore)

---

## 6. PAGINATION SYSTEM

The system supports a dual pagination strategy to cover both static catalogs and high-frequency temporal logs.

### 6.1 Offset Pagination (Current State)

Used for master data, catalogs, and bounded collections where users need to jump to specific pages (e.g., `Plants`, `Families`, `SeedBatch`, `Beds`).

```ts
PaginationParams {
  page: number; // 1-indexed
  limit: number;
}
```

#### Rules (Offset)

- `page` starts at 1.
- `limit` MUST be > 0.
- Implementations MAY enforce a maximum limit.
- Susceptible to skipped or duplicated records if concurrent inserts/deletions occur during navigation.

---

### 6.2 Cursor Pagination (Keyset) `[TARGET STATE (Pending Iteration 72)]`

Used for immutable time-series data, high-volume logs, and infinite-scroll interfaces (e.g., `Events`, `Reminders`).

```ts
CursorPaginationParams {
  cursor?: string; // Opaque base64 encoded string representing the last seen position (e.g., encoded _id or createdAt)
  limit: number;
}
```

#### Rules (Cursor) `[TARGET STATE (Pending Iteration 72)]`

- `cursor` is optional on the first request. Subsequent requests pass the `nextCursor` returned in the previous response payload.
- **Deterministic Tie-Breaker Rule:** To prevent ghost records or infinite scroll loops when multiple entities share the exact same timestamp (e.g., two events generated in the same millisecond), the `cursor` MUST ALWAYS encode a mathematically unique, time-sortable identifier.
- **UUIDv7 Synergy:** Because the system enforces **UUIDv7** (which embeds a 48-bit timestamp followed by random data) for all domain entities, the entity's `id` itself acts as the perfect, native cursor. There is no longer a need to encode complex `[createdAt, _id]` tuples; the raw UUIDv7 string guarantees absolute $O(1)$ chronological sorting with deterministic tie-breaking.
- Guarantees $O(1)$ database seeking performance on massive collections.
- Immutable to concurrent inserts (users scrolling a feed will never see duplicated or skipped events).

---

### 7. INCLUDE SYSTEM `[TARGET STATE (Pending Iteration 19)]`

Optional field expansion and sparse field selection mechanism.

```ts
include: string[]
fields: Record<string, string[]>
```

Rules:

- controls eager loading / projection
- must NOT affect domain logic
- must be safe to ignore at domain level

---

## 8. TRANSPORT ENCODING (IMPORTANT BOUNDARY)

The DSL is encoded over HTTP using:

### deepObject query encoding

Examples:

```md
?filter[name][eq]=tomato
?filter[aliases][hasAny]=roma,beef
?pagination[page]=1
?sort[name]=asc
```

---

IMPORTANT:

- This encoding is NOT part of the DSL
- It is a transport adapter responsibility
- Can be replaced in future (GraphQL, RPC, etc.)

---

## 9. VALIDATION RULES

- invalid operators MUST be rejected at parsing layer
- type coercion MUST be deterministic
- pagination must enforce numeric constraints
- empty filters MUST be treated as undefined

---

## 10. VERSIONING RULES

Breaking changes include:

- adding/removing operators
- changing semantics of existing operators
- changing pagination behavior
- changing sort determinism rules

---

## 11. RELATIONSHIP WITH DOMAIN

Query DSL is consumed by:

- Application use cases
- Repository query builders
- Specification evaluators

It MUST NOT depend on:

- OpenAPI
- HTTP layer
- database implementation

---

## 12. RELATIONSHIP WITH OPENAPI

OpenAPI is a **projection of this DSL**, not its definition.

OpenAPI describes:

- presence of filter/sort/pagination
- structural encoding
- transport format

But NOT:

- operator semantics
- evaluation logic
- filter evaluation rules

---

## 13. FINAL STATEMENT

This module defines the **semantic query language of AgroApp**.

It is stable, versioned, and independent of transport.
