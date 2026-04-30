# MODULE: VALIDATION

version: 1.1.0
source-spec: v1.0.0
status: stable

---

# 1. PURPOSE

Validates inbound API requests at transport boundary level.

---

# 2. CORE PRINCIPLE

Validation is a **schema enforcement layer**, not a business logic layer.

---

# 3. RULES

* express-validator is transport-only
* MUST NOT contain domain logic
* MUST NOT enforce business rules
* MUST be aligned with OpenAPI schemas
* MUST produce structured errors
* MUST allow partial payload validation (PATCH semantics)

---

# 4. ERROR CONTRACT (CRITICAL)

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
```

---

# 5. VALIDATION ERROR BEHAVIOR

Validation errors MUST:

* use field path as key
* be deterministic across environments
* include a stable string message
* MAY include raw invalid value inside message string
* MUST NOT require full object presence for PATCH requests

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

# 6. CHECK EXACT RULE

checkExact() MUST:

* prevent unknown fields
* enforce strict schema matching

---

# 7. PATCH VALIDATION SEMANTICS (ADDED)

PATCH endpoints MUST:

* validate only provided fields
* NOT require full entity payload
* allow partial nested object validation
* NOT invalidate missing sibling fields
* preserve OpenAPI PATCH semantics consistency

---

# 8. OPENAPI ALIGNMENT RULE (ADDED)

Validation layer MUST:

* align error shape with OpenAPI contract
* ensure field paths match OpenAPI schema structure
* ensure validation errors can be asserted in contract tests when defined

---

# 9. FUTURE EVOLUTION

* schema generation from OpenAPI
* optional Zod migration layer
* shared validation + documentation contract
