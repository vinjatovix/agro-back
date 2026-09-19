# Technical Research: Domain Exceptions & Decoupling

**Feature**: Create Domain Exception and Purge HTTP Error from Domain  
**Branch**: `001-domain-exceptions`  
**Status**: Resolved

---

## 1. Domain Exception Base Class Design

### Decision

Define a custom abstract base class `DomainException` extending `Error`. It supports an optional `errors?: Record<string, string>` dictionary to carry field-specific errors.

### Rationale

- Standard `Error` in JavaScript does not support key-value error structures natively, which is critical for representing composite validation failures (e.g., in forms or value objects like `Email` or `PlainPassword`).
- Adding a custom property ensures the global error handler middleware can map these field-specific details cleanly to the HTTP `ApiErrorResponse` payload without losing validation granularity.
- Capturing the stack trace via `Error.captureStackTrace` preserves debugging information.

### Alternatives Considered

- **Direct subclass of `Error` without key-value error dictionaries**: Rejected because value object validation often results in specific field errors that must be returned to API consumers. Without the `errors` dictionary, we would lose error details or have to reconstruct them awkwardly at the API layer.
- **Using a generic native `TypeError` or `RangeError`**: Rejected because they are not easily distinguished from unhandled runtime errors in the global error handler. We want to return `500 Internal Server Error` for unhandled runtime bugs, but `400 Bad Request` or `409 Conflict` for business/domain violations.

---

## 2. Directory and Placement

### Decision

Put the new exception files under `src/Contexts/shared/domain/errors/DomainException.ts`.

### Rationale

- Placing it under `src/Contexts/shared/domain/` makes it immediately accessible to all domain contexts (`Agro`, `Auth`, etc.) as well as the shared value objects (`Uuid`, `Email`, etc.) which reside in `src/Contexts/shared/domain/valueObject/`.
- This matches the lightweight hexagonal structure of the repository.

### Alternatives Considered

- **Placing in `src/shared/domain/`**: Considered, but `src/Contexts/shared/` is where existing shared domain elements like `AggregateRoot` and shared value objects (`Uuid`, `Email`) are located. Keeping domain errors in the same package as domain concepts is highly cohesive.

---

## 3. Middleware Integration Strategy

### Decision

Modify `src/apps/agroApi/middlewares/errorHandler.ts` to explicitly check `if (err instanceof DomainException)` and translate subclasses to their corresponding HTTP status codes:

- `InvalidArgumentException` -> `400 Bad Request`
- `DomainNotFoundException` -> `404 Not Found`
- `DomainConflictException` -> `409 Conflict` (or `400` where backward compatibility requires, e.g. for aggregate deletions)
- `DomainUnauthorizedException` -> `401 Unauthorized`

### Rationale

- This keeps the Express-specific status codes entirely within the infrastructure/API adapter layer.
- Ensures zero breaking changes to existing endpoints or frontend consumers.

### Alternatives Considered

- **Throwing `HttpError` directly from the domain**: Currently implemented, but explicitly rejected now as it violates hexagonal architecture by coupling domain entities to Web/Express concepts.
