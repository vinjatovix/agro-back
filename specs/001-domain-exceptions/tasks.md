# Tasks: Create Domain Exception and Purge HTTP Error from Domain

**Input**: Design documents from `/specs/001-domain-exceptions/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: Tests are included under each user story and the Polish phase to maintain the codebase's ~90%+ test coverage standard.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Identify all files under `src/Contexts/` currently importing `createError` from `src/shared/errors/index.ts` to coordinate the full migration
- [x] T002 Create the exceptions directory at `src/Contexts/shared/domain/errors/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core exception base class and factory that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create the base domain exception class and subclasses under `src/Contexts/shared/domain/errors/DomainException.ts`
- [x] T004 [REMOVED] Establish direct instantiation syntax instead of factory pattern to align with YAGNI/ISP

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Value Object constraint validation throws pure domain exceptions (Priority: P1) 🎯 MVP

**Goal**: Transition all core and domain-specific Value Objects to throw `InvalidArgumentException` directly, completely removing direct or indirect Express dependencies from value object validations.

**Independent Test**: Directly instantiate a value object (e.g. `HarvestYield.create(-10)`) in isolation and verify it throws `InvalidArgumentException`.

### Tests for User Story 1

- [x] T005 [P] [US1] Update shared value object unit tests under `tests/shared/domain/` to expect `InvalidArgumentException` instead of `HttpError`
- [x] T006 [P] [US1] Update domain-specific value object unit tests under `tests/Contexts/Agro/` and `tests/Contexts/Auth/` to assert `InvalidArgumentException` on invalid instantiation

### Implementation for User Story 1

- [x] T007 [P] [US1] Migrate shared value objects (Uuid, Email, PositiveNumber, StringValueObject, DateValueObject) under `src/Contexts/shared/domain/valueObject/` and shared domain Value Objects (`MonthSet.ts`, `Range.ts`) under `src/shared/domain/value-objects/` to throw `InvalidArgumentException` instead of `createError.badRequest`
- [x] T008 [P] [US1] Migrate domain-specific value objects (HarvestYield, WateringAmount, PlantSowing, PasswordHash, PlainPassword, UserAuthMethod, UserRoles) under `src/Contexts/Agro/` and `src/Contexts/Auth/` to throw `InvalidArgumentException`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Aggregate business rule enforcement throws pure domain exceptions (Priority: P2)

**Goal**: Transition aggregate roots and entities to throw `DomainConflictException` or `InvalidArgumentException` directly, freeing business rule enforcement from HTTP coupling.

**Independent Test**: Instantiate an aggregate (e.g. `Bed` with plants) and invoke state mutation methods (e.g. `markAsDeleted()`) to verify it throws `DomainConflictException`.

### Tests for User Story 2

- [x] T009 [P] [US2] Update aggregate and entity unit tests under `tests/Contexts/Agro/` to expect `DomainConflictException` or `InvalidArgumentException` on business rule violations

### Implementation for User Story 2

- [x] T010 [P] [US2] Migrate the `Bed` aggregate root under `src/Contexts/Agro/Beds/domain/entities/Bed.ts` to throw `DomainConflictException` or `InvalidArgumentException` directly
- [x] T011 [P] [US2] Migrate other domain entities (`Family.ts`, `PlantInstance.ts`, `Plant.ts`) under `src/Contexts/Agro/` to throw appropriate pure exceptions directly

**Checkpoint**: User Stories 1 AND 2 are both fully functional and independently testable.

---

## Phase 5: User Story 3 - API Gateway gracefully translates domain exceptions to standard HTTP responses (Priority: P3)

**Goal**: Update the global exception handler middleware to intercept `DomainException` subclasses and map them cleanly to standard HTTP status codes, returning a uniform JSON schema and avoiding breaking changes for frontend consumers.

**Independent Test**: Run the Cucumber BDD integration feature suite to verify that invalid client actions result in the correct HTTP response codes and structures.

### Tests for User Story 3

- [x] T012 [US3] Ensure Cucumber BDD integration tests under `tests/apps/agroApi/features/` verify that all expected validation and conflict payloads return HTTP 400 or HTTP 409

### Implementation for User Story 3

- [x] T013 [US3] Modify the global error handler middleware under `src/apps/agroApi/middlewares/errorHandler.ts` to intercept `DomainException` and translate subclasses to status codes: `InvalidArgumentException` -> 400, `DomainConflictException` -> 409 (or 400 where backward compatibility requires), `DomainNotFoundException` -> 404, `DomainUnauthorizedException` -> 401
- [x] T014 [US3] Update application-layer use cases (e.g. CreateBed.ts, DeleteBed.ts, CreateFamily.ts, CreatePlant.ts, DeletePlant.ts, GetPlant.ts, UpdatePlant.ts, etc.) under src/Contexts/ to correctly propagate or map domain exceptions as they coordinate aggregate transactions
- [x] T015 [US3] Ensure error response payloads strictly match the `ApiErrorResponse` interface (message and optional key-value error detail details) inside `src/apps/agroApi/middlewares/errorHandler.ts`

**Checkpoint**: All user stories are fully integrated, translating pure domain rules into uniform API responses.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, security, and documentation updates across all modified modules

- [x] T016 [P] Audit all files under `src/Contexts/**/domain/` and `src/shared/domain/` to verify zero imports of `src/shared/errors/index.ts` or `HttpError` remain (Note: `GenericQueryParser` is postponed to Iteration 1.1)
- [x] T017 Update documentation or architecture guides under `docs/` or `README.md` to describe the pure domain exceptions model
- [x] T018 Run the complete Jest unit test suite (`npm run test:unit`) to confirm 100% pass rate
- [x] T019 Run the complete Cucumber feature integration suite (`npm run test:features`) to confirm zero API regressions
- [x] T020 Run the linter and type-checker (`npm run lint && tsc --noEmit`) to verify strict typing and coding standards compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all subsequent user stories.
- **User Stories (Phases 3+)**: All depend on Foundational phase completion. User Story 1 (P1) is the MVP and must be completed and validated first. User Story 2 (P2) and User Story 3 (P3) can run in parallel once Foundation is ready.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Parallel Opportunities

- Setup tasks `T001` and `T002` can run in parallel.
- Once Phase 2 is complete, US1 test updates (`T005`, `T006`) and value object migrations (`T007`, `T008`) can run in parallel.
- Once US1 is complete, US2 aggregate migrations (`T010`, `T011`) can run in parallel.
- Static audit checks `T016` can run in parallel with polish tasks.

---

## Parallel Example: User Story 1

```bash
# Launch parallel value object updates:
Task: "Migrate shared value objects in src/Contexts/shared/domain/valueObject/Uuid.ts, etc."
Task: "Migrate domain value objects in src/Contexts/Agro/Events/domain/value-objects/HarvestYield.ts, etc."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).
3. Complete Phase 3: User Story 1 (Value Objects).
4. **STOP and VALIDATE**: Run unit tests on migrated value objects to ensure they throw `InvalidArgumentException`.
5. Integrate with User Story 3 (Express Error Handler) to verify 400 Bad Request mapping is functional end-to-end.

---

## Notes

- `[P]` tasks = separate files with no execution-order dependencies.
- `[Story]` labels map every user story task back to its specifications for full traceablity.
- Ensure all tests are run and passing before transitioning between checkpoints.
