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
- **Validation vs Business Logic:** Validate transport/schema shape with Zod via `validateRequest` (modules not yet migrated still use `express-validator`). Never enforce business logic or DB checks in validation.
- **Error Handling:** Use `shared/errors/index.ts` (`createError` factory). Let errors bubble up to global `errorHandler`.
- **Contract Testing:** HTTP responses must match the OpenAPI contract (`assertResponseMatchesOpenApi` / Gherkin step).
- **Acceptance Test Setup:** In Gherkin scenarios, call the API only in the `When` step under test. Build prior state (created, updated, soft-deleted…) in `Given` steps with seeders/DB helpers (e.g. `a soft-deleted bed exists for the current user`), never with setup `PATCH`/`DELETE` requests, so scenarios don't depend on unrelated rules such as `If-Match` versions.
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

1. Run `npm run format`, `npm run lint` and `npm run typecheck` (type-checks `src/` and `tests/`; `build` only covers `src/`).
2. Run `npm run build` (validates routes and compiles TypeScript).
3. Run `npm run check-circular` to verify there are no circular dependencies.
4. Run all tests with `npm test`.
5. Review the git diff and verify no unrelated files were modified.

## Context Cleanliness & Script Execution

- **Always Use Subagents for Running Scripts:** To prevent the main context window from being cluttered with voluminous logs (such as test runs, coverage, linters, or builds), you MUST delegate all script executions (e.g., `npm test`, `npm run build`, `npm run lint`) to a specialized subagent (e.g., `generalist`).
- **Do Not Run Heavy Commands Inline:** Running test suites, full linter passes, or build processes directly in the main session generates excessive token overhead that slows down future turns. Delegate these tasks, and let the subagent return a concise summary.

## Code Navigation: graphify vs CodeGraph

**Always use one of these tools before grep or read:**

1. **graphify first** — for questions about the codebase:
   - `graphify query "<question>"` for semantic questions ("how does X work?", "what calls Y?")
   - `graphify path "<A>" "<B>"` to trace relationships between modules
   - `graphify explain "<concept>"` for architectural understanding
   - Returns a scoped subgraph, usually much smaller than raw output

2. **CodeGraph** — when graphify doesn't surface enough detail:
   - Use `codegraph_explore` to read verbatim source + exact call paths + blast radius
   - Best for debugging a specific function, understanding line-by-line logic, or seeing all callers of a symbol
   - Reach for this after graphify has oriented you

3. **Never** grep or read files directly without consulting one of these tools first.

## Do Not Do

- Do not use `any` or bypass the type system.
- Do not use `snake_case` in file names, variables, or properties.
- Do not throw raw `Error` objects (use `createError`).
- Do not modify historical database migrations or install dependencies without justification.
- Do not run IO, database queries, or have external API coupling in unit tests (use mocks).
- Do not use manual inline object creation/duplication in tests; prefer factories/seeders.
- Do not assert exact raw error strings in tests (use semantic matching or pre-defined error paths).
- Do not write `// Arrange` / `// Act` / `// Assert` comments in tests; ESLint (`no-warning-comments`) rejects them.
- **NEVER use `npx tsc`, `npx tsc --noEmit`, or any other manual compilation/checking command. ALWAYS run the scripts defined in `package.json` (e.g., `npm run build`, `npm run lint`, `npm run check`).**

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
