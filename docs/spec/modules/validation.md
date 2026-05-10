# MODULE: VALIDATION

version: 1.3.0
source-spec: v1.1.0
status: stable

---

## 1. PURPOSE

Validates inbound API requests at transport boundary level.

---

## 2. CORE PRINCIPLE

Validation is a **schema enforcement layer**, not a business logic layer.

---

## 3. RULES

- express-validator is transport-only
- MUST NOT contain domain logic
- MUST NOT enforce business rules
- MUST be aligned with OpenAPI schemas
- MUST produce structured errors
- MUST allow partial payload validation (PATCH semantics)

---

## 4. ERROR CONTRACT (CRITICAL)

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
```

---

## 5. VALIDATION ERROR BEHAVIOR

Validation errors MUST:

- use field path as key
- be deterministic across environments
- include a stable string message
- MAY include raw invalid value inside message string
- MUST NOT require full object presence for PATCH requests

Example:

```json
{
  "message": "Validation error",
  "errors": {
    "id": "Invalid value at params. Value: invalid-id"
  }
}
```

---

## 6. CHECK EXACT RULE

checkExact() MUST:

- enforce validation on explicitly declared fields
- detect unknown fields at the top-level validation layer
- NOT be considered a full deep schema enforcement mechanism for nested objects
- be complemented with explicit strict validation for nested payloads when required

---

## 7. PATCH VALIDATION SEMANTICS (ADDED)

PATCH endpoints MUST:

- validate only provided fields
- NOT require full entity payload
- allow partial nested object validation
- NOT invalidate missing sibling fields
- preserve OpenAPI PATCH semantics consistency

---

## 8. OPENAPI ALIGNMENT RULE (ADDED)

Validation layer MUST:

- align error shape with OpenAPI contract
- ensure field paths match OpenAPI schema structure
- ensure validation errors can be asserted in contract tests when defined

---

## 9. CURRENT IMPACT AREAS

Validation system currently includes rules affecting:

- Plants endpoints
- Beds endpoints (new full CRUD coverage)
- Query DSL parsing (filters, sorting, pagination)

All MUST maintain consistent error structure, PATCH behavior semantics, and query parsing rules.

---

## 10. QUERY VALIDATION (UPDATED)

Validation layer MUST validate query parameters used for filtering, sorting, and pagination.

---

### 10.1 FILTER DSL VALIDATION

Filters MUST conform to the supported operator model:

#### Supported operators

- Equality: `eq`
- String:
  - `contains`
  - `startsWith`
  - `endsWith`

- Array:
  - `includes`
  - `hasAny` (CSV supported)
  - `has` (CSV supported)

- Numeric:
  - `gt`
  - `gte`
  - `lt`
  - `lte`

---

#### 10.1.1 Type coercion rules

- Numeric operators MUST coerce string numbers to `number`
- Invalid numeric values MUST trigger validation errors
- CSV values MUST be transformed into `string[]` by splitting on `,`
- Whitespace in CSV values MUST be trimmed
- Empty CSV entries MUST be ignored

---

#### 10.1.2 Invalid filter rules

The following MUST be rejected:

- null values in filters
- arrays in `eq` operator
- non-string values in string operators
- invalid numeric values (NaN, non-parsable strings)

Examples:

- `{ name: null }`
- `{ name: { eq: ["a"] } }` (arrays not allowed in eq) must use has `{ sowingMonths: { has: [1,2,3] } }`
- `{ name: { eq: 123 } }` (expected string)
- `{ count: { gt: "abc" } }` (invalid number)

---

#### 10.1.3 Operator consistency rules

- A single field MAY include multiple operators if semantically valid
- Conflicting operator combinations SHOULD be rejected when ambiguous
  (e.g. invalid type combinations per implementation constraints)

---

### 10.2 SORTING VALIDATION

Sorting MUST:

- use valid field names
- use only allowed directions:
  - `asc`
  - `desc`

- reject invalid direction values
- allow empty sort object

---

### 10.3 PAGINATION VALIDATION

Pagination MUST:

- enforce positive integers
- coerce numeric strings to numbers
- apply defaults when missing:
  - page = 1
  - limit = 20

- enforce maximum limits if defined by API layer

---

### 10.4 QUERY PARSER ERROR BEHAVIOR

Query parsing errors MUST:

- throw deterministic validation errors
- distinguish between:
  - type errors (expected string/number)
  - structural errors (invalid filter object)
  - semantic errors (unsupported operator usage)

Error messages SHOULD remain stable for contract testing.

---

### 10.5 RESPONSIBILITY BOUNDARY

- Validation layer → strict enforcement + query DSL parsing
- Persistence layer → defensive tolerance (never trusts query input blindly)

---

## 11. QUERY VALIDATION (NEW)

Validation layer MUST validate query parameters used for filtering, sorting, and pagination.

This includes full support for:

- GenericQueryParser rules
- QueryParserUtils normalization
- CSV parsing
- numeric coercion
- include/sort parsing

---

## 12. QUERY PARSER UTILITIES ALIGNMENT

Validation MUST remain consistent with utility behavior:

- `parseCsv()`:
  - splits by comma
  - trims values
  - removes empty entries

- `toNumber()`:
  - returns fallback if invalid
  - supports string conversion

- `parseSort()`:
  - accepts valid JSON or object form
  - only allows `asc | desc`
  - returns undefined if invalid

- `parseInclude()`:
  - accepts CSV or array
  - coerces values to string
  - rejects invalid types (returns undefined)

---

## 13. FUTURE EVOLUTION

- schema generation from OpenAPI
- optional Zod migration layer
- shared validation + documentation contract
