# MODULE: QUERY DSL CONTRACT

version: 1.0.0
source-spec: v1.1.0
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
- gte
- lte

Semantics:
numeric comparison over comparable fields

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

### 6.1 Structure

```ts
PaginationParams {
  page: number;
  limit: number;
}
```

---

### 6.2 Rules

- page starts at 1
- limit MUST be > 0
- implementations MAY enforce max limit

---

### 7. INCLUDE SYSTEM

Optional field expansion mechanism.

```ts
include: string[]
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
