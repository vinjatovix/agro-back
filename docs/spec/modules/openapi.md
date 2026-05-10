# MODULE: OPENAPI CONTRACT

version: 1.1.0
source-spec: v1.1.0
status: planned

---

## 1. PURPOSE

Defines the formal API contract of AgroApp.

This is the **single source of truth for external consumers**.

---

## 2. SCOPE

Includes:

- endpoints specification
- request schemas
- response schemas
- error contracts
- authentication schemes
- query parameter contracts (filters, sorting, pagination)

---

## 3. CORE PRINCIPLE

OpenAPI is the **contract boundary of the system**.

Rules:

- implementation MUST follow spec
- spec MUST NOT depend on implementation
- contract drift is a critical failure

---

## 4. QUERY CONTRACT OWNERSHIP (IMPORTANT)

OpenAPI **does NOT define query semantics**.

The filtering, sorting, and pagination system is defined in:

> **Query DSL Contract v1.0.0**

Rules:

- filter operators (eq, contains, gt, lte, etc.) are defined in Query DSL Contract v1.0.0
- sort semantics are defined in Query DSL Contract v1.0.0
- pagination semantics are defined in Query DSL Contract v1.0.0
- OpenAPI ONLY describes the transport shape (how queries are passed via HTTP)

OpenAPI is an **external mapping of the Query DSL**, not its definition.

---

## 5. SPEC STRATEGY

### 5.1 Approach

Hybrid model:

- manually defined base spec
- optionally extended via tooling (future)

---

### 5.2 Versioning strategy

Current:

- versioning handled via URL prefix (/api/v1)
- OpenAPI server block does not enforce versioning

Future:

- possible migration to server-based versioning if v2 diverges
- potential introduction of semantic API versions per domain

---

### 5.3 Tooling

Current:

- OpenAPI 3.0 specification
- Swagger UI for documentation and manual testing

Future:

- tsoa (TypeScript decorators)
- zod-openapi bridge (if schema migration happens)

---

## 6. COVERED RESOURCES

### 6.1 Plants

#### Plants Endpoints

- POST /api/v1/plants (admin only)
- GET /api/v1/plants (public)
- GET /api/v1/plants/:id (public)
- PATCH /api/v1/plants/:id (admin only)
- DELETE /api/v1/plants/:id (admin only)

#### Query parameters (NEW) (transport layer only)

```yaml
parameters:
  - name: filter
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      Transport representation of Query DSL filter object.
      Semantic rules are defined in Query DSL Contract v1.0.0

  - name: sort
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      Transport representation of Query DSL sort object.
      Semantic rules are defined in Query DSL Contract v1.0.0

  - name: pagination
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      Transport representation of Query DSL pagination object.
      Semantic rules are defined in Query DSL Contract v1.0.0
```

---

### 6.2 Families (NEW)

#### Families Endpoints

- POST /api/v1/families (admin)
- GET /api/v1/families (public)
- GET /api/v1/families/:idOrSlug (public)

#### Query parameters (transport layer only)

```yaml
parameters:
  - name: filter
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL filter (see Query DSL Contract v1.0.0)

  - name: sort
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL sort (see Query DSL Contract v1.0.0)

  - name: pagination
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL pagination (see Query DSL Contract v1.0.0)
```

---

### 6.4 Plants

#### Plants Endpoints

- POST /api/v1/plants (admin)
- GET /api/v1/plants (public)
- GET /api/v1/plants/:id (public)
- PATCH /api/v1/plants/:id (admin)
- DELETE /api/v1/plants/:id (admin)

#### Query parameters (transport layer only)

```yaml
parameters:
  - name: filter
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL filter (see Query DSL Contract v1.0.0)

  - name: sort
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL sort (see Query DSL Contract v1.0.0)

  - name: pagination
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL pagination (see Query DSL Contract v1.0.0)
```

---

### 6.5 Beds

#### Beds Endpoints (user)

- POST /api/v1/beds
- GET /api/v1/beds
- GET /api/v1/beds/:id
- PATCH /api/v1/beds/:id
- DELETE /api/v1/beds/:id

#### Schemas

- Bed
- CreateBedRequest
- UpdateBedRequest
- BedResponse

---

### 6.6 PlantInstances (FUTURE) (user)

- POST /api/v1/plant-instances
- GET /api/v1/plant-instances
- GET /api/v1/plant-instances/:id
- DELETE /api/v1/plant-instances/:id
- PATCH /api/v1/plant-instances/:id

#### Schemas

- PlantInstance
- CreatePlantInstanceRequest
- PlantInstanceResponse

---

### 6.7 Auth / Users

- POST /api/v1/Auth/register
- POST /api/v1/Auth/login
- POST /api/v1/Auth/refresh
- POST /api/v1/Auth/google
- GET /api/v1/Auth/validate/{token}
- POST /api/v1/Auth/update

---

### 6.8 Events (pending)

- event ingestion API
- filtering by plantInstance / bed / type

#### Query parameters (planned)

- filter (by type, entity references)
- sort
- pagination

---

### 6.9 Knowledge (pending)

- pests
- diseases
- fertilizers
- remedies
- plant relations graph

---

## 7. ERROR CONTRACT

OpenAPI MUST define:

- ApiErrorResponse
- status code mapping
- field-level validation errors

---

### 7.1 Validation error behavior (EPIC 13 alignment)

Validation errors MUST be represented as:

Rules:

- error keys MUST be full field paths
- error messages MUST be deterministic across environments
- runtime value leakage format is part of current system behavior and MUST be reflected in contract tests if enforced
- system MUST safely handle invalid URI encoding without exposing raw URIError stack traces

```json
{
  "message": "Validation error",
  "errors": {
    "field.path": "Invalid value at body. Value: undefined"
  }
}
```

Rules:

- error keys MUST be full field paths
- error messages MUST be deterministic across environments
- runtime value leakage format is part of current system behavior and MUST be reflected in contract tests if enforced
- OpenAPI MUST define this structure exactly once stabilized
- system MUST safely handle invalid URI encoding without exposing raw URIError stack traces

---

### 7.2 Empty response handling (204)

For endpoints returning **204 No Content**:

- response body MUST be empty
- OpenAPI SHOULD NOT define a response schema for 204 OR MUST define `content: {}`

(This aligns with current contract validator behavior in tests)

---

## 8. TESTING INTEGRATION

- contract tests validate OpenAPI compliance
- E2E tests MUST match spec
- no endpoint exists without OpenAPI definition
- validation error shape MUST be covered by contract tests when finalized
- query parameter behavior MUST be validated via contract tests when defined

---

## 9. EVOLUTION RULES

- every new endpoint MUST first exist in OpenAPI
- every new query capability MUST be defined here BEFORE implementation
- breaking changes require version bump
- backward compatibility preferred

---

## 10. FINAL NOTE

OpenAPI becomes the **external transport contract layer of AgroApp**, while Query DSL Contract v1.0.0 defines the actual semantics of querying.
