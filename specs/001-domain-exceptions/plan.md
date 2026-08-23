# Implementation Plan: Create Domain Exception and Purge HTTP Error from Domain

**Branch**: `001-domain-exceptions` | **Date**: 2026-08-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-domain-exceptions/spec.md`

## Summary

The objective of this feature is to purge direct and indirect dependencies on `HttpError` and `createError` from the core Domain layer (Value Objects, Entities, Aggregates, and Domain Services) in `src/Contexts/`. This aligns with Lightweight Hexagonal Architecture by keeping the domain layer completely pure and independent of Express/HTTP mechanics. To achieve this, we will introduce a pure, technology-agnostic `DomainException` hierarchy under `src/Contexts/shared/domain/errors/` and update the Express API's global exception handler middleware to gracefully intercept and map these exceptions to their respective HTTP status codes, maintaining backward-compatible responses.

## Technical Context

**Language/Version**: TypeScript (Node.js 22.x)

**Primary Dependencies**: Express, Awilix (for DI), http-status, Jest, Cucumber

**Storage**: MongoDB (Mongoose/native drivers)

**Testing**: Jest (for Unit Tests), Cucumber (for BDD feature tests)

**Target Platform**: Node.js runtime environment

**Project Type**: Web service / API layer

**Performance Goals**: Latency budgets of <150ms for write operations and <100ms for read operations. Exception translation overhead MUST be negligible (<1ms).

**Constraints**: Strict typing (no `any`), ~90%+ test coverage, Lightweight Hexagonal layer boundary protection.

**Scale/Scope**: Core domain layer refactoring covering `src/Contexts/Agro/` and `src/Contexts/Auth/`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Hexagonal Architecture (Rule I)**: **PASS**. This feature explicitly enforces Rule I by completely decoupling the Domain layer from Express-coupled HTTP errors.
- **Manual Instantiation / DI (Rule I)**: **PASS**. The new exceptions do not involve DI wiring; they are standard JavaScript/TypeScript error objects thrown natively and mapped in the infrastructure layer.
- **Continuous Validation & Test Coverage (Rule II)**: **PASS**. We will maintain the overall test coverage threshold. Unit and feature tests will be updated to expect the new pure exceptions.
- **Declarative Input Validation / Uniform API (Rule III)**: **PASS**. The uniform error response structure (`ApiErrorResponse`) is fully preserved; the mapping translates domain exception data structures cleanly to the HTTP responses.
- **Strict Typing (Code Quality standard)**: **PASS**. All exception classes, mapping structures, and handler modifications will use strict TypeScript typing with zero `any` keywords.

## Project Structure

### Documentation (this feature)

```text
specs/001-domain-exceptions/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Exceptions hierarchy and error details
├── quickstart.md        # Phase 1: Validation and runnable test scenarios
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
src/
├── apps/
│   └── agroApi/
│       └── middlewares/
│           └── errorHandler.ts                     # Modified: map DomainException to HTTP response
└── Contexts/
    ├── shared/
    │   └── domain/
    │       └── errors/
    │           └── DomainException.ts               # Added: base class and subclasses
    ├── Agro/
    │   ├── Beds/domain/...                         # Modified: throw DomainException
    │   ├── Events/domain/...                       # Modified: throw DomainException
    │   ├── Families/domain/...                     # Modified: throw DomainException
    │   ├── PlantInstances/domain/...               # Modified: throw DomainException
    │   └── Plants/domain/...                       # Modified: throw DomainException
    └── Auth/
        └── domain/value-objects/...                # Modified: throw DomainException
```

**Structure Decision**: The single-project project structure (Option 1) is selected. Exceptions are added to the shared domain context, and the global Express error middleware is updated in the API adapter layer.

## Complexity Tracking

_No Constitution Check violations detected. All design choices align with existing hexagonal boundaries._
