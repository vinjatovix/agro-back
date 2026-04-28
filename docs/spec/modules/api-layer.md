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

## 3.3 Pending infrastructure

* email delivery service integration (e.g. SendGrid)
* enforcement of email verification flow
* full Google OAuth validation hardening

---

# 4. RESOURCE CONTRACTS

---

## 4.1 Plants

* POST /plants (implemented)
* GET /plants (implemented)
* PATCH /plants/:id (implemented)
* DELETE /plants/:id (pending)

### 4.1.1 Plant by ID

* GET /plants/:id (implemented)

Behavior:

* returns a Plant aggregate by UUID
* returns 404 if not found
* returns 400 if invalid UUID

* PATCH /plants/:id (implemented)

Behavior:

* supports partial updates (deep merge semantics)
* only provided fields are modified
* returns full updated PlantPrimitives

---

## 4.2 PlantInstances

Represents a real instance of a Plant placed in a Bed.

### Endpoints

* POST /plant-instances
* GET /plant-instances/:id
* GET /plant-instances?bedId=
* PUT /plant-instances/:id
* DELETE /plant-instances/:id

### Concept

* Plant = definition (species template)
* PlantInstance = physical/virtual occurrence in space

---

## 4.3 Beds

* POST /beds
* GET /beds/:id
* GET /beds
* PUT /beds/:id
* DELETE /beds/:id

---

## 4.4 Events

Lifecycle events associated with PlantInstances.

### Endpoints

* POST /events
* GET /events
* GET /events/:id
* GET /events?plantInstanceId=
* DELETE /events/:id

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

* POST /auth/register
* POST /auth/login
* POST /auth/google
* POST /auth/refresh
* POST /auth/update-password
* GET /auth/validate/:token

### Roles

* admin
* collaborator
* user

---

## 4.6 Pests

* GET /pests
* GET /pests/:id

---

## 4.7 Diseases

* GET /diseases
* GET /diseases/:id

---

## 4.8 Remedies

* GET /remedies
* GET /remedies/:id

---

## 4.9 Fertilizers

* GET /fertilizers
* GET /fertilizers/:id

---

## 4.10 Families

* GET /families
* GET /families/:id

---

## 4.11 Plant Relations

Represents companion planting relationships.

* GET /plant-relations
* POST /plant-relations
* GET /plant-relations/:id

---

# 5. ERROR CONTRACT

All endpoints MUST return a consistent error structure.

```ts
type ApiErrorResponse = {
  message: string;
  errors?: Record<string, string>;
};
```

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

* POST /plants
* GET /plants/:id
* authentication system (partial)
* validation middleware (partial)
* base error handling

## Partially designed

* PlantInstances
* Events system
* Pest/Disease/Remedy system

## Missing

* full CRUD coverage
* OpenAPI specification
* email provider integration
* unified DTO enforcement

---

# 9. CONTRACT PRINCIPLE

This document defines the external contract of the system.

Any change affecting this module is a breaking change and MUST be versioned.
