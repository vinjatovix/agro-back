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

### Endpoints

* POST /api/v1/plants (admin only)
* GET /api/v1/plants (public)
* GET /api/v1/plants/:id (public)
* PATCH /api/v1/plants/:id (admin only)
* DELETE /api/v1/plants/:id (admin only)

---

## 5.2 Beds (pending)

* CRUD full set

---

## 5.3 Auth / Users

* POST /api/v1/Auth/register
* POST /api/v1/Auth/login
* POST /api/v1/Auth/refresh
* POST /api/v1/Auth/google
* GET /api/v1/Auth/validate/{token}
* POST /api/v1/Auth/update

---

## 5.4 Events (pending)

* event ingestion API
* filtering by plantInstance / bed / type

---

## 5.5 Knowledge (pending)

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

---

## 6.1 Validation error behavior (EPIC 13 alignment)

Validation errors MUST be represented as:

Rules:

* error keys MUST be full field paths
* error messages MUST be deterministic across environments
* runtime value leakage format is part of current system behavior and MUST be reflected in contract tests if enforced
* system MUST safely handle invalid URI encoding without exposing raw URIError stack traces

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
* system MUST safely handle invalid URI encoding without exposing raw URIError stack traces

---

## 6.2 Empty response handling (204)

For endpoints returning **204 No Content**:

* response body MUST be empty
* OpenAPI SHOULD NOT define a response schema for 204 OR MUST define `content: {}`

(This aligns with current contract validator behavior in tests)

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
