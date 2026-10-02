# MODULE: VALIDATION

version: 1.5.0
source-spec: v1.5.0
status: stable

---

## 1. PURPOSE

Validates inbound API requests at the transport boundary level.

---

## 2. CORE PRINCIPLE

Validation is a **schema enforcement layer**, not a business logic layer.

---

## 3. RULES

- Zod is the central tool used for all transport boundary validation and schema declarations. The shared Zod step `validateRequest` (§3.2) exists since [Iteration 9](../../roadmap.md#iteration-9-establish-zod-validation-middleware); Auth moved to it in [Iteration 10](../../roadmap.md#iteration-10-migrate-health-and-auth-endpoints-to-zod) (§3.3); Plants in [Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod) and the single-family Families routes in [Iteration 13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod). **`[TARGET STATE (Pending [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** Beds still use `express-validator` at the route boundary, and the list endpoints keep their query parsers.
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

### 3.2 Zod request validation step (`validateRequest`)

Routes declare one Zod schema per request part and read the cleaned values through a typed accessor (`src/apps/agroApi/middlewares/validateRequest.ts`):

```ts
// route
const updateBedRequest = {
  params: bedIdParams,
  body: updateBedBody
} satisfies RequestSchemas;
router.patch(
  '/beds/:id',
  auth,
  requireIfMatch,
  validateRequest(updateBedRequest),
  invoke(controller)
);

// controller
const { params, body } = getValidatedRequest(res, updateBedRequest);
```

- `validateRequest({ params?, query?, body? })` requires at least one part (an empty object fails at start-up with a configuration error) and validates each declared part in the fixed order params → query → body with `safeParseAsync`; every declared part is parsed, so one `400` lists all failing fields. Parts without a schema are not read.
- On failure it throws `createError.badRequest('Validation error', errors)` (keys and messages per §5); the global error handler renders the unchanged `ApiErrorResponse`. A non-Zod exception thrown inside a schema reaches the error handler unchanged (generic `500`).
- On success the parsed outputs (defaults, coercions and transforms applied) of the declared parts only are kept in a store private to the middleware, keyed by the response, together with the schema that produced each one (not in `res.locals`, which any other code could overwrite); they are read only through `getValidatedRequest`; `req.params`, `req.query` and `req.body` are never modified (Express 5 makes `req.query` read-only). Chained steps (e.g. one on the router and one on the route) merge their outputs; if both declare the same part, the later one wins.
- `getValidatedRequest(res, schemas)` takes the same schemas object given to `validateRequest` on the route, returns those outputs typed as `z.output` of each declared schema, and throws an internal error (generic `500`) if the step is not registered on the route or if a part declared in `schemas` was not validated with that same schema instance (so the returned type always matches the stored data, also across chained steps).
- The step checks shape and types only: no DB access, no use cases, no business rules. Unknown-field rules and their limits are in §6.
- Schema authors MUST NOT write custom messages that echo the submitted value.

### 3.3 Route schemas and empty parts (first applied to Auth)

- Each migrated module keeps its schemas in `controllers/<Module>/requestSchemas.ts`: one schema per part (`registerBody`, `validateMailParams`…) and one request object per route declared `satisfies RequestSchemas` (`registerRequest`, `loginRequest`…). Routes import the request objects from the controllers barrel (the direction `routes → controllers` already used by the API invokers) and pass them to `validateRequest`; controllers import the same object from the sibling file and read `getValidatedRequest(res, xRequest)`, with no `req.body as X` casts or manual checks. Controllers never import from `routes/`. Modules still on `express-validator` keep `routes/<Module>/reqSchemas.ts` until they migrate.
- `apps/agroApi/shared/requestSchemas.ts` holds the shared empty parts, the pattern for later iterations:
  - `emptyQuery` (`z.object({})`): declared as `query` on routes that take no query string; made strict by the step, so any key gets `"Unknown field"` (replaces what `checkExact()` did for the query).
  - `emptyBody` (`z.object({}).optional()`): declared as `body` on GET routes; Express 5 leaves `req.body` `undefined` without a body, so a missing body passes and any field gets `"Unknown field"`.
- Routes validated with `validateRequest` drop `validateBody`: the strict body schema already reports an empty body `{}` as one error per missing required field, and a missing body as `body`. `validateBody` stays only on routes not yet migrated and is removed with the last of them.
- Project message used by Auth (fixed, never echoes input): `"Passwords do not match"` (object refinement with `when`, so it is reported together with other field errors). The Auth use cases import the same constant, so both layers use one text. Password strength is a domain rule, not a schema check. Rules per route: auth.md §3.3.
- Messages, new vs before (Auth):

  | Case                | Before (`express-validator`)                                       | Now (Zod)                                               |
  | ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
  | Bad email `aaJaa`   | `"Invalid value at body. Value: aaJaa"`                            | `"Invalid email address"`                               |
  | Missing `id`        | `"Invalid value at body. Value: undefined"`                        | `"Invalid input: expected string, received undefined"`  |
  | Weak password       | `"Invalid value at body."`                                         | top-level `message` from `PlainPassword` (auth.md §3.3) |
  | Passwords differ    | `"Passwords do not match at body."`                                | `"Passwords do not match"`                              |
  | Unknown field `bar` | one key `fields`: `"Unknown field <bar> in <body> with value <1>"` | `bar`: `"Unknown field"`                                |

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
- include a stable, clean, and idiomatic string message provided natively by Zod (Zod 4 defaults, e.g., `"Invalid input: expected string, received undefined"`, `"Invalid UUID"`) — done for Auth; **`[TARGET STATE (Pending Iterations [12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod), [13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod) & [14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod))]`** for the other modules (currently `express-validator` custom errors are returned there).
- MUST NOT require full object presence for PATCH requests
- follow these key and message rules on routes validated with the shared `validateRequest` middleware (§3.2); routes still on `express-validator` keep their current keys until they migrate:
  - keys are the path inside the request part, without a part prefix (`id`, not `params.id`); array positions are numeric segments (`tags.1`); a problem on the root of a part uses the part name (`params`, `query`, `body`);
  - one message per key; when several problems share a key, the first wins (parts in order params → query → body, then schema order);
  - unknown fields get the fixed message `"Unknown field"`, one entry per field; the field name appears only as the key, never inside a message;
  - at most 20 field errors; if there are more, one extra entry `_truncated` with a fixed generic message is added (at most 21 entries);
  - keys longer than 64 characters (Unicode code points: an emoji counts as one and is never split) are cut to 64 ending with `…`;
  - a failed `.regex()` check whose message contains the schema's pattern (Zod's native message always does) gets the fixed message `"Invalid format"`, so internal patterns never reach the client; a custom message that does not print the pattern is kept;
  - messages never contain submitted values; custom schema messages MUST NOT echo input.

Example:

```json
{
  "message": "Validation error",
  "errors": {
    "identity.name.primary": "Invalid input: expected string, received undefined",
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

Routes validated with `validateRequest` replace `checkExact()` with a stronger guarantee:

- unknown fields are rejected at **any depth** of `body`, and unknown keys of `query` when the route declares a query schema, even if the schema is not written as strict (the middleware makes it strict once, when the route is registered); `params` schemas are not changed;
- `body`/`query` schemas containing `.catch()` or an intersection (`z.intersection`/`.and()`) make the route fail at start-up with a configuration error: `.catch()` silently replaces any invalid input (unknown fields included) with a fallback, so it is rejected at any position, even on a single field, because request input must fail loudly; an intersection drops unknown fields silently, so use `.extend()`/spread shapes instead;
- `body`/`query` schemas containing a loose or catchall object (`.passthrough()`, `.loose()`, `z.looseObject`, `.catchall()`) or a loose record (`z.looseRecord`) also fail at start-up, because they accept unknown fields on purpose; use `z.record` for dynamic keys;
- `body`/`query` schemas containing `z.map`, `z.set`, `z.promise` or `z.function` also fail at start-up, because none of them can come from a JSON body or a query string; any schema type the strict pass does not know (a future Zod type or a third-party schema) fails the same way instead of being left non-strict;
- the strict copies do not keep `.describe()`/`.meta()` metadata, so they MUST NOT be used to generate OpenAPI;
- known limit: the output side of `.pipe()` is made strict too. If a transform adds keys that the piped object does not declare, the client gets `"Unknown field"` for keys it never sent. Declare every key the transform produces in the output schema;
- known limit: a `.prefault()` value is parsed by its strict inner schema, so a prefault holding keys the object does not declare makes every request that omits the field fail with `"Unknown field"` for keys the client never sent. Keep prefault values inside the declared shape;
- known limit: inside a non-discriminated `z.union`, unknown fields get per-field `"Unknown field"` entries only when a single option fails and only because of them; otherwise the client gets one `"Invalid input"` entry at the union's path. Prefer `z.discriminatedUnion`;
- known limit: keys have no part prefix and use `.` as separator, so two problems can share a key (a field named `a.b` and a nested `a.b`; a field named like a part; the same field in two parts). The first wins; the other appears once the first is fixed. Schemas MUST NOT name fields `params`, `query`, `body` or `_truncated`; when errors are truncated, the `_truncated` entry replaces any field error with that key;
- known limit: two keys longer than 64 characters that share their first 63 characters become equal after cutting, so only the first one is reported.

---

## 7. PATCH VALIDATION SEMANTICS

PATCH endpoints MUST:

- validate only provided fields
- NOT require full entity payload
- allow partial nested object validation
- NOT invalidate missing sibling fields
- preserve OpenAPI PATCH semantics consistency
- accept an empty body `{}` as a no-op patch (JSON Merge Patch, RFC 7396; decided 2026-10-02 for Plants and Families): the `If-Match` precondition still applies and the version is not bumped. A missing body is still a `400` at `body`

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
    - **Propagation Methods (`knowledge.propagation.methods`):** Structured as a record mapping known propagation types (e.g., `seed`, `cutting`, `division`) to detail sub-objects whose fields are all optional: `seasons` (non-empty list of `spring` | `summer` | `autumn` | `winter`, each at most once), `bestPractices` (list of texts) and `estimatedTimeWeeks` Range. Method names are camelCase (`leafCutting`).
  - **Resources (`knowledge.resources`):** Validated as an array of attachments, each with a `type` (a required label, e.g. `image`, `video` or `article`; the list is open) and an absolute `http(s)` URL, plus optional metadata (title, source, tags).
- **Range shape only (changed 2026-10-02):** the shared `rangeSchema`/`partialRangeSchema` only check that the bounds are numbers. The range rules (`min <= max`, no negative bounds) belong to the domain `Range`, which reports them as a `400`. Before, the schema also checked `min <= max` with a refine, which duplicated half of the domain rule (it accepted negative bounds the domain then rejected) and broke the "no business rules in validation" principle.
- **Size limits (decided 2026-10-02):** transport limits, not business rules, published in the OpenAPI contract: short text (names, types, labels) up to 200 characters, long text (notes, descriptions, best practices) up to 2000, URLs up to 2048, lists up to 50 items, records (propagation methods) up to 20 keys of up to 50 characters. Trimmed texts (required labels, aliases, harvest description) are measured after trimming, so padding does not count. They live in `REQUEST_LIMITS` (`apps/agroApi/shared/requestSchemas.ts`).

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
- Auth endpoints (Zod via `validateRequest` since [Iteration 10](../../roadmap.md#iteration-10-migrate-health-and-auth-endpoints-to-zod); §3.3)
- Health endpoints and `POST /auth/refresh`: migrated — no input to validate (they read no client input, so they declare no schema and extra query or body is ignored)
- Families endpoints: `POST`, `GET /:idOrSlug` and `PATCH /:idOrSlug` on Zod via `validateRequest` since [Iteration 13](../../roadmap.md#iteration-13-migrate-families-endpoints-to-zod) (schemas in `controllers/Families/requestSchemas.ts`); the listing keeps its query parser until [Iteration 14](../../roadmap.md#iteration-14-migrate-beds-and-query-dsl-to-zod)

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
