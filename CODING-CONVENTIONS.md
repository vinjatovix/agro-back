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
- Single-entity lookups in application code MUST go through `ensureFound()` (or an aggregate loader built on it); see ARCHITECTURE.md › Existence Invariants

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
| utility    | `diffObjects.ts` |
| mapper     | `bedMapper.ts`   |
| type/class | `DiffResult.ts`  |

No `snake_case` is used in this project.

---

### Classes & Types

Use **PascalCase**

```ts
class CreatePlant {}
type PlantId = string;
```

### Auto-Wiring & Component Naming Conventions by Role

Every container-resolved class follows strict auto-wiring rules scanned by Awilix (in PROXY mode) as documented in [docs/spec/modules/api-layer.md §12](docs/spec/modules/api-layer.md#12-dependency-injection--auto-wiring).

#### Scanned Locations, Roles & Lifetime Rules

| Role                  | Location                                                              | Class rule                  | Registration name         | Lifetime               |
| :-------------------- | :-------------------------------------------------------------------- | :-------------------------- | :------------------------ | :--------------------- |
| `useCase`             | `Contexts/**/application/useCases/`                                   | PascalCase, no role suffix¹ | camelCase                 | per request (`SCOPED`) |
| `controller`          | `apps/agroApi/controllers/**/`                                        | `…Controller`               | camelCase                 | per request (`SCOPED`) |
| `repository`          | `Contexts/**/infrastructure/persistence/**/` (not `Contexts/shared/`) | `Mongo…Repository`          | drop `Mongo`, camelCase   | process (`SINGLETON`)  |
| `queryMapper`         | same as `repository`                                                  | `…QueryMapper`              | camelCase                 | process (`SINGLETON`)  |
| `adapter`             | `Contexts/shared/plugins/`                                            | `…Adapter`                  | drop `Adapter`, camelCase | process (`SINGLETON`)  |
| `environmentArranger` | `shared/infrastructure/persistence/**/…EnvironmentArranger.*`         | `Mongo…EnvironmentArranger` | drop `Mongo`, camelCase   | process (`SINGLETON`)  |

¹ Prohibited role suffixes in use-case folders: `Controller`, `Repository`, `QueryMapper`, `Adapter`, `EnvironmentArranger`. A class ending in one of them inside `application/useCases/` is misplaced and fails container wiring.

#### Port-Name Derivation Rule

Only two affixes are ever stripped when computing registration names:

- The `Mongo` prefix is dropped: `MongoBedRepository` → `bedRepository`, `MongoEnvironmentArranger` → `environmentArranger`.
- The `Adapter` suffix is dropped: `EncrypterAdapter` → `encrypter`, `GoogleIdTokenVerifierAdapter` → `googleIdTokenVerifier`.

If an implementation's name does not yield its port name this way, rename the class to match.

Write acronyms as regular words in scanned class names (`HttpAdapter`, not `HTTPAdapter`): only the first letter is lowercased, so `HTTPAdapter` would register as `hTTP` instead of `http`.

#### File Scanning Conventions

- **PascalCase files only**: The scanner only inspects files whose filename starts with an uppercase letter (`^[A-Z]`). Helper files in camelCase are ignored.
- **Single component per file**: Each scanned file MUST export exactly one primary component class matching the PascalCase file name.
- **Ignored paths**: `index.*`, `requestSchemas.*`, `*.test.*`, `*.d.ts`, `**/interfaces/**`, and `**/types/**` are never scanned.

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

### Container-Resolved Component Shape & Dependencies Types

Every container-resolved class MUST accept a single object parameter destructured in its constructor, typed by an exported `<ClassName>Dependencies` type:

```ts
export type CreateBedDependencies = {
  bedRepository: BedRepository; // key = registration name in cradle, type = port/interface
};

export class CreateBed {
  private readonly bedRepository: BedRepository;

  constructor({ bedRepository }: CreateBedDependencies) {
    this.bedRepository = bedRepository;
  }
}
```

#### Exact Rules for `<ClassName>Dependencies` Types

1. **Type Name**: MUST be exported and named exactly `<ClassName>Dependencies`.
2. **Property Keys**: MUST match the exact camelCase registration name in `ContainerCradle` (e.g., `bedRepository`, `plantQueryMapper`, `encrypter`).
3. **Property Values**: MUST be typed using the port / abstraction interface (e.g. `BedRepository`, `PlantRepository`, `EncrypterTool`), never concrete infrastructure classes unless no interface exists.
4. **Destructuring**: MUST destructure all dependencies directly in the constructor parameter `{ dep1, dep2 }: <ClassName>Dependencies`.
5. **No Positional Parameters**: Positional constructor arguments are strictly prohibited for container components.
6. **Lifetime Boundary**: Singletons (`process` lifetime) MUST NOT depend on scoped (`per-request` lifetime) components.
7. **Cradle Synchronization**: Every newly registered component must be declared in `src/apps/agroApi/wiring/ContainerCradle.ts`.

#### Common Errors and How to Avoid Them

##### 1. Class or File Naming Typos

- **Problematic Pattern**:
  ```ts
  // File: createBed.ts (lowercase filename)
  export class CreateBedXX {} // Typo in class name
  ```
- **Consequence**: Files starting with lowercase are ignored by the Awilix scanner. Classes not matching role rules throw `ContainerWiringError.unrecognizedClass` at startup, or mismatch `ContainerCradle.ts`, failing the container wiring test.
- **Fix**: Name the file and class identically in PascalCase (e.g. `CreateBed.ts` and `export class CreateBed`), follow the role naming convention, and declare it in `ContainerCradle.ts`.

##### 2. Property Name Mismatch in Dependencies (Awilix Proxy Resolution)

- **Problematic Pattern**:
  ```ts
  // ❌ Fails at runtime
  export type CreateBedDependencies = {
    repository: BedRepository; // Should be 'bedRepository'
  };

  export class CreateBed {
    constructor({ repository }: CreateBedDependencies) {
      // repository is undefined at runtime!
    }
  }
  ```
- **Consequence**: Awilix PROXY mode resolves dependencies by looking up the exact property name on the container cradle. Since `repository` does not exist (it is registered as `bedRepository`), it injects `undefined` and fails when called.
- **Fix**: Ensure property names in `<ClassName>Dependencies` exactly match the cradle registration name:
  ```ts
  // ✅ Correct
  export type CreateBedDependencies = {
    bedRepository: BedRepository;
  };

  export class CreateBed {
    private readonly bedRepository: BedRepository;

    constructor({ bedRepository }: CreateBedDependencies) {
      this.bedRepository = bedRepository;
    }
  }
  ```

##### 3. Lifetime Violations (Singleton depending on Scoped)

- **Problematic Pattern**:
  ```ts
  // ❌ Fails container lifetime verification
  export type MongoBedRepositoryDependencies = {
    db: Db;
    bedPersistenceMapper: BedPersistenceMapper;
    createBed: CreateBed; // Scoped component inside Singleton!
  };
  ```
- **Consequence**: A `SINGLETON` lives for the entire application process. Capturing a `SCOPED` (per-request) component leaks request state across requests and violates Awilix strict lifetime checks.
- **Fix**: Repositories, adapters, and environment arrangers (`SINGLETON`) may only depend on other singletons or explicit process-wide instances (`db`, `logger`, `DBClient`).

##### 4. Positional Constructor Parameters

- **Problematic Pattern**:
  ```ts
  // ❌ Fails with Awilix PROXY mode
  export class CreateBed {
    constructor(private bedRepository: BedRepository) {}
  }
  ```
- **Consequence**: Awilix passes a single proxy object representing the cradle. With positional parameters, `bedRepository` receives the entire cradle proxy, and subsequent parameters receive `undefined`.
- **Fix**: Always use single-parameter object destructuring: `constructor({ bedRepository }: CreateBedDependencies)`.

##### 5. Non-Exported Dependencies Type

- **Problematic Pattern**:
  ```ts
  // ❌ Type is private to the file
  type CreateBedDependencies = { bedRepository: BedRepository };
  ```
- **Consequence**: Unit tests and factory helpers cannot reference the dependencies type to construct clean mocks.
- **Fix**: Always prefix with `export`: `export type CreateBedDependencies = { ... };`.

##### 6. Missing Declaration in `ContainerCradle.ts`

- **Consequence**: `tests/apps/agroApi/container.test.ts` statically compares the AST properties of `ContainerCradle` against runtime scanned registrations. If a component is created but omitted from `ContainerCradle`, tests fail immediately.
- **Fix**: Whenever a new component is added, add its camelCase name and type to `ContainerCradle.ts`.

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
