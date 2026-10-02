# MODULE: QUERY

version: 1.5.0
source-spec: v1.5.0
status: active

---

## 1. PURPOSE

Define a unified system for parsing, validating and normalizing API query parameters across the application.

### Location `[COMPLETED ([Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`

- **Current State:** Listing queries are validated and decoded by Zod schemas built with `src/apps/agroApi/shared/listQuerySchema.ts` and run by the shared `validateRequest` step. Each resource declares its listing request next to its controllers (`listPlantsRequest` in `controllers/Plants/requestSchemas.ts`, `listFamiliesRequest` in `controllers/Families/requestSchemas.ts`).
- **History:** the hand-written parsers (`GenericQueryParser`, `PlantQueryParser`, `FamilyQueryParser`, `QueryParserUtils` in `src/apps/agroApi/query/`, relocated there in [Iteration 4](../../roadmap.md#iteration-4-relocate-query-parser-to-api-layer)) were removed in Iteration 14. They copied unknown fields into the filter, fell back to `eq` for unknown operators and accepted any sort key.

---

## 2. RESPONSIBILITY

The Query Module is responsible for:

- parsing incoming HTTP query params
- rejecting anything a resource does not declare (fields, operators, sort keys, top-level keys)
- decoding values by the field's type
- providing deterministic query transformation into `QueryOptions<TFilter>`
- ensuring API-level consistency for filtering and pagination

---

## 3. CORE COMPONENTS

### 3.1 `listQuerySchema`

Builds the `query` schema of a listing from the resource's capabilities: `listQuerySchema({ filter, sortableKeys })`. The output is `{ filter?, sort?, pagination }` (an empty `sort` is left out) and is checked at compile time against the `QueryOptions<TFilter>` the use case takes, so no cast is needed.

#### Semantic Contract Exception

All semantic rules, matching behaviors, and operator definitions are defined exclusively in **Module: Query DSL Contract (query-dsl-contract.md)**. The schema only decides what is accepted and how it is decoded.

### 3.2 Field helpers

| Helper              | Operators                                        | Output type           |
| :------------------ | :----------------------------------------------- | :-------------------- |
| `textField()`       | `eq`, `in`, `contains`, `startsWith`, `endsWith` | `StringFilter`        |
| `identifierField()` | `eq`, `in` (UUID values)                         | `ExactFilter<string>` |
| `enumField(values)` | `eq`, `in` (declared values)                     | `ExactFilter<Union>`  |
| `listField(item)`   | `has` (one value), `hasAny`                      | `ArrayFilter<Item>`   |
| `rangeField()`      | `eq` (decimal number)                            | `RangeFilter`         |

Item decoders: `textItem` (trimmed, 1–200 characters), `uuidItem`, `enumItem(values)`, `decimalItem` (`^-?\d+(\.\d+)?$`), `monthItem` (whole number 1–12).

Each field takes exactly one operator (none or several → `400`). Operators of the wrong kind answer a hint (`Use 'in' …` / `Use 'hasAny' …`); any other undeclared operator is an unknown field.

### 3.3 Sort and pagination

- `sort`: declared keys only, `asc` or `desc`.
- `pagination`: `page`/`limit` as digit strings; `limit` ≤ `LIST_LIMITS.maxPageSize` (100); defaults `LIST_LIMITS.defaultPage` (1) and `LIST_LIMITS.defaultPageSize` (25) always applied.

### 3.4 `include` `[TARGET STATE (Pending [Iteration 19](../../roadmap.md#iteration-19-support-jsonapi-sparse-fields-in-query-parser))]`

Not accepted today (`400 "Unknown field"`). Iteration 19 adds it to the listing schema.

---

## 4. RULES

### 4.1 Determinism rule

Query parsing MUST always produce the same output for the same input.

---

### 4.2 Strict typing rule

- values are decoded by the field's declared type, never guessed from the text
- list operators produce arrays; single-value operators produce one value
- invalid formats are rejected with `400` at their path

---

### 4.3 Safety rule

- malformed filters MUST NOT crash the system
- unknown filter fields, operators, sort keys and top-level keys are rejected (`400 "Unknown field"`), so only declared fields reach the repositories
- error messages never echo the submitted value

---

## 5. EDGE CASES

- `eq` with a comma (`"a,b"`) → `400`, hint `in`
- `has` with a comma → `400`, hint `hasAny`
- JSON-string `sort` → `400`
- blank values and nested objects (`eq[$ne]=x`) → `400`

---

## 6. DEPENDENCIES

- shared request schemas (`REQUEST_LIMITS`)
- validation layer (`validateRequest`, `getValidatedRequest`)

---
