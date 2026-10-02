# MODULE: QUERY DSL CONTRACT

version: 1.5.0
source-spec: v1.5.0
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
- in (matches any of the listed values; `$in` in Mongo)

---

#### StringFilter

Operators:

- eq
- in (matches any of the listed values)
- contains
- startsWith
- endsWith

Semantics:
`contains`, `startsWith` and `endsWith` match the value as literal text, case-insensitively (partial, prefix and suffix match). Every character is literal, including `. * + ? ^ $ { } ( ) | [ ] \`; a UUID-shaped value is matched as text too. A value that would be an invalid or slow pattern is just text that matches nothing (or its literal occurrences) and answers `200`, never `500`.

---

#### ArrayFilter

Operators:

- has

Semantics:
takes one value; matches when the list contains it (membership). A comma in the value answers `400` with the hint to use `hasAny`.

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
These traditional range operators are supported by `MongoQueryTranslator` as generic technical features for future modules (e.g., metric logging or telemetry). No resource declares them today, so a request using them answers `400`; biological catalog queries adhere strictly to suitability-interval rules.

---

### 4.4 Operators by field type

Each resource declares its filter fields and their type; a field accepts the operators of its type and nothing else (see the per-resource capabilities in `specs/018-migrate-beds-query-zod/data-model.md` §2.4 and the OpenAPI `PlantListFilter` / `FamilyListFilter`).

| Type       | Operators                                        | Value                          |
| :--------- | :----------------------------------------------- | :----------------------------- |
| text       | `eq`, `in`, `contains`, `startsWith`, `endsWith` | trimmed text, 1–200 characters |
| identifier | `eq`, `in`                                       | UUID                           |
| enumerated | `eq`, `in`                                       | one of the declared values     |
| list       | `has`, `hasAny`                                  | the item type of the list      |
| range      | `eq`                                             | finite decimal number          |

- **One operator per field**: a field with no operator or with more than one operator answers `400` (`"Use one operator per field"` at `filter.<field>`).
- **Hints**: `has`/`hasAny` on a text, identifier or enumerated field answers `"Use 'in' to match any of several values"`; `in` on a list field answers `"Use 'hasAny' to match any of several values"`; a comma in `eq` or `has` gives the same hints.
- **List values** (`in`, `hasAny`): a comma-separated string or a repeated key; entries trimmed, blanks dropped, 1–50 entries left; an invalid entry is reported at its index (`filter.lifeCycle.in.1`).

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
- each resource declares its sortable keys; any other key, any direction other than `asc`/`desc`, and the JSON-string form (`sort={"name":"asc"}`) are rejected with `400`
- sort keys are public names: a repository maps them to stored paths (plants: `name` → `identity.name.primary`, `scientificName` → `identity.scientificName`)

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
- `limit` MUST be > 0 and at most 100 (`LIST_LIMITS.maxPageSize`); above → `400`.
- `page` and `limit` are whole numbers written as digits (`1.5`, `1e3`, `0x10` → `400`); defaults `page: 1`, `limit: 25` are always applied.
- Unknown pagination keys (`pagination[size]`) → `400`.
- Susceptible to skipped or duplicated records if concurrent inserts/deletions occur during navigation.

---

### 6.2 Cursor Pagination (Keyset) `[TARGET STATE (Pending [Iteration 72](../../roadmap.md#iteration-72-expose-cultivationlog-crud-endpoints))]`

Used for immutable time-series data, high-volume logs, and infinite-scroll interfaces (e.g., `Events`, `Reminders`).

```ts
CursorPaginationParams {
  cursor?: string; // Opaque base64 encoded string representing the last seen position (e.g., encoded _id or createdAt)
  limit: number;
}
```

#### Rules (Cursor) `[TARGET STATE (Pending [Iteration 72](../../roadmap.md#iteration-72-expose-cultivationlog-crud-endpoints))]`

- `cursor` is optional on the first request. Subsequent requests pass the `nextCursor` returned in the previous response payload.
- **Deterministic Tie-Breaker Rule:** To prevent ghost records or infinite scroll loops when multiple entities share the exact same timestamp (e.g., two events generated in the same millisecond), the `cursor` MUST ALWAYS encode a mathematically unique, time-sortable identifier.
- **UUIDv7 Synergy:** Because the system enforces **UUIDv7** (which embeds a 48-bit timestamp followed by random data) for all domain entities, the entity's `id` itself acts as the perfect, native cursor. There is no longer a need to encode complex `[createdAt, _id]` tuples; the raw UUIDv7 string guarantees absolute $O(1)$ chronological sorting with deterministic tie-breaking.
- Guarantees $O(1)$ database seeking performance on massive collections.
- Immutable to concurrent inserts (users scrolling a feed will never see duplicated or skipped events).

---

### 7. INCLUDE SYSTEM `[TARGET STATE (Pending [Iteration 19](../../roadmap.md#iteration-19-support-jsonapi-sparse-fields-in-query-parser))]`

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

Enforced by the Zod listing schema (`listQuerySchema`) through `validateRequest`, with every error reported at its path in the shared `{ message, errors }` shape and without echoing the submitted value:

- only `filter`, `sort` and `pagination` are accepted at the top level; any other key (`include`, `foo`) → `400 "Unknown field"`
- undeclared fields and operators → `400 "Unknown field"` at their path
- values are decoded by the field's type, never guessed from the text; a value outside the type → `400`
- blank values (`filter[name][contains]=`) → `400`; nested objects (`eq[$ne]=x`) and repeated keys on single-value operators → `400`
- one operator per field
- pagination enforces the numeric constraints of §6.1

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
