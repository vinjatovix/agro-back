# Feature Specification: Create Domain Exception and Purge HTTP Error from Domain

**Feature Branch**: `001-domain-exceptions`

**Created**: 2026-08-23

**Status**: Completed

**Input**: User description: "CREATE DOMAIN EXCEPTION AND PURGE HTTP ERROR FROM DOMAIN WHY: The domain layer currently imports `HttpError`, violating hexagonal architecture by coupling core business logic to Express. WHAT: 1. Define a base `DomainException` class and concrete domain-specific exceptions. 2. Replace all references to `HttpError` (e.g. `badRequest`, `unauthorized`) in Value Objects and Aggregates with these pure exceptions. 3. Enhance the global exception handler middleware to map `DomainException` subclasses to appropriate HTTP status codes (4xx/5xx)."

## Clarifications

### Session 2026-08-23

- Q: Should the base `DomainException` class support a structured dictionary of field-specific error details, similar to the existing `HttpError` class? → A: Yes, include an optional `errors?: Record<string, string>` field on the base `DomainException` to carry key-value error details.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Value Object constraint validation throws pure domain exceptions (Priority: P1)

When a domain Value Object is instantiated with invalid arguments (e.g., negative harvest yield, out-of-bounds bed spacing, or malformed email format), it throws a pure domain-level `InvalidArgumentException`. The application's HTTP adaptation layer intercepts this exception and translates it into a standard `400 Bad Request` HTTP error response.

**Why this priority**: This is the most critical flow as it guarantees data integrity at the domain boundary without letting any Express-coupled errors leak into core business logic.

**Independent Test**: Can be tested by directly instantiating a Value Object (e.g., `HarvestYield.create(-10)`) in isolation. The instantiation must throw an `InvalidArgumentException` directly, without requiring any HTTP middleware or Express server runtime.

**Acceptance Scenarios**:

1. **Given** an invalid harvest yield value of `-5`, **When** the `HarvestYield.create` factory method is called, **Then** the system throws an `InvalidArgumentException` with the message "Yield must be > 0".
2. **Given** an invalid UUID value of `invalid-id-format`, **When** the `Uuid` constructor is invoked, **Then** the system throws an `InvalidArgumentException` with the message "<Uuid> does not allow the value <invalid-id-format>".

---

### User Story 2 - Aggregate business rule enforcement throws pure domain exceptions (Priority: P2)

When an aggregate root or entity (e.g., `Bed` or `PlantInstance`) encounters a business rule violation during a state mutation (such as attempting to add a plant to a deleted bed, or deleting a bed that still contains active plants), it throws a `DomainConflictException`. The HTTP layer captures this exception and returns an HTTP `400 Bad Request` or `409 Conflict` status code with a descriptive JSON error payload.

**Why this priority**: Crucial for enforcing business workflow consistency rules inside domain aggregates while remaining completely decoupled from Express.

**Independent Test**: Verified by instantiating a `Bed` aggregate with active plants and calling its `markAsDeleted` method. It must throw a `DomainConflictException` in a unit test environment.

**Acceptance Scenarios**:

1. **Given** a `Bed` aggregate that is already marked as deleted, **When** `addPlant` is invoked on it, **Then** the system throws a `DomainConflictException` with the message "Cannot add a plant to a deleted bed".
2. **Given** a `Bed` aggregate containing active plant instances, **When** `markAsDeleted` is called, **Then** the system throws a `DomainConflictException` with the message "Cannot delete a bed that has plants".

---

### User Story 3 - API Gateway gracefully translates domain exceptions to standard HTTP responses (Priority: P3)

The global exception handler middleware intercepts any unhandled `DomainException` bubbling up from the application services or domain layer and translates it into the corresponding HTTP status code and consistent error response format (`ApiErrorResponse`), ensuring zero breaking changes for API clients.

**Why this priority**: Ensures perfect backward compatibility with existing frontend applications and clients of the HTTP API while structural refactoring is happening.

**Independent Test**: Can be tested by invoking the end-to-end Cucumber feature tests. A feature test simulating an invalid action must receive the exact same HTTP response payload and status code as it did prior to the refactoring.

**Acceptance Scenarios**:

1. **Given** an API request is sent to create a bed with an invalid UUID parameter, **When** the request reaches the Express route, **Then** the request fails, the error handler maps the resulting `InvalidArgumentException` to HTTP `400 Bad Request`, and returns a JSON payload containing the error message.

---

### Edge Cases

- **Mismatched or Unmapped Domain Exceptions**:
  - If a new subclass of `DomainException` is defined in the future but not explicitly mapped in the global exception handler, the middleware MUST log an error and fallback to mapping it to a standard `500 Internal Server Error` to prevent leaking internal details while maintaining robustness.
- **Errors Occurring Outside HTTP Context**:
  - If a `DomainException` is thrown inside a background runner, seed script, or migration (which does not run within an Express request/response cycle), the exception must bubble up normally and print to standard error without crashing the server or attempting to map to HTTP status codes.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST define an abstract base class `DomainException` extending the standard JavaScript `Error` class under `src/Contexts/shared/domain/errors/`. It MUST support an optional `errors?: Record<string, string>` dictionary to carry granular, field-specific error messages.
- **FR-002**: System MUST define the following concrete subclasses of `DomainException`:
  - `InvalidArgumentException` (for validation errors, equivalent to HTTP 400)
  - `DomainNotFoundException` (for missing aggregates/entities, equivalent to HTTP 404)
  - `DomainConflictException` (for state conflicts and business rule violations, equivalent to HTTP 409)
  - `DomainUnauthorizedException` (for security/authentication failures, equivalent to HTTP 401)
- **FR-003**: All Value Objects residing under domain directories (e.g., `src/Contexts/Agro/Events/domain/value-objects/`, `src/Contexts/shared/domain/valueObject/`) MUST throw `InvalidArgumentException` instead of invoking `createError.badRequest`.
- **FR-004**: All Aggregates, Entities, and Domain Services residing under domain directories (e.g., `Bed.ts`, `PlantInstance.ts`, `Family.ts`) MUST throw `DomainConflictException` or `InvalidArgumentException` instead of utilizing `createError.*` helpers.
- **FR-005**: The global error handling middleware in the API layer (`src/apps/agroApi/middlewares/errorHandler.ts`) MUST be enhanced to inspect if the thrown error is an instance of `DomainException`.
- **FR-006**: The exception handler MUST perform precise mapping of `DomainException` subclasses to standard HTTP status codes:
  - `InvalidArgumentException` -> `400 Bad Request`
  - `DomainNotFoundException` -> `404 Not Found`
  - `DomainConflictException` -> `409 Conflict` (or `400 Bad Request` where backward compatibility dictates)
  - `DomainUnauthorizedException` -> `401 Unauthorized`
- **FR-007**: The JSON response body for translated `DomainException`s MUST strictly adhere to the `ApiErrorResponse` contract (message and optional validation field details), avoiding breaking changes.

### Key Entities _(include if feature involves data)_

- **DomainException**: Abstract base exception representing any core domain-level error or business policy violation. Supports an optional `errors?: Record<string, string>` dictionary for field-specific details.
- **InvalidArgumentException**: Represents an error when a domain value object or entity property fails structural or value checks.
- **DomainConflictException**: Represents an error when a domain aggregate fails business rules governing state mutations or relationships.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of domain-layer source files (Value Objects, Entities, Aggregates, and Domain Services) in `src/Contexts/` are completely free of imports referencing `src/shared/errors/index.ts` or `HttpError`.
- **SC-002**: All unit tests (`tests/Contexts/**/*.test.ts`) and feature tests (`tests/apps/agroApi/**/*.feature`) execute and pass successfully.
- **SC-003**: API response formats (HTTP status codes and JSON error schemas) for validation and business policy failures remain 100% identical to the pre-refactoring behavior.
- **SC-004**: Decoupling the domain layer introduces zero performance or latency overhead to Express request handling (verified to execute mapping in less than 1ms).

## Assumptions

- We assume that application-layer use cases (e.g., `CreateBed.ts`) can either continue to throw `HttpError` or can also be migrated to throw domain exceptions since they do not represent pure domain rules; however, removing HttpError from pure Value Objects and Aggregates is the strict, mandatory boundary.
- We assume that the existing test framework utilizes Jest's `.rejects.toThrow()` or `.rejects.toEqual()` checks, and any test referencing `HttpError` for domain objects will be updated to assert the corresponding `DomainException`.
