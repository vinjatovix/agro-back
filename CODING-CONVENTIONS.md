# Coding Conventions

This document defines the coding conventions used in this project.
These guidelines aim to ensure **consistency, readability, and maintainability** across the codebase.

They are aligned with the **current architecture, tooling, and real usage patterns** of the project.

---

## Table of Contents

1. [TypeScript Style Guide](#typescript-style-guide)
2. [Project Architecture](#project-architecture)
3. [Error Handling](#error-handling)
4. [Naming Conventions](#naming-conventions)
5. [Managing Dependencies](#managing-dependencies)
6. [Testing Guidelines](#testing-guidelines)
7. [Formatting & Linting](#formatting--linting)
8. [Documentation Style](#documentation-style)

---

## TypeScript Style Guide

To maintain consistency, this project uses:

- **ESLint** for code quality and rules enforcement
- **Prettier** for formatting

### Style guide reference

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

---

### Formatting rules

Formatting is handled entirely by **Prettier**.

- No manual formatting is expected
- Run:

```bash
npm run format
```

Prettier configuration is defined in the project and enforced through ESLint.

---

### Code-quality rules

ESLint enforces:

- No unused variables
- Proper async handling
- Type-aware linting

Example:

```ts
const result = await service.run(); // must be awaited or handled
```

---

### Type safety

This project enforces **strict typing**.

#### Key principles

- Avoid implicit types in public APIs
- Prefer explicit types in:
  - Use cases
  - Controllers
  - External integrations

#### `any` usage

`any` is **not allowed**.

- Use `unknown` when type is not known
- Narrow types explicitly

```ts
function parse(input: unknown): string {
  if (typeof input !== 'string') {
    throw createError.badRequest('Invalid input');
  }

  return input;
}
```

---

## Project Architecture

The project follows a **DDD-inspired (lightweight) structure**:

```text
Contexts/
  domain/
  application/
  infrastructure/

apps/agroApi/
  controllers/
  routes/
  middlewares/
```

### Responsibilities

- **Domain**
  - Business rules
  - Entities, value objects
  - No external dependencies

- **Application**
  - Use cases
  - Orchestrates domain logic

- **Infrastructure**
  - Database, external services

- **Controllers**
  - HTTP layer only
  - Input/output mapping

---

### Architectural rules

- Domain must not depend on infrastructure
- Controllers must not contain business logic
- Use cases must not depend on Express

---

## Error Handling

This project uses a **centralized and typed error system** based on `HttpError`.

### Base error structure

```ts
class HttpError extends Error {
  statusCode: number;
  message: string;
  errors?: Record<string, string>;
}
```

### Key characteristics

- Every error includes:
  - HTTP status code
  - message
  - optional field-level errors

- Errors are **typed and explicit**, not generic

---

### Error types

Predefined errors include:

- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `BadRequestError`
- `ConflictError`

These map directly to HTTP semantics via `http-status`.

---

### Error factory

The `createError` helper provides a consistent way to create errors:

```ts
throw createError.badRequest('Invalid input', {
  email: 'Invalid format'
});
```

---

### Validation errors

Validation errors follow a structured format:

```ts
{
  message: 'Validation error',
  errors: {
    field: 'description'
  }
}
```

---

### Error handling flow

1. Errors are thrown in domain/application layers
2. Controllers do not catch them (unless needed)
3. Global `errorHandler` middleware:
   - maps errors to HTTP responses
   - logs unexpected errors

---

### Guidelines

- Do not throw raw `Error` in application/domain
- Do not return error objects manually from controllers
- Always use typed errors

---

## Naming Conventions

Naming follows **standard JavaScript/TypeScript practices**, aligned with the current codebase.

### Files

Use **camelCase or PascalCase depending on the content**:

| Type       | Example          |
| ---------- | ---------------- |
| utility    | `applyPatch.ts`  |
| mapper     | `bedMapper.ts`   |
| type/class | `DeepPartial.ts` |

No `snake_case` is used in this project.

---

### Classes & Types

Use **PascalCase**

```ts
class CreatePlant {}
type PlantId = string;
```

---

### Variables & Functions

Use **camelCase**

```ts
const createPlant = () => {};
```

---

### Constants

Use **UPPER_CASE**

```ts
const MAX_RETRIES = 3;
```

---

## Managing Dependencies

Dependencies are split into:

- `dependencies` → runtime
- `devDependencies` → development/testing

### Dependencies Guidelines

- Do not include dev tools in production dependencies
- Always commit `package-lock.json`
- Prefer minimal dependencies

---

## Testing Guidelines

The project includes:

- **Unit tests** → domain & use cases
- **Feature tests** → API (Cucumber)
- **Contract validation** → OpenAPI

---

### Principles

- Unit tests must be fast and isolated
- Do not use real DB in unit tests
- Mock infrastructure dependencies

---

### Commands

```bash
npm run test:unit
npm run test:features
npm run test
```

---

## Formatting & Linting

### ESLint

```bash
npm run lint
npm run lint:fix
```

### Prettier

```bash
npm run format
```

---

### Workflow integration

- Pre-commit:
  - lint:fix
  - format

- Pre-push:
  - lint
  - test:unit
  - check-circular

---

## Documentation Style

Use **Markdown** following GitHub standards.

Recommended resource:

- [https://guides.github.com/features/mastering-markdown/](https://guides.github.com/features/mastering-markdown/)

---

### General guidelines

- Keep documentation concise but clear
- Prefer examples over long explanations
- Keep README focused on usage, not implementation details

---

## Final note

These conventions are meant to:

- Guide development
- Reduce friction in collaboration
- Keep the codebase consistent over time

They should evolve with the project when necessary.
