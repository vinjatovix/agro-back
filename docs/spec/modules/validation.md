# MODULE: VALIDATION

version: 1.2.0
source-spec: v1.0.0
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

All MUST maintain consistent error structure and PATCH behavior semantics.

---

## 10. QUERY VALIDATION (NEW)

Validation layer MUST validate query parameters used for filtering, sorting, and pagination.

### 10.1 Filter Validation

Filters MUST:

- match the defined filter DSL structure
- only include allowed operators per field type
- reject invalid combinations (e.g. eq + gt)
- reject null values
- enforce correct data types

Example invalid inputs:

- { name: null }
- { count: { gt: "abc" } }
- { name: { eq: "a", contains: "b" } }

These MUST produce validation errors.

---

### 10.2 Sorting Validation

Sorting MUST:

- use valid field names
- use only allowed directions: 'asc' | 'desc'

---

### 10.3 Pagination Validation

Pagination MUST:

- enforce positive integers
- apply maximum limits if defined

---

### 10.4 Responsibility Boundary

- Validation layer → strict enforcement
- Persistence layer → defensive tolerance

---

## 11. FUTURE EVOLUTION

- schema generation from OpenAPI
- optional Zod migration layer
- shared validation + documentation contract
