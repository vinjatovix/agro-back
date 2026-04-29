# MODULE: OPENAPI CONTRACT

version: 1.0.0
source-spec: v1.0.0
status: planned

---

# 1. PURPOSE

Defines the formal API contract of AgroApp.

This is the **single source of truth for external consumers**.

---

# 2. SCOPE

Includes:

* endpoints specification
* request schemas
* response schemas
* error contracts
* authentication schemes

---

# 3. CORE PRINCIPLE

OpenAPI is the **contract boundary of the system**.

Rules:

* implementation MUST follow spec
* spec MUST NOT depend on implementation
* contract drift is a critical failure

---

# 4. SPEC STRATEGY

## 4.1 Approach

Hybrid model:

* manually defined base spec
* optionally extended via tooling (future)

---
## 4.2 Versioning strategy

Current:

* versioning handled via URL prefix (/api/v1)
* OpenAPI server block does not enforce versioning

Future:

* possible migration to server-based versioning if v2 diverges
* potential introduction of semantic API versions per domain

--- 

## 4.3 Tooling

Current:

* OpenAPI 3.0 specification
* Swagger UI for documentation and manual testing

Future:

* tsoa (TypeScript decorators)
* zod-openapi bridge (if schema migration happens)

---

# 5. COVERED RESOURCES

## 5.1 Plants

* POST /plants
* GET /plants
* GET /plants/:id
* PATCH /plants/:id
* DELETE /plants/:id (pending implementation)

---

## 5.2 Beds

* CRUD full set

---

## 5.3 Auth / Users

* register
* login
* refresh token
* google auth
* email validation

---

## 5.4 Events (future)

* event ingestion API
* filtering by plantInstance / bed / type

---

## 5.5 Knowledge (read-only)

* pests
* diseases
* fertilizers
* remedies
* plant relations graph

---

# 6. ERROR CONTRACT

OpenAPI MUST define:

* ApiErrorResponse
* status code mapping
* field-level validation errors

### 6.1 Validation error behavior (EPIC 13 alignment)

Validation errors MUST be represented as:

* deterministic
* errors MUST use dot notation keys
* structured under `errors`

```json
{
  "message": "Validation error",
  "errors": {
    "field.path": "Invalid value at body. Value: undefined"
  }
}
```

Rules:

* error keys MUST be full field paths
* error messages MUST be deterministic across environments
* runtime value leakage format is part of current system behavior and MUST be reflected in contract tests if enforced
* OpenAPI MUST define this structure exactly once stabilized

---

# 7. TESTING INTEGRATION

* contract tests validate OpenAPI compliance
* E2E tests MUST match spec
* no endpoint exists without OpenAPI definition
* validation error shape MUST be covered by contract tests when finalized

---

# 8. EVOLUTION RULES

* every new endpoint MUST first exist in OpenAPI
* breaking changes require version bump
* backward compatibility preferred

---

# 9. FINAL NOTE

OpenAPI becomes the **external truth layer of AgroApp**.
