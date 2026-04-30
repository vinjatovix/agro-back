# MODULE: APPLICATION CONTRACT (API SURFACE)

version: 1.0.0
source-spec: v1.0.0
status: evolving

---

# 1. PURPOSE

This module defines the external HTTP contract of AgroApp.

It specifies the resources exposed to clients, including:

* endpoints
* request/response shapes
* domain boundaries visible through HTTP

This module is the formal agreement between the backend and any external consumer.

---

# 2. DOMAIN RESOURCES

The system exposes the following domain resources:

* Plants
* PlantInstances
* Beds
* Events
* Users / Auth
* Families
* Pests
* Diseases
* Remedies
* Fertilizers
* Plant Relations (companion system)
* Ecological Attributes

---

# 3. AUTH SYSTEM

## 3.1 Providers

* local (email/password)
* google OAuth

## 3.2 Features

* user registration
* login
* token refresh
* email validation
* password update

## 3.3 Pending infrastructure

* email delivery service integration (e.g. SendGrid)
* enforcement of email verification flow
* full Google OAuth validation hardening

---

# 4. RESOURCE CONTRACTS

---

## 4.1 Plants

* POST /api/v1/plants (implemented)
* GET /api/v1/plants (implemented)
* GET /api/v1/plants/:id (implemented)
* PATCH /api/v1/plants/:id (implemented)
* DELETE /api/v1/plants/:id (implemented)

### 4.1.1 Plant by ID

Behavior:

* returns a Plant aggregate by UUID
* returns 404 if not found
* returns 400 if invalid UUID

---

### PATCH /api/v1/plants/:id (implemented)

Behavior:

* supports partial updates (deep merge semantics)
* only provided fields are modified
* returns full Plant resource after update

---

## 4.2 PlantInstances

Represents a real instance of a Plant placed in a Bed.

### Endpoints

pending implementation

* POST /api/v1/plant-instances
* GET /api/v1/plant-instances/:id
* GET /api/v1/plant-instances?bedId=
* PUT /api/v1/plant-instances/:id
* DELETE /api/v1/plant-instances/:id

### Concept

* Plant = definition (species template)
* PlantInstance = physical/virtual occurrence in space

---

## 4.3 Beds

pending implementation

* POST /api/v1/beds
* GET /api/v1/beds/:id
* GET /api/v1/beds
* PUT /api/v1/beds/:id
* DELETE /api/v1/beds/:id

---

## 4.4 Events

Lifecycle events associated with PlantInstances.

### Endpoints

pending implementation

* POST /api/v1/events
* GET /api/v1/events
* GET /api/v1/events/:id
* GET /api/v1/events?plantInstanceId=
* DELETE /api/v1/events/:id

### Event types

* watering
* fertilization
* pruning
* pest_control
* harvest
* transplant
* growth_update

---

## 4.5 Users

* POST /api/v1/auth/register
* POST /api/v1/auth/login
* POST /api/v1/auth/google
* POST /api/v1/auth/refresh
* POST /api/v1/auth/update 🆕
* GET /api/v1/auth/validate/:token

### Roles

* admin
* collaborator
* user

---

## 4.6 Pests

* GET /api/v1/pests
* GET /api/v1/pests/:id

---

## 4.7 Diseases

* GET /api/v1/diseases
* GET /api/v1/diseases/:id

---

## 4.8 Remedies

* GET /api/v1/remedies
* GET /api/v1/remedies/:id

---

## 4.9 Fertilizers

* GET /api/v1/fertilizers
* GET /api/v1/fertilizers/:id

---

## 4.10 Families

* GET /api/v1/families
* GET /api/v1/families/:id

---

## 4.11 Plant Relations

Represents companion planting relationships.

* GET /api/v1/plant-relations
* POST /api/v1/plant-relations
* GET /api/v1/plant-relations/:id

---

# 5. ERROR CONTRACT

All endpoints MUST return a consistent error structure.

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
````

Validation errors:

* dot-notation paths
* deterministic messages
* aligned with EPIC 13

---

# 6. STATUS CODES

* 400 → validation error
* 401 → unauthenticated
* 403 → forbidden (role mismatch)
* 404 → resource not found
* 409 → conflict (duplicate resource)

---

# 7. GENERAL RULES

* No business logic in API layer
* No direct domain exposure
* DTOs are mandatory at boundary
* Plant and PlantInstance are strictly separated concepts
* Events are append-only by design
* API acts as translation layer only

---

# 8. CURRENT STATUS

## Implemented

* Plants: READ + CREATE + PATCH + DELETE
* Auth system (functional end-to-end, Swagger tested)
* validation middleware (partial → evolving)
* error handling (structured)

## Partially designed

* PlantInstances
* Events system
* Pest/Disease/Remedy system

## Missing

* email provider integration

---

# 9. CONTRACT PRINCIPLE

This document defines the external contract of the system.

Any change affecting this module is a breaking change and MUST be versioned.
