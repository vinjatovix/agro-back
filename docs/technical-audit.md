# Technical Audit Report: AgroApp Backend (Agro-Back)

**Author:** Gemini Architect  
**Status:** Complete  
**Date:** August 2026  
**Context:** Brownfield Codebase Analysis before Feature Ingestion

---

## 1. Executive Summary

A comprehensive and exhaustive technical audit of the current `agro-back` codebase was performed. The repository exhibits a highly mature foundation with strict typescript configurations, robust serialization boundaries, and rich Value Objects. However, several critical architectural deviations from Domain-Driven Design (DDD) and Hexagonal Architecture principles have been identified.

Most notably, the domain layer has leaked into transport-layer HTTP semantics, and dependency inversion has been violated by core domain objects referencing low-level database (MongoDB) primitive namespaces.

By addressing these issues in a **Phase 0: Consolidation & Refactoring** stage, we will protect the codebase from structural degradation, remove boilerplate overhead, and drastically simplify the addition of the new catalog and OAuth systems.

---

## 2. Key Strengths (What is Done Excellently)

- **Strong Encapsulation & Value Objects:** Properties are wrapped in rich, immutable Value Objects (such as `Uuid`, `Email`, `Range`, `MonthSet`, `Coordinates`, `UserRoles`). Business-level constraints are encapsulated tightly.
- **Strict Serialization Boundaries:** Persistence mappers (e.g. `familyPersistenceMapper.ts`, `plantPersistenceMapper.ts`) isolate MongoDB-specific structures (like `_id` and raw DB documents) from clean domain entities.
- **Excellent TypeScript Strictness:** Type safety is rigorously maintained, with minimal unsafe casts (`as someType`) or escape hatches like `any`.
- **Decoupled Error Shielding:** Uncaught errors (such as MongoDB driver issues) are caught by global error middleware and securely masked, preventing server internals from leaking to clients.
- **Mature Unit Testing:** High-quality unit tests heavily leverage testing patterns like Mothers and Builder patterns (e.g. `UserMother`, `EmailMother`, `PlantFactory`) for readability and decoupling.

---

## 3. Architectural Risks & Red Flags (Critical Deviations)

### 🚨 Red Flag 1: Coupling of Domain to HTTP/Transport (HttpError Leakage)

- **Findings:** Every domain value object and aggregate root (e.g., `PlainPassword.ts`, `UserRoles.ts`, `PlantSowing.ts`, `HarvestYield.ts`, `Bed.ts`) imports `createError` from `src/shared/errors/index.ts` to throw `HttpError` (specifically `BadRequestError` or `UnauthorizedError`) directly on invariant failures.
- **Why it's a risk:** This directly violates Hexagonal Architecture. The core business domain must be entirely agnostic of its entry points. Status codes or HTTP concepts should not exist in the domain layer. If this codebase were ported to a CLI, Cron Job, or gRPC server, it would drag HTTP semantics with it.
- **Evidence:**
  ```typescript
  // In src/Contexts/Agro/Plants/domain/value-objects/PlantSowing.ts
  import { createError } from '../../../../shared/errors/index.js'; // Points to HttpErrors
  ...
  if (sowingMonths.value.size === 0) {
    throw createError.badRequest('Sowing months cannot be empty'); // Leaks HTTP 400
  }
  ```

### 🚨 Red Flag 2: Domain-to-Infrastructure Dependency Violation

- **Findings:** The domain value object `Metadata.ts`, and core primitives like `BedPrimitives.ts` and `UserPrimitives.ts`, import `MetadataPrimitives` directly from the `src/shared/infrastructure/persistence/mongo/types/` folder.
- **Why it's a risk:** This violates the fundamental Clean Architecture Dependency Rule: dependencies must only point inwards. The core business domain must never import from low-level database infrastructure directories.
- **Evidence:**
  ```typescript
  // In src/Contexts/shared/domain/valueObject/Metadata.ts
  import type { MetadataPrimitives } from '../../../shared/infrastructure/persistence/mongo/types/index.js'; // Leak!
  ```

### 🚨 Red Flag 3: Anemic Aggregates & Application-Level State Mutation

- **Findings:** Aggregate roots like `Plant` and `Family` are anemic regarding mutations. Use cases (like `UpdatePlant` and `UpdateFamily`) fetch the entity, serialize it to primitives, apply a patch externally using a utility (`applyPatch`), instantiate a temporary domain model to trigger validations (which is then discarded), and save via primitives.
- **Why it's a risk:** This subverts DDD. State transitions must be explicitly model-driven and handled inside the aggregate itself (e.g., `plant.update(newProps)`). Mutating aggregates using external generic patchers bypasses encapsulation and dilutes business logic into the application use cases.
- **Evidence:** `src/Contexts/Agro/Plants/application/useCases/UpdatePlant.ts` uses external primitive manipulation instead of exposing business-oriented methods on the `Plant` aggregate root.

### 🚨 Red Flag 4: Redundant Database Reads on Updates

- **Findings:** In use cases such as `UpdatePlant` and `UpdateFamily`, after the repository saves the primitive changes to the database, the use case issues an extra call to `this.plantRepository.findById` to re-fetch the entity just to return it.
- **Why it's a risk:** Adds unnecessary database roundtrips, increasing latency and database load under high-concurrency scenarios.

### 🚨 Red Flag 5: Express-Validator Validation Duplication

- **Findings:** High-level API structures (`express-validator` schemas in `reqSchemas.ts`) duplicate the exact business constraints validated inside Domain Value Objects.
- **Why it's a risk:** High maintenance overhead; developers must modify both the web route schemas and the domain objects whenever fields change.

### 🚨 Red Flag 6: DI Manual Wiring Boilerplate

- **Findings:** `container.ts` is a 544-line manual wiring registry. Every class is registered via manual factories using `asFunction` to destructure and reconstruct constructors.
- **Why it's a risk:** Slows down development and creates a bottleneck. Creating a new controller or use case requires updating the Container Cradle, writing a manual factory, and mapping dependencies.

### 🚨 Red Flag 7: Gherkin BDD Coupled to Technical HTTP Details

- **Findings:** Cucumber Gherkin features are written as raw technical API integrations rather than business behaviors (referencing routes, POST/PATCH verbs, status codes, and exact stringified Express-Validator errors).
- **Why it's a risk:** Non-technical stakeholders cannot participate, and minor API routing or error phrasing changes break dozens of features, defeating the purpose of BDD.
- **Evidence:**
  ```gherkin
  # In tests/apps/agroApi/features/Plants/create-plant.feature
  When I send a POST request to "/api/v1/plants" with body:
  Then the response status code should be 400
  And the response body should contain "Validation error"
  ```

### 🚨 Red Flag 8: Inconsistent Sub-module Structure

- **Findings:** `PlantInstances` lives as a root context folder at the same level as `Beds` or `Plants`, yet it has no use cases or persistence. It is fully managed as an embedded child entity of the `Bed` aggregate.
- **Why it's a risk:** Creates false expectations about aggregate boundaries and violates standard folder nesting.

---

## 4. Actionable Consolidation Tasks (Phase 0: Refactoring Backlog)

These tasks are designed to be executed sequentially as a "Phase 0" before diving into Fase 1 feature development.

### Task 0.1: Decouple Domain from HTTP Semantics

- **Objective:** Completely remove `HttpError` dependencies from the Domain layer.
- **Action Steps:**
  1. Define pure, standard Domain Exceptions (e.g., `InvalidPasswordException`, `InvalidSowingException`, `EntityNotFoundException`) that extend a base `DomainException` (which extends `Error`). No HTTP concepts allowed.
  2. Refactor Domain Value Objects and Aggregate Roots to throw these pure exceptions.
  3. Enhance the global API `errorHandler.ts` middleware or create an Exception Mapper/Adapter to intercept `DomainException` and safely map them to corresponding HTTP statuses (e.g. `InvalidSowingException` -> 400 Bad Request; `EntityNotFoundException` -> 404 Not Found).
- **Impact:** Completely isolates the domain, fulfilling the core promise of Hexagonal Architecture.

### Task 0.2: Relocate Core Primitives to Domain

- **Objective:** Eliminate the import of infrastructure types in domain Value Objects.
- **Action Steps:**
  1. Move `MetadataPrimitives.ts` from `src/shared/infrastructure/persistence/mongo/types/` to `src/Contexts/shared/domain/valueObject/` or a shared domain types directory.
  2. Fix imports in `Metadata.ts`, `BedPrimitives.ts`, `UserPrimitives.ts`, and `User.ts`.
- **Impact:** Removes the critical Clean Architecture boundary violation.

### Task 0.3: Transition to Rich Domain Updates (Anti-Anemic)

- **Objective:** Restore encapsulation and aggregate root authority for state mutations.
- **Action Steps:**
  1. Remove generic primitive-based `applyPatch` from use cases.
  2. Add meaningful domain mutation methods (e.g. `plant.update(newProps)`) inside Aggregate Roots.
  3. Refactor use cases to call these domain methods, save, and directly return the mutated aggregate root, eliminating the redundant read-after-write query.
- **Impact:** Fully restores DDD aggregate patterns and improves write performance.

### Task 0.4: DI Cradle Proxy Mode & Auto-Loading

- **Objective:** Shrink `container.ts` from 544 lines to under 50 lines.
- **Action Steps:**
  1. Convert Use Case and Repository class constructors to accept a dependency cradle object (standard Awilix proxy mode).
  2. Configure Awilix to auto-load modules matching patterns (like `**/*UseCase.ts` and `**/*Controller.ts`) via `container.loadModules(...)`.
- **Impact:** Eliminates 90% of manual DI wiring boilerplate.

### Task 0.5: Move Low-Level Request Validation Details Under-the-Hood in Cucumber

- **Objective:** Elevate Gherkin features to ubiquitous business-level specifications.
- **Action Steps:**
  1. Rewrite `.feature` files in high-level ubiquitous business language. Remove HTTP verbs, API paths, and raw JSON.
  2. Move JSON structuring and Supertest requests under-the-hood into the Cucumber Step Definitions.
- **Impact:** True BDD that stakeholders can read, and highly robust test definitions that don't break on minor endpoint restructurings.

### Task 0.6: Nest Embedded Child Entities

- **Objective:** Clean up folder structure.
- **Action Steps:** Move `PlantInstances/` directory into `src/Contexts/Agro/Beds/domain/entities/` (or nest it clearly as a child entity) to accurately reflect its status as an embedded property of the `Bed` aggregate root.
