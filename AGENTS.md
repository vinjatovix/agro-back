# Agent Instructions

## Project

Contract-driven REST API for agricultural asset management.

## Stack

- Node.js v22.x (asdf) & npm >= v10.1.0
- TypeScript v6.x (Strict typing, no `any`)
- MongoDB (native driver, `migrate-mongo` migrations)
- Awilix (Dependency injection)
- Jest (Unit) & Cucumber (Acceptance / Gherkin features)

## Key Conventions

- **Strict Boundaries:** No DTOs, Express, or DB imports in `Contexts/*/domain`. No persistence in Spatial.
- **Explicit Interfaces:** Always define explicit return types for use cases, controllers, mappers, and adapters.
- **PATCH Semantics:** `undefined` fields are ignored; `null` explicitly deletes/clears fields. Domain validation must occur before persistence.
- **Validation vs Business Logic:** Use `express-validator` strictly for transport/schema-shape checking. Never enforce business logic or DB checks in validation.
- **Error Handling:** Use `shared/errors/index.ts` (`createError` factory). Let errors bubble up to global `errorHandler`.
- **Contract Testing:** HTTP responses must match the OpenAPI contract (`assertResponseMatchesOpenAPI` / Gherkin step).
- **Dependency Injection:** Config in `src/apps/agroApi/container.ts`. Use constructor injection.
- **Imports Order:**
  1. **External dependencies** (from `package.json`): Node.js built-ins, then npm packages, **all alphabetical**.
  2. **Barrel imports** (from `index.ts` files): Distant/parent contexts/domains, **alphabetical**.
  3. **Direct sibling imports**: Same directory files, **alphabetical**. Prefer barrel imports for distant contexts to avoid circular dependencies.

## Before Modifying Code

1. Read the affected endpoint and its associated files.
2. Review existing unit and BDD tests (Gherkin `.feature` files).
3. Run `npm test` or specific test suite (e.g., `npm run test:unit`) to establish a baseline.

## Before Closing / Preparing a PR

1. Run `npm run format` and `npm run lint`.
2. Run `npm run build` (validates routes and compiles TypeScript).
3. Run `npm run check-circular` to verify there are no circular dependencies.
4. Run all tests with `npm test`.
5. Review the git diff and verify no unrelated files were modified.

## Context Cleanliness & Script Execution

- **Always Use Subagents for Running Scripts:** To prevent the main context window from being cluttered with voluminous logs (such as test runs, coverage, linters, or builds), you MUST delegate all script executions (e.g., `npm test`, `npm run build`, `npm run lint`) to a specialized subagent (e.g., `generalist`).
- **Do Not Run Heavy Commands Inline:** Running test suites, full linter passes, or build processes directly in the main session generates excessive token overhead that slows down future turns. Delegate these tasks, and let the subagent return a concise summary.

## Do Not Do

- Do not use `any` or bypass the type system.
- Do not use `snake_case` in file names, variables, or properties.
- Do not throw raw `Error` objects (use `createError`).
- Do not modify historical database migrations or install dependencies without justification.
- Do not run IO, database queries, or have external API coupling in unit tests (use mocks).
- Do not use manual inline object creation/duplication in tests; prefer factories/seeders.
- Do not assert exact raw error strings in tests (use semantic matching or pre-defined error paths).
- **NEVER use `npx tsc`, `npx tsc --noEmit`, or any other manual compilation/checking command. ALWAYS run the scripts defined in `package.json` (e.g., `npm run build`, `npm run lint`, `npm run check`).**
