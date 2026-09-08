# MODULE: VALIDATION

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

Validates inbound API requests at the transport boundary level.

---

## 2. CORE PRINCIPLE

Validation is a **schema enforcement layer**, not a business logic layer.

---

## 3. RULES

- Zod is the central tool used for all transport boundary validation and schema declarations. **`[TARGET STATE (Pending Iterations 9, 10, 12, 13 & 14)]`** (Currently, `express-validator` is used at the route boundary).
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

- use field path as key in dot-notation format
- be deterministic across environments
- **`[TARGET STATE (Pending Iterations 9, 10, 12, 13 & 14)]`** include a stable, clean, and idiomatic string message provided natively by Zod (e.g., `"Required"`, `"Invalid UUID"`). (Currently, `express-validator` custom errors are returned).
- MUST NOT require full object presence for PATCH requests

Example:

```json
{
  "message": "Validation error",
  "errors": {
    "identity.name.primary": "Required",
    "id": "Invalid UUID"
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

## 7. PATCH VALIDATION SEMANTICS

PATCH endpoints MUST:

- validate only provided fields
- NOT require full entity payload
- allow partial nested object validation
- NOT invalidate missing sibling fields
- preserve OpenAPI PATCH semantics consistency

---

## 7.1 POPULATED RELATIONS VALIDATION (ZOD UNIONS) `[TARGET STATE (Pending Iteration 18)]`

To support dynamic JSON:API relation population (e.g., `?include=family` resolving the `familyId` string into a structured object containing family `name` and `slug`) without making output schemas loose or fully partial, output validation schemas MUST use **Zod Unions (`z.union`)** on optionally populated relation fields.

- **`[TARGET STATE (Pending Iteration 18)]`** For example, a `Plant` response schema's `family` field is strictly validated as either a valid UUID string OR a picked subset of the `Family` response schema:
  `family: z.union([z.string().uuid(), FamilyResponseSchema.pick({ id: true, name: true, slug: true })])`
- This ensures output schemas remain strictly typed, statically checked by TypeScript, and correctly defined in OpenAPI, without having to make the entire schema loose or optional.

---

## 7.2 ECOLOGICAL & PROPAGATION VALIDATION `[TARGET STATE (Pending Iterations 12 & 30)]`

To support rich catalog data, Zod validation schemas for `Plant` creation/updates enforce strict, conditional, and typed validation:

- **Ecological Traits (Iteration 12):** Validated as a typed nested object containing `edibility` (boolean), `toxicity` (enum), `attractsPollinators` (boolean), and `invasivePotential` (boolean).
  - **Sowing & Propagation Validation (Iterations 12 & 30):**
    - **Sowing Block (`phenology.sowing`):** Must be a structured yet **optional** block to support plants that are sterile or only propagated vegetatively (such as Russian Comfrey). When present, it must strictly validate:
      - `seedsPerHole`: positive integer Range.
      - `germinationDays`: positive integer Range.
      - `months`: a non-empty array of valid months (`1` to `12`).
      - `methods`: an object mapping `direct` (mandatory, with `depthCm` Range) and `nursery` (optional, with `depthCm` Range). Refer strictly to **Module: Plant (plant.md) Section 4.3** for the complete schema and the technical naming transition details from `'starter'` to `'nursery'`.
    - **Propagation Methods (`knowledge.propagation.methods`):** Structured as a record mapping known propagation types (e.g., `seed`, `cutting`, `division`) to detail sub-objects containing `season` (enum), `bestPractices` (non-empty string array), and optional `estimatedTimeWeeks` Range.
  - **Resources (`knowledge.resources`):** Validated as an array of typed attachments (`image` | `video` | `article`) with valid URLs and optional metadata (title, source, tags).
- **Range Schema Invariant Helper:** Any numeric/integer interval range (`RangeSchema`) used across schemas must be validated at the boundary using a refine check to guarantee that `min <= max` holds true.

---

## 8. OPENAPI ALIGNMENT RULE

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
- Health and Auth endpoints `[TARGET STATE (Pending Iteration 10)]`
- Families endpoints `[TARGET STATE (Pending Iteration 13)]`

All MUST maintain consistent error structure, PATCH behavior semantics, and query parsing rules.

---

## 10. QUERY VALIDATION

The validation layer MUST validate query parameters used for filtering, sorting, and pagination.

All schemas MUST enforce the rules specified in the Query DSL Contract:

### 10.1 Filter DSL Schema Validation

- **Operator Whitelist:** Enforce that only valid operators currently defined in **Query DSL Contract (query-dsl-contract.md)** are allowed. Reject any invalid or unmapped operators at the validation schema boundary.
- **Null Rejection:** Reject explicit null values in filters (e.g., `{ name: { eq: null } }`).
- **Type Compatibility:** Ensure query values align with operator expectations (e.g., reject arrays in `eq` operator, reject non-string values in string operators, reject non-numeric values in numeric operators).
- **Nested Field Validation:** Ensure filters only target allowed nested domain paths.
- **Detailed Parsing Delegation:** The parsing, CSV splitting, trimming, and type coercion implementation details are completely delegated to the **Query System (query.md)**.

### 10.2 Sorting Schema Validation

- **Directions:** Only allow `"asc"` or `"desc"` directions. Reject invalid directions.
- **Fields:** Verify that sorting fields are valid. Reject unknown sort keys when strict sorting is enabled.

### 10.3 Pagination Schema Validation

- **Format:** Enforce positive integers.
- **Defaults:** If parameters are missing, apply page = 1 and limit = 25 as defined by the contract.

---

## 11. RESPONSIBILITY BOUNDARY

- **Validation Layer:** Responsible for strict schema enforcement, operator whitelisting, and query structure validation.
- **Persistence Layer:** Responsible for defensive tolerance (never trusts query input blindly; safely ignores unvalidated conditions instead of crashing).
- **Query Layer:** Responsible for parsing, CSV normalization, and type coercion.

---

## 12. FUTURE EVOLUTION

- schema generation from OpenAPI
- optional Zod migration layer
- shared validation + documentation contract
