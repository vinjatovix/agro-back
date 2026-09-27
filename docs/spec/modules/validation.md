# MODULE: VALIDATION

version: 1.4.0
source-spec: v1.4.0
status: stable

---

## 1. PURPOSE

Validates inbound API requests at the transport boundary level.

---

## 2. CORE PRINCIPLE

Validation is a **schema enforcement layer**, not a business logic layer.

---

## 3. RULES

- Zod is the central tool used for all transport boundary validation and schema declarations. **`[TARGET STATE (Pending Iterations [9](../../roadmap.md#iteration-9-establish-zod-validation-middleware), [10](../../roadmap.md#iteration-10-migrate-health-and-auth-endpoints-to-zod), [12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod), [13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod) & [14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** (Currently, `express-validator` is used at the route boundary).
- MUST NOT contain domain logic
- MUST NOT enforce business rules
- MUST be aligned with OpenAPI schemas
- MUST produce structured errors
- MUST allow partial payload validation (PATCH semantics)

---

### 3.1 Header preconditions (`If-Match`)

- `If-Match` on version-protected writes is validated by the dedicated `requireIfMatch` middleware (see api-layer.md §7.1), not by the body/params schemas: it must tell a missing header (`428`) from a malformed one (`400`), which a single validation chain cannot express.
- The parsing rule lives in a pure function (`parseIfMatch`): exactly one strong tag holding a non-negative safe integer, e.g. `"3"`. Malformed values produce the standard validation error with the key `if-match`.
- It runs before body/params validation, so a request with both a bad header and a bad body reports the header.
- It performs no DB access and no business check; comparing the version with the stored one is done by the use case.
- **`[TARGET STATE (Pending [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** wrap `parseIfMatch` in a Zod schema and adopt the RFC 9110 §13.1.1 grammar. **This reverses the current rule** that weak tags and lists are `400`:
  - a comma-separated list of entity tags is accepted; the write proceeds if any tag equals the current version (strong comparison);
  - weak tags (`W/"3"`) and tags the API never emits (`"-1"`, `"abc"`) are well formed but cannot match: they yield no candidate version and the use case answers `412` after the existence check, so `404` still wins over `412`;
  - only a value that is not an entity-tag list (`3`, `"3`, `"3" "4"`) is `400`; missing, empty or `*` stay `428`.

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
- **`[TARGET STATE (Pending Iterations [9](../../roadmap.md#iteration-9-establish-zod-validation-middleware), [10](../../roadmap.md#iteration-10-migrate-health-and-auth-endpoints-to-zod), [12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod), [13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod) & [14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** include a stable, clean, and idiomatic string message provided natively by Zod (e.g., `"Required"`, `"Invalid UUID"`). (Currently, `express-validator` custom errors are returned).
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

## 7.1 POPULATED RELATIONS VALIDATION (ZOD UNIONS) `[TARGET STATE (Pending [Iteration 18](../../roadmap.md#iteration-18-implement-cqrs-read-only-bypass-for-catalog))]`

To support dynamic JSON:API relation population (e.g., `?include=family` resolving the `familyId` string into a structured object containing family `name` and `slug`) without making output schemas loose or fully partial, output validation schemas MUST use **Zod Unions (`z.union`)** on optionally populated relation fields.

- **`[TARGET STATE (Pending [Iteration 18](../../roadmap.md#iteration-18-implement-cqrs-read-only-bypass-for-catalog))]`** For example, a `Plant` response schema's `family` field is strictly validated as either a valid UUID string OR a picked subset of the `Family` response schema:
  `family: z.union([z.string().uuid(), FamilyResponseSchema.pick({ id: true, name: true, slug: true })])`
- This ensures output schemas remain strictly typed, statically checked by TypeScript, and correctly defined in OpenAPI, without having to make the entire schema loose or optional.

---

## 7.2 ECOLOGICAL & PROPAGATION VALIDATION `[TARGET STATE (Pending Iterations [12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod) & [35](../../roadmap.md#iteration-35-make-plant-sowing-block-optional))]`

To support rich catalog data, Zod validation schemas for `Plant` creation/updates enforce strict, conditional, and typed validation:

- **Ecological Traits ([Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod)):** Validated as a typed nested object containing `edibility` (boolean), `toxicity` (enum), `attractsPollinators` (boolean), and `invasivePotential` (boolean).
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
- Health and Auth endpoints `[TARGET STATE (Pending [Iteration 10](../../roadmap.md#iteration-10-migrate-health-and-auth-endpoints-to-zod))]`
- Families endpoints `[TARGET STATE (Pending [Iteration 13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod))]`

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
