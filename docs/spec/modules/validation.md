## MODULE: VALIDATION

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

---

# 4. ERROR CONTRACT (CRITICAL)

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
````

---

# 5. VALIDATION OUTPUT RULES (NEW CONTRACT BEHAVIOR)

* errors MUST be Record<string, string>
* error values MUST be deterministic strings
* FieldValidationError.value is ignored at API boundary
* validation output MUST match ApiErrorResponse exactly

---

# 7. FUTURE EVOLUTION

* schema generation from OpenAPI
* optional Zod migration layer
* shared validation + documentation contract
