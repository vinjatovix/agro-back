# MODULE: OPENAPI CONTRACT

version: 1.3.0
source-spec: v1.3.0
status: active

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

> **Query DSL Contract v1.3.0**

Rules:

- filter operators (eq, contains, has, hasAny, etc.) are defined in Query DSL Contract v1.3.0
- sort semantics are defined in Query DSL Contract v1.3.0
- pagination semantics are defined in Query DSL Contract v1.3.0
- OpenAPI ONLY describes the transport shape (how queries are passed via HTTP)

OpenAPI is an **external mapping of the Query DSL**, not its definition.

---

## 4.1 POPULATED RELATION SCHEMAS (oneOf Polymorphism) `[TARGET STATE (Pending Iteration 18)]`

- To support JSON:API relation populating dynamically (e.g., embedding the Family relation in the `family` field on Plant) without breaking OpenAPI static validation, the contract representation of optionally populated fields MUST use the **polymorphic `oneOf` keyword**.
- For example, a Plant's `family` schema is defined as:
  ```yaml
  family:
    oneOf:
      - type: string
        format: uuid
        description: The raw unpopulated Family UUID.
      - $ref: '#/components/schemas/FamilyPickedResponse'
        description: The populated Family relation (only whitelisted fields such as id, name, slug).
  ```
- This directly aligns with the Zod Union implementation strategy (`z.union`) in the validation layer.

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

- POST /api/v1/plants (implemented for `admin`, `collaborator` role is `[TARGET STATE (Pending Iteration 26)]`)

_(Note: In Phase 2 - Social Catalog, we introduce the collaborator role)_

- GET /api/v1/plants (public)
- GET /api/v1/plants/:id (public)
- PATCH /api/v1/plants/:id (implemented for `admin`, `collaborator` role is `[TARGET STATE (Pending Iteration 26)]`)
- DELETE /api/v1/plants/:id (implemented for `admin`, `collaborator` role is `[TARGET STATE (Pending Iteration 26)]`)

#### Query parameters (transport layer only)

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
      Semantic rules are defined in Query DSL Contract v1.3.0

  - name: sort
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      Transport representation of Query DSL sort object.
      Semantic rules are defined in Query DSL Contract v1.3.0

  - name: pagination
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      Transport representation of Query DSL pagination object (Supports Offset `page`/`limit` or Keyset Cursor `cursor`/`limit` `[TARGET STATE]`).
      Semantic rules are defined in Query DSL Contract v1.3.0

  - name: include
    in: query
    required: false
    schema:
      type: array
      items:
        type: string
    description: |
      `[TARGET STATE (Pending Iteration 19)]` Transport representation of JSON:API include parameter.
      Semantic rules are defined in Query DSL Contract v1.3.0.

  - name: fields
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: |
      `[TARGET STATE (Pending Iteration 19)]` Transport representation of JSON:API sparse fields parameter.
      Semantic rules are defined in Query DSL Contract v1.3.0.

  - name: Idempotency-Key
    in: header
    required: false # (Mandatory for critical POST requests)
    schema:
      type: string
      format: uuid
    description: |
      `[TARGET STATE]` A client-generated UUID used to prevent duplicate operations during network retries. 
      Required for state-mutating POST endpoints.
```

---

#### Optional Sowing Schema Alignment `[TARGET STATE (Pending Iteration 30)]`

When implementing **Iteration 30 (Sowing Validation Refinement)**, the developer MUST update the external API contract inside `@src/apps/agroApi/openapi/openapi.yaml`:

- **Plant and UpdatePlant Schemas:** The `phenology.sowing` property MUST be updated to support `nullable: true` (or omitted from the parent `required` array), allowing plants that are sterile or only propagated vegetatively (such as Russian Comfrey) to bypass the sowing definition without violating the OpenAPI schema contract during E2E or contract testing.

---

### 6.2 Families

#### Families Endpoints

- POST /api/v1/families (implemented for `admin`, `collaborator` role is `[TARGET STATE (Pending Iteration 26)]`)
- GET /api/v1/families (public)
- GET /api/v1/families/:idOrSlug (public - supports polymorphic lookup by ID or Slug)
- PATCH /api/v1/families/:id (implemented for `admin` via `:id` parameter; supporting polymorphic `:idOrSlug` lookup for mutations and authorization for the `collaborator` role is pending `[TARGET STATE (Pending Iterations 26 & 27)]`)
- DELETE /api/v1/families/:idOrSlug (completely pending `[TARGET STATE (Pending Iterations 26 & 27)]`, including administrative DELETE use case, controller, routing, and collaborator authorization)

#### Query parameters (transport layer only)

```yaml
parameters:
  - name: filter
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL filter (see Query DSL Contract v1.3.0)

  - name: sort
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL sort (see Query DSL Contract v1.3.0)

  - name: pagination
    in: query
    required: false
    schema:
      type: object
      additionalProperties: true
    description: Query DSL pagination (see Query DSL Contract v1.3.0)
```

---

### 6.3 Beds (user)

#### Beds Endpoints

- POST /api/v1/beds
- GET /api/v1/beds
- GET /api/v1/beds/:id
- PATCH /api/v1/beds/:id
- DELETE /api/v1/beds/:id
- POST /api/v1/beds/:id/layout/validate `[TARGET STATE (Pending Iteration 66)]`
- PUT /api/v1/beds/:id/layout `[TARGET STATE (Pending Iteration 67)]`

#### Schemas

- Bed
- CreateBedRequest
- UpdateBedRequest
- BedResponse

---

### 6.4 PlantInstances (user) `[TARGET STATE (Pending Iterations 38 & 56)]`

PlantInstances are managed as standalone aggregates associated with a specific Bed via query and path references.

- POST /api/v1/plant-instances
- GET /api/v1/plant-instances?bedId={bedId}
- GET /api/v1/plant-instances/{id}
- PATCH /api/v1/plant-instances/{id}
- DELETE /api/v1/plant-instances/{id}
- POST /api/v1/plant-instances/:id/transplant `[TARGET STATE (Pending Iteration 75)]`

#### Schemas

- PlantInstance
- CreatePlantInstanceRequest
- UpdatePlantInstanceRequest
- PlantInstanceResponse

---

### 6.5 Auth / Users

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/google
- GET /api/v1/auth/validate/{token}
- POST /api/v1/auth/update

---

### 6.6 Events (user) `[TARGET STATE (Pending Iterations 70 & 72)]`

- event ingestion API
- filtering by plantInstance / bed / type

#### Endpoints `[TARGET STATE (Pending Iteration 72)]`

- POST /api/v1/events
- GET /api/v1/events
- GET /api/v1/events/:id
- PATCH /api/v1/events/:id
- DELETE /api/v1/events/:id

#### Query parameters

- filter (by type, entity references)
- sort
- pagination

---

### 6.7 Knowledge `[TARGET STATE (Pending Iterations 34 & 35)]`

- anomalies (unifies pests, diseases, disorders, weeds)
  - POST /api/v1/anomalies (admin | collaborator)
  - GET /api/v1/anomalies (public)
  - GET /api/v1/anomalies/:id (public)
  - PATCH /api/v1/anomalies/:id (admin | collaborator)
  - DELETE /api/v1/anomalies/:id (admin | collaborator)
  - GET /api/v1/anomalies/:id/treatments (public)
- garden-inputs (unifies remedies, treatments, repellents, organic fertilizers)
  - POST /api/v1/garden-inputs (admin | collaborator)
  - GET /api/v1/garden-inputs (public)
  - GET /api/v1/garden-inputs/:id (public)
  - PATCH /api/v1/garden-inputs/:id (admin | collaborator)
  - DELETE /api/v1/garden-inputs/:id (admin | collaborator)

---

### 6.8 Plant Relations `[TARGET STATE (Pending Iteration 32)]`

- plant relations graph
  - POST /api/v1/plant-relations (admin | collaborator)
  - GET /api/v1/plant-relations (public)
  - GET /api/v1/plant-relations/:id (public)
  - PATCH /api/v1/plant-relations/:id (admin | collaborator)
  - DELETE /api/v1/plant-relations/:id (admin | collaborator)

---

### 6.9 Seed Bank (user) `[TARGET STATE (Pending Iteration 52)]`

#### Seed Bank Endpoints

- POST /api/v1/seed-batches
- GET /api/v1/seed-batches
- GET /api/v1/seed-batches/:id
- PATCH /api/v1/seed-batches/:id
- POST /api/v1/seed-batches/:id/tests (log a germination test)
- DELETE /api/v1/seed-batches/:id

#### Schemas

- SeedBatch
- GerminationTest
- CreateSeedBatchRequest
- UpdateSeedBatchRequest
- SeedBatchResponse

---

## 7. ERROR CONTRACT

OpenAPI MUST define:

- ApiErrorResponse
- status code mapping
- field-level validation errors

---

### 7.1 Validation error behavior (Validation & Error Contract alignment)

Validation errors MUST be represented as a consistent flat dictionary where keys are full dot-notation field paths and messages are stable, clean, and idiomatic strings provided natively by Zod:

```json
{
  "message": "Validation error",
  "errors": {
    "identity.name.primary": "Required",
    "id": "Invalid UUID",
    "traits.spacingCm.min": "Expected number, received string"
  }
}
```

Rules:

- error keys MUST be full field paths in dot-notation
- error messages MUST be stable and deterministic across environments
- no runtime value leakage or internal framework details should be exposed in validation messages
- OpenAPI MUST define this structure exactly
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

OpenAPI becomes the **external transport contract layer of AgroApp**, while Query DSL Contract v1.3.0 defines the actual semantics of querying.
