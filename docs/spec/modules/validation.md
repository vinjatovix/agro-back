## MODULE: VALIDATION

version: 1.0.0
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

---

# 4. ERROR CONTRACT (CRITICAL)

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
```

---

# 5. CURRENT PROBLEM

* errors are stringified blobs
* tests depend on unstable messages
* validation output not standardized

---

# 6. TARGET STATE

* structured field-level errors
* deterministic error formatting
* OpenAPI-aligned validation rules
* no framework leakage (no express internals exposed)

---

# 7. FUTURE EVOLUTION

* schema generation from OpenAPI
* optional Zod migration layer
* shared validation + documentation contract
