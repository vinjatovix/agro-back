# APPLICATION CONTRACT (API SURFACE)

version: 1.2.0
source-spec: v1.1.0
status: evolving

---

## 1. PURPOSE

This module defines the external HTTP contract of AgroApp.

It specifies the resources exposed to clients, including:

- endpoints
- request/response shapes
- domain boundaries visible through HTTP

This module is the formal agreement between the backend and any external consumer.

---

## 2. DOMAIN RESOURCES

The system exposes the following domain resources:

- Plants
- PlantInstances
- Beds
- Events
- Users / Auth
- Families
- Pests
- Diseases
- Remedies
- Fertilizers
- Plant Relations (companion system)
- Ecological Attributes

---

## 3. AUTH SYSTEM

### 3.1 Providers

- local (email/password)
- google OAuth

### 3.2 Features

- user registration
- login
- token refresh
- email validation
- password update

### 3.3 Pending infrastructure

- email delivery service integration (e.g. SendGrid)
- enforcement of email verification flow
- full Google OAuth validation hardening

---

## 4. QUERY SYSTEM (NEW)

This section defines query parameter behavior for all list endpoints (GET collections).

### IMPORTANT BOUNDARY RULE

This module defines **HTTP query shape only**.

Query semantics (operators, filtering behavior, sorting rules, pagination rules) are defined in:

> **Query DSL Contract v1.0.0**

---

### 4.1 Supported Query Features

All collection endpoints MAY support:

- filtering (Query DSL Contract v1.0.0)
- sorting (Query DSL Contract v1.0.0)
- pagination (Query DSL Contract v1.0.0)
- include (future expansion)

---

### 4.2 Pagination

Query shape:

- `page`: number (string input allowed)
- `limit`: number (string input allowed)

Rules:

- default: `page = 1`, `limit = 20`
- values are coerced from string → number
- must be positive integers

---

### 4.3 Sorting

Rules:

- format: `{ field: "asc" | "desc" }`
- field validity and behavior defined in Query DSL Contract v1.0.0
- invalid directions are rejected at validation layer

---

### 4.4 Filter DSL

Filters are passed as structured objects.

All filter semantics are defined in:

> **Query DSL Contract v1.0.0**

This includes:

- eq
- contains
- startsWith
- endsWith
- has
- hasAny
- gt / gte / lt / lte

OpenAPI only defines transport structure.

---

### 4.5 CSV Parsing Rules

- values are split by comma
- whitespace is trimmed
- empty values are removed

Example:

```
"a, , b" → ["a","b"]
```

---

### 4.6 Validation Boundary Rule

- unknown filter keys are rejected by Validation Layer
- Query Parser assumes validated input
- invalid query structures MUST NOT reach persistence layer

---

## 5. RESOURCE CONTRACTS

### 5.1 Plants

- POST /api/v1/plants (implemented) (admin)
- GET /api/v1/plants (implemented) (public)
- GET /api/v1/plants/:id (implemented) (public)
- PATCH /api/v1/plants/:id (implemented) (admin)
- DELETE /api/v1/plants/:id (implemented) (admin)

#### Access control

- GET /api/v1/plants → public (no authentication required)
- POST /api/v1/plants → admin only
- PATCH /api/v1/plants/:id → admin only
- DELETE /api/v1/plants/:id → admin only

#### Query support

GET /api/v1/plants supports:

- filtering (Query DSL Contract v1.0.0)
- sorting (Query DSL Contract v1.0.0)
- pagination (Query DSL Contract v1.0.0)
- include (future)
- populate (future)

---

### 5.1.1 Plant by ID

Behavior:

- returns a Plant aggregate by UUID
- returns 404 if not found
- returns 400 if invalid UUID

---

### 5.1.2 PATCH /api/v1/plants/:id (admin)

Behavior:

- supports partial updates (deep merge semantics)
- only provided fields are modified
- returns full Plant resource after update

---

### 5.2 PlantInstances (user)

Represents a real instance of a Plant placed in a Bed.

Endpoints pending implementation:

- POST /api/v1/plant-instances
- GET /api/v1/plant-instances/:id
- GET /api/v1/plant-instances?bedId=
- PATCH /api/v1/plant-instances/:id
- DELETE /api/v1/plant-instances/:id

---

### 5.3 Beds (user)

- POST /api/v1/beds
- GET /api/v1/beds/:id
- GET /api/v1/beds
- PATCH /api/v1/beds/:id
- DELETE /api/v1/beds/:id

---

### 5.4 Events (user)

Lifecycle events associated with PlantInstances.

Endpoints pending implementation:

- POST /api/v1/events
- GET /api/v1/events
- GET /api/v1/events/:id
- PATCH /api/v1/events/:id
- GET /api/v1/events?plantInstanceId=
- DELETE /api/v1/events/:id

---

### 5.5 Users

- POST /api/v1/auth/register (public)
- POST /api/v1/auth/login (public)
- POST /api/v1/auth/google (public)
- POST /api/v1/auth/refresh (user)
- POST /api/v1/auth/update (user)
- GET /api/v1/auth/validate/:token (user)

#### Roles

- admin
- collaborator
- user

---

### 5.6 Pests

pending implementation

- GET /api/v1/pests
- GET /api/v1/pests/:id

---

### 5.7 Diseases

pending implementation

- GET /api/v1/diseases
- GET /api/v1/diseases/:id

---

### 5.8 Remedies

pending implementation

- GET /api/v1/remedies
- GET /api/v1/remedies/:id

---

### 5.9 Fertilizers

pending implementation

- GET /api/v1/fertilizers
- GET /api/v1/fertilizers/:id

---

### 5.10 Families

- POST /api/v1/families (admin)
- GET /api/v1/families (public)
- GET /api/v1/families/:id (public)

pending implementation:

- PATCH /api/v1/families/:id (admin)
- DELETE /api/v1/families/:id (admin)

Families list endpoints MAY support Query DSL filtering, sorting, and pagination as defined in Query DSL Contract v1.0.0.

---

### 5.11 Plant Relations

Represents companion planting relationships.

pending implementation

- POST /api/v1/plant-relations (admin)
- GET /api/v1/plant-relations (public)
- GET /api/v1/plant-relations/:id (public)
- PATCH /api/v1/plant-relations/:id (admin)
- DELETE /api/v1/plant-relations/:id (admin)

---

## 6. ERROR CONTRACT

All endpoints MUST return a consistent error structure.

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
```

Validation errors:

- dot-notation paths
- deterministic messages
- aligned with EPIC 13
- must handle invalid URI encoding safely (no raw URIError leaks)

---

## 7. STATUS CODES

- 400 → validation error
- 401 → unauthenticated
- 403 → forbidden (role mismatch)
- 404 → resource not found
- 409 → conflict (duplicate resource)

---

## 8. GENERAL RULES

- No business logic in API layer
- No direct domain exposure
- DTOs are mandatory at boundary
- Plant and PlantInstance are strictly separated concepts
- Events are append-only by design
- API acts as translation layer only

---

## 9. CURRENT STATUS

### Implemented

- Plants, Beds: READ + CREATE + PATCH + DELETE
- Families: READ + CREATE
- Auth system (functional end-to-end, Swagger tested)
- validation middleware (partial → evolving)
- error handling (structured)

### Partially designed

- PlantInstances
- Events system
- Pest/Disease/Remedy system

### Missing

- email provider integration

---

## 10. CONTRACT PRINCIPLE

This document defines the external contract of the system.

Any change affecting this module is a breaking change and MUST be versioned.

---

## 11. DEPENDENCY INJECTION STRATEGY

The system uses --Awilix PROXY MODE-- as the active dependency injection mechanism.

### Current state

- Controllers are resolved via proxy container property access
- No manual binding is required
- Dependencies are lazily resolved at runtime through the container proxy
- Controller wiring is simplified and declarative

### Impact

- Eliminates classic binding issues
- Reduces API composition boilerplate
- Standardizes dependency resolution across runtime and tests

---

## 12. FINAL NOTE

This document defines the external contract of the system.

It does NOT describe internal architecture decisions unless they directly affect the HTTP surface or execution contract.
