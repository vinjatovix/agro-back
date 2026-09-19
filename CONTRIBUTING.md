# Contributing to Agro Back

This repository enforces strict engineering discipline focused on:

- Type safety (TypeScript strict mode)
- Explicit domain modeling
- OpenAPI contract enforcement
- Test-driven validation of behavior
- Reproducible builds (Docker-first execution)

---

## 1. How to Prepare a PR

Each PR must represent a **single cohesive change**.

### Before opening a PR

- `npm run build` passes
- `npm run test` passes
- `tsc` compiles with no errors
- No OpenAPI contract violations
- No circular dependency issues

### PR requirements

- Clear title using Conventional Commits
- Description of intent (what + why)
- Small, reviewable scope
- Linked issue if applicable

---

## 2. Git Standards

### Commit format

We use Conventional Commits:

```md
feat: add plant validation on bed insertion
fix: correct spatial overlap detection
refactor: simplify validateShape logic
chore: update dependencies
```

### Commit rules

- Atomic commits (one concept per commit)
- No mixed concerns in a single commit
- No "fix" without explanation
- History must be readable and traceable

---

## 3. Branching Strategy

### Main branches

- `main`
  - Production-ready state
  - Protected branch

- `develop`
  - Integration branch for ongoing work
  - Must always remain stable

### Supporting branches

- `feature/*`
- `bugfix/*`
- `hotfix/*`
- `release/*`

### Branching Rules

- Branch naming is free-form after prefix (`feature/*`, etc.)
- No external tracking system required in branch names
- Branches must be short-lived
- No direct commits to `main` or `develop`

---

## 4. Coding Standards

### TypeScript rules

- Strict mode enabled
- No `any` allowed in production code
- If something cannot be typed properly, it must be redesigned
- Prefer domain value objects over primitives
- Avoid leaking infrastructure types into domain layer

### Architecture rules

- Domain must be framework-agnostic
- Controllers must not contain business logic
- Application layer orchestrates use cases
- Factories must be used for test data creation when complexity exists
- No hidden side effects

---

## 5. Testing Strategy

### Test layers

- Unit tests → domain logic
- Integration tests → services + adapters
- Feature tests → HTTP layer (Express)

### Test Rules

- Tests must be deterministic
- No external dependencies in tests
- Factories preferred over inline object creation
- Avoid duplication in setup logic

---

## 6. OpenAPI Contract Enforcement

This system is contract-driven.

### OpenApi Rules

- OpenAPI spec defines the source of truth
- Every response must match schema at runtime
- Breaking schema = breaking change
- Validation is enforced in test pipeline

---

## 7. Build & Docker

### Build system

- TypeScript compilation is mandatory before runtime
- No runtime TypeScript execution in production

### Docker rules

- Multi-stage build required
- Production image must not include dev dependencies
- Application runs as non-root user
- Filesystem writes only in explicitly allowed locations (e.g. logs)

---

## 8. Review & Merge Policy

### Merge requirements

- All CI checks passing
- All tests passing
- No type errors
- OpenAPI contract validated
- At least one approval from required reviewers

### Merge Rules

- Merge is performed by **maintainers / codeowners or assigned reviewers**
- Author does NOT merge their own PR
- Review resolution required before merge
- No merge without CI green

---

## Design principles (important)

- Explicit over implicit
- Predictable over clever
- Domain correctness over framework convenience
- Tests as design feedback loop
- Factories over manual setup duplication
