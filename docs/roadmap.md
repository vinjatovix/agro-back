# Roadmap: Intelligent Ecological and Permaculture Garden Management System (Agro-Back)

This document defines the technical evolution roadmap for the AgroApp backend. It is broken down into realistic, self-contained, and highly atomic iterations oriented toward providing constant incremental value under Domain-Driven Design (DDD) and Hexagonal Architecture principles.

_This roadmap prioritizes public knowledge stabilization, architectural health, and identity robustness before introducing spatial or temporal complexity._

---

## Final Goal (Reformulated)

The system will be a robust, deployable backend based strictly on Hexagonal Architecture and Domain-Driven Design (DDD), providing ecological farmers with:

1.  **Ecological Encyclopedia (Knowledge Base):** A unified, public reference catalog of botanical data with ecological properties and a static relationship graph modeling beneficial/harmful companion planting.
2.  **Companion Engine (Relationship Graph):** A diagnostic engine linking crop anomalies (pests, pathogens, disorders, weeds) to organic garden inputs and treatments (preventive and curative).
3.  **Robust Private Area:** A secure private area with verified local authentication (via real email tokens) and stateless multi-provider OAuth integration (Google & GitHub).
4.  **Bed Design with Spatial Validation:** A physical bed designer with 2D coordinates validating physical constraints (spatial collision) and biological compatibility (neighboring relationship warnings).
5.  **Historical Log & Reminders:** A chronological agricultural log capable of passively generating future maintenance reminders based on past cultivation events and treatment cycles.

---

## Phase 0: Architectural Consolidation (Zero Technical Debt)

### Iteration 1: Purge HTTP Transport Dependencies from Domain [COMPLETED]

- **Value Delivered:** Blinds the core business logic from transport details, preventing leakage of controller mechanics.
- **Definition of Done:** `HttpError` is replaced by subclasses of `DomainException` across aggregates and VOs. Global error middleware intercepts and maps these to correct HTTP status codes.
- **Dependencies:** None.
- **Risks:** High volume of files modified due to import changes.
- **Prompt for /speckit.specify:**

  ```text
  CREATE DOMAIN EXCEPTION AND PURGE HTTP ERROR FROM DOMAIN

  WHY: The domain layer currently imports `HttpError`, violating hexagonal architecture by coupling core business logic to Express.
  WHAT:
  1. Define a base `DomainException` class and concrete domain-specific exceptions.
  2. Replace all references to `HttpError` (e.g. `badRequest`, `unauthorized`) in Value Objects and Aggregates with these pure exceptions.
  3. Enhance the global exception handler middleware to map `DomainException` subclasses to appropriate HTTP status codes (4xx/5xx).
  ```

#### Known Technical Debt from Iteration 1 (To be resolved in subsequent iterations)

During the review of Iteration 1, several non-blocking architectural inconsistencies, documentation drifts, and potential logical risks were identified as technical debt:

1. **Outdated Module Specifications:**
   - `docs/spec/modules/family.md` lists the entire persistence layer and API endpoints of the Families module as "Missing" under Section 7, even though they are fully implemented and integrated.
   - `docs/spec/modules/knowledge.md` marks "Knowledge System" entities (Pest, Disease, Remedy, Fertilizer) as "stable", but they do not exist as domain classes in the production codebase (mock data only).
2. **License Link drift in README:** The reference to license details in `README.md` points to `LICENSE.md` but the physical file is named `LICENSE` without an extension.
3. **Build Script Refactoring and macOS Compatibility (`build:di`):** The package script `build:di` is poorly named; it dates back to legacy/pre-Awilix setups but is now solely responsible for copying non-TypeScript assets (like OpenAPI `.yaml` schemas) to `dist/`. In addition to the confusing name, it uses the GNU-specific `--parents` flag for `cp`, which causes compilation to fail on macOS (darwin) with a `cp: illegal option -- -` error. This should be refactored into a cross-platform, non-confusing command/script (e.g., named `build:copy-assets` using a custom Node.js script or `shx`).

### Iteration 1.1: Relocate Query System to Delivery Mechanism

- **Value Delivered:** Ensures the domain layer remains 100% agnostic of URL query string parsing rules, establishing correct Hexagonal and clean boundaries.
- **Definition of Done:** `GenericQueryParser`, `QueryParserUtils`, and context-specific query parsers (e.g., `FamilyQueryParser`, `PlantQueryParser`) are relocated from `src/shared/domain/query/` to `src/apps/agroApi/shared/query/`. Imports are updated across controllers and container registry.
- **Dependencies:** Iteration 1.
- **Risks:** Broken import paths in controllers and DI containers.
- **Prompt for /speckit.specify:**

  ```text
  RELOCATE QUERY PARSING TO THE API LAYER

  WHY: The query parser resides in the shared domain but processes raw URL query parameters and triggers transport-layer errors, violating the Clean Architecture boundary. It belongs in the delivery adapter (API).
  WHAT:
  1. Relocate generic parsing files from `src/shared/domain/query/` to `src/apps/agroApi/shared/query/`.
  2. Relocate context-specific parsers to the same shared directory or alongside their specific controllers in `src/apps/agroApi/controllers/`.
  3. Correct all import references in Express controllers, tests, and the Awilix `container.ts` configuration.
  ```

### Iteration 1.2: Standardize and DRY HTTP Request Schemas (Technical Debt)

- **Value Delivered:** Cleans up highly redundant validation logic in express-validator request schemas, preventing schema drift between creation and update rules.
- **Definition of Done:** Request schemas across all endpoints (`Family`, `Plant`, `Bed`, etc.) refactored to use a reusable dictionary of base validation rules and dynamically generate mandatory/optional fields.
- **Dependencies:** None.
- **Risks:** Medium risk of breaking request-body mapping if validation chains are incorrectly configured.
- **Prompt for /speckit.specify:**

  ```text
  STANDARDIZE AND DRY HTTP REQUEST SCHEMAS

  WHY: The HTTP request validators (using express-validator) under `@src/apps/agroApi/routes/**` are highly repetitive, manual, and verbose.
  WHAT:
  1. Define base validation rule templates/factories for each domain aggregate schema (e.g. Family, Plant, Bed) to represent common field rules (types, formats, constraints) in a single place.
  2. Dynamically derive standard Create (mandatory/optional mix) and Update (all-optional patch-safe leaves) schemas from these templates.
  3. Ensure all automated BDD cucumber tests and unit integration tests pass successfully with no regression on validation payloads.
  ```

### Iteration 2: Relocate Mongo Primitives to Shared Domain

- **Value Delivered:** Eliminates outward dependency violations, ensuring the domain layer remains agnostic of persistence models.
- **Definition of Done:** `*Primitives.ts` types moved from persistence/mongo directories to the shared domain directory. Imports updated.
- **Dependencies:** None.
- **Risks:** Low risk; purely structural type-level refactoring.
- **Prompt for /speckit.specify:**

  ```text
  RELOCATE PERSISTENCE PRIMITIVES TO SHARED DOMAIN

  WHY: Domain Value Objects import primitive types from the infrastructure MongoDB folder, violating clean architecture dependency rules.
  WHAT:
  1. Move `MetadataPrimitives.ts` and related primitive files from `src/shared/infrastructure/persistence/mongo/types/` to `src/Contexts/shared/domain/`.
  2. Update import paths in affected domain aggregates, value objects, and persistence repositories.
  ```

### Iteration 3: Awilix Dependency Injection Auto-Wiring

- **Value Delivered:** Shaves off over 500 lines of manual infrastructure wiring (boilerplate), streamlining use case and controller setup.
- **Definition of Done:** `container.ts` configured with `loadModules`. Core dependencies (controllers, use cases, repositories) are resolved via cradle/proxy mode rather than manual factories.
- **Dependencies:** None.
- **Risks:** Potential runtime dependency resolution issues if naming conventions are not strictly followed.
- **Prompt for /speckit.specify:**

  ```text
  REFACTOR AWILIX TO PROXY MODE WITH AUTOLOAD

  WHY: The current DI container is a large, manually wired file. Adding new features requires repetitive factory boilerplate.
  WHAT:
  1. Refactor class constructors to accept a single cradle object for dependency injection (Awilix proxy mode).
  2. Implement `loadModules` to auto-discover and register controllers, use cases, and repositories based on suffix conventions.
  ```

### Iteration 4: Transition to Rich Domain Aggregates (Anti-Anemic)

- **Value Delivered:** Restores DDD encapsulation, centralizing state mutation logic inside aggregate roots.
- **Definition of Done:** `applyPatch` utility removed from use cases. Mutations on `Plant` and `Family` aggregates are performed through explicit business methods (e.g., `updateInfo()`).
- **Dependencies:** Iteration 3 recommended.
- **Risks:** Risk of regression in update-validation pathways.
- **Prompt for /speckit.specify:**

  ```text
  REMOVE APPLY PATCH AND EMBED MUTATION LOGIC IN AGGREGATES

  WHY: Aggregates are currently anemic. Generic patch utilities dilute business rules across application use cases rather than enforcing invariants within the aggregate.
  WHAT:
  1. Remove the generic `applyPatch` helper from application use cases.
  2. Add explicit update methods inside the `Plant` and `Family` aggregate roots.
  3. Refactor application use cases to call these domain-level mutation methods and persist the resulting aggregates.
  ```

### Iteration 5: Structural Stabilization (BDD and Folders)

- **Value Delivered:** Elevates accepting tests to business-readable specifications and cleans up aggregate hierarchy.
- **Definition of Done:** Cucumber features rewritten in clean, technical-agnostic Gherkin (no HTTP verbs or JSON schemas). `PlantInstances` directory nested under `Beds/domain/entities`.
- **Dependencies:** None.
- **Risks:** High effort in refactoring Cucumber step definitions.
- **Prompt for /speckit.specify:**

  ```text
  CLEAN UP GHERKIN SPECS AND NEST EMBEDDED CHILD ENTITIES

  WHY: Cucumber feature files are cluttered with HTTP routing and raw JSON strings. Additionally, `PlantInstances` lives as a root context instead of a child of `Beds`.
  WHAT:
  1. Rewrite `.feature` files in high-level ubiquitous business language, moving Supertest and JSON formatting logic into the Step Definitions.
  2. Relocate the `PlantInstances/` directory under `src/Contexts/Agro/Beds/domain/entities/` to reflect its nature as an embedded child entity.
  ```

---

## Phase 1: Botanical Catalog & Social Ecosystem

### Iteration 6: Botanical Catalog Ecological Enrichment

- **Value Delivered:** Incorporates core ecological properties (toxicity, edibility, and SEO slug) into the plant dictionary.
- **Definition of Done:** `Plant` aggregate features boolean fields `edible`, `toxic`, and string `slug`. MongoDB mapping, DTOs, and seeds updated.
- **Dependencies:** Iteration 4.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  ADD ECOLOGICAL PROPERTIES TO THE PLANT AGGREGATE

  WHY: The baseline plant catalog lacks essential agricultural markers (toxicity, edibility) and human-friendly URLs (slugs).
  WHAT:
  1. Add 'edible', 'toxic', and 'slug' fields to the Plant aggregate, persistence schemas, and OpenAPI specifications.
  2. Update the persistence mappers, builders/mothers, and seed data to support these new properties.
  ```

### Iteration 7: Sowing Validation Relaxation

- **Value Delivered:** Accommodates vegetative propagation (cuttings, bulbs) by relaxing seed-specific constraints.
- **Definition of Done:** Sowing validation logic accepts empty `sowingMonths` and `seedsPerHole` if the reproductive method is non-seed.
- **Dependencies:** Iteration 6.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  RELAX SOWING VALIDATIONS FOR NON-SEED PLANTS

  WHY: The validation engine currently blocks vegetative-only plants (such as garlic or potato) by mandating seed-sowing properties.
  WHAT:
  1. Condition domain-level and route-level validations for `sowingMonths` and `seedsPerHole` based on the plant's propagation/reproduction method.
  ```

### Iteration 8: User Plant Bookmarks (Favorites)

- **Value Delivered:** Empowers farmers to bookmark specific crops for their future garden maps.
- **Definition of Done:** Independent `UserFavorites` context created. Secure POST/DELETE endpoints operational for authenticated users.
- **Dependencies:** None.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT USER PLANT FAVORITES BOOKMARKING

  WHY: Farmers need to compile personalized list of plants for future reference without bloating the core User or Plant aggregates.
  WHAT:
  1. Create a dedicated `UserFavorites` aggregate linking `userId` to a list of bookmarked `plantId`s.
  2. Expose secure POST and DELETE endpoints to manage favorites for the active authenticated user.
  ```

### Iteration 9: Botanical Companion Planting Graph

- **Value Delivered:** Establishes the core companion engine, identifying direct beneficial or harmful crop neighbors.
- **Definition of Done:** `PlantRelation` domain aggregate created. Endpoint resolves direct directional relations (beneficial, harmful, neutral) for any given `plantId`.
- **Dependencies:** None.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT COMPANION PLANTING RELATIONSHIP GRAPH

  WHY: Permaculture relies heavily on directional biological interactions (such as attracting pollinators or chemical suppression) between species.
  WHAT:
  1. Define a `PlantRelation` aggregate and repository (capturing relationship type, recommended distance, and ecological reasoning).
  2. Seed the DB with real companion relations and expose a GET endpoint to fetch direct companions for a plant.
  ```

---

## Phase 2: Ecological Knowledge & Diagnosis

### Iteration 10: Unified Anomalies Domain

- **Value Delivered:** Establishes a single diagnostic target for pests, diseases, physiological issues, and weeds.
- **Definition of Done:** `Anomaly` aggregate created. Mongo collection seeded with basic symptoms, causes, and susceptible targets. GET list/details endpoints active.
- **Dependencies:** None.
- **Risks:** Complex modeling required for diverse target types (fungi, insects, weeds).
- **Prompt for /speckit.specify:**

  ```text
  CREATE UNIFIED GARDEN ANOMALIES DOMAIN

  WHY: Unifying pests, pathogens, weeds, and physiological disorders into a single 'Anomaly' entity simplifies future diagnostics.
  WHAT:
  1. Implement the `Anomaly` aggregate containing classification (pest, pathogen, disorder, weed), causes, symptoms, and susceptible plant species.
  2. Expose paginated list and detailed GET endpoints for anomalies, seeded with reference data.
  ```

### Iteration 11: Organic Garden Inputs Domain

- **Value Delivered:** Manages ecological treatments, repellents, and organic fertilizers.
- **Definition of Done:** `GardenInput` aggregate created and endpoints operational. Seeded with organic preparations.
- **Dependencies:** None.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  CREATE ORGANIC GARDEN INPUTS DOMAIN

  WHY: Farmers need an catalog of organic materials (insecticides, repellents, composts) and instructions on how to prepare them.
  WHAT:
  1. Create a `GardenInput` aggregate specifying input type, preparation instructions, and safety warnings.
  2. Expose paginated and detailed GET endpoints for garden inputs.
  ```

### Iteration 12: Therapeutic Mapping (Anomalies <-> Inputs)

- **Value Delivered:** Guides farmers on exactly how to treat or prevent specific anomalies.
- **Definition of Done:** Associative schema linking `Anomaly` to `GardenInput` with context (preventive, curative, both), dosage, and tutorial video links.
- **Dependencies:** Iteration 10, Iteration 11.
- **Risks:** Complex querying of cross-relations in MongoDB.
- **Prompt for /speckit.specify:**

  ```text
  MAP ORGANIC TREATMENTS TO GARDEN ANOMALIES

  WHY: The core educational value of the catalog lies in matching specific garden problems (anomalies) to appropriate organic remedies.
  WHAT:
  1. Create an association mapping between `Anomaly` and `GardenInput` indicating treatment context (preventive/curative/both) and recommended dosage.
  2. Expose the GET `/api/v1/anomalies/:id/treatments` endpoint, incorporating video tutorial links.
  ```

---

## Phase 3: Identity & Verification

### Iteration 13: Core Mailer Infrastructure (Port & Adapter)

- **Value Delivered:** Enables the application to send real emails under a decoupled architecture.
- **Definition of Done:** `MailerTool` port defined. `ResendAdapter` implemented and verified using mock testing.
- **Dependencies:** None.
- **Risks:** API key configuration and credential safety.
- **Prompt for /speckit.specify:**

  ```text
  CREATE MAILER PORT AND RESEND ADAPTER

  WHY: Account verification requires dispatching real tokens. The mail delivery system must be decoupled behind a port for reliability and testing.
  WHAT:
  1. Define a generic `MailerTool` interface in the shared plugins folder.
  2. Implement a production-ready `ResendAdapter` and a mock/fake implementation for unit and acceptance testing.
  ```

### Iteration 14: Local Account Activation Flow

- **Value Delivered:** Prevents spam and ensures user authenticity via email token validation.
- **Definition of Done:** Registration dispatches email using `MailerTool`. New activation endpoint validates token to enable accounts.
- **Dependencies:** Iteration 13.
- **Risks:** Secure generation, expiration, and storage of tokens.
- **Prompt for /speckit.specify:**

  ```text
  INTEGRAR ACCOUNT ACTIVATION VIA EMAIL TOKENS

  WHY: Local user accounts must be verified through real email addresses to avoid bot spam.
  WHAT:
  1. Update the registration use case to generate a secure activation token and send it via `MailerTool`.
  2. Create a `/auth/activate` endpoint to verify the token and mark the user profile as active/enabled.
  ```

### Iteration 15: Stateless Multi-Provider OAuth

- **Value Delivered:** Lower friction registration/login via external Google and GitHub accounts.
- **Definition of Done:** Endpoint validates external OAuth credentials against provider APIs, issues a local JWT, and merges profiles if emails match.
- **Dependencies:** None.
- **Risks:** Trusting external identity providers without local password compromise.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT STATELESS GOOGLE AND GITHUB OAUTH LOGIN

  WHY: Users expect single-click sign-on using Google and GitHub. The backend must securely validate tokens and issue JWTs.
  WHAT:
  1. Implement stateless token verification adapters for Google (ID Token validation) and GitHub (User Profile API validation).
  2. Expose authentication endpoints `/auth/google` and `/auth/github`.
  3. Support account linking if the verified email matches an existing local user.
  ```

---

## Phase 4: Spatial Bed Design

### Iteration 16: 2D Spatial Placement of Crop Instances

- **Value Delivered:** Allows farmers to place and save plants at precise coordinate points inside a garden bed.
- **Definition of Done:** `PlantInstance` holds a `Coordinates` (X, Y) object. Endpoints for adding crops with physical constraints (bed boundary limits) are fully functional.
- **Dependencies:** None.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT 2D CROP PLACEMENT WITHIN BED COORDINATES

  WHY: Designing a permaculture garden requires placing specific plant instances at precise coordinate offsets within physical beds.
  WHAT:
  1. Integrate a `Coordinates` Value Object (representing X and Y in centimeters) into the `PlantInstance` aggregate.
  2. Expose a secure endpoint to place a plant instance, validating that coordinates fall within the boundaries of the associated `Bed`.
  ```

### Iteration 17: Spatial Collision Detection Engine

- **Value Delivered:** Warns or blocks users from overlapping crops physically.
- **Definition of Done:** Domain Spatial Service checks surrounding circular spaces. Overlays reject the request with `SpatialCollisionException`.
- **Dependencies:** Iteration 16.
- **Risks:** Floating-point precision issues in circle-intersection algebra.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT SPATIAL COLLISION VALIDATION FOR PLACED CROPS

  WHY: Plants placed too closely will struggle or die. The system must prevent overlapping physical areas within the same bed.
  WHAT:
  1. Create a `BasicSpatialService` in the domain layer to retrieve the mature planting radius of both the incoming and existing crops.
  2. Compute Euclidean distances and block the placement, throwing a `SpatialCollisionException` if areas overlap.
  ```

### Iteration 18: In-Bed Companionship Analysis

- **Value Delivered:** Real-time feedback alerts if the user places biological "enemies" next to each other.
- **Definition of Done:** Bed detail query evaluates distances against `PlantRelation`. Output features an `ecologicalReport` listing proximity alerts.
- **Dependencies:** Iteration 9, Iteration 16.
- **Risks:** Inefficient N\*N distance calculation on beds containing a large volume of plant instances.
- **Prompt for /speckit.specify:**

  ```text
  GENERATE BIOLOGICAL COMPATIBILITY RECS FOR PLACED PLANTS

  WHY: Farmers need spatial-ecological insights to know if neighboring plants are actively helping or harming each other.
  WHAT:
  1. Extend the GET `Bed` details response to include an on-the-fly `ecologicalReport`.
  2. Evaluate distances between all instances in the bed: if different crops sit within their mutual influence radius, look up relationships and output warnings or synergies.
  ```

---

## Phase 5: Chronological Logging & Reminders

### Iteration 19: Chronological Garden Event Logs

- **Value Delivered:** Acts as an active cultivation journal, recording watering, pruning, and harvesting.
- **Definition of Done:** `Event` domain active and mapped to MongoDB. Endpoints for logging and filtering events by crop instance and time are fully operational.
- **Dependencies:** Iteration 16.
- **Risks:** None.
- **Prompt for /speckit.specify:**

  ```text
  ACTIVATE CULTIVATION EVENTS LOGGING JOURNAL

  WHY: Success in permaculture relies on logging exactly when tasks (watering, biological treatments, pruning, harvests) occurred.
  WHAT:
  1. Fully connect the `Event` aggregate to its MongoDB repository, linking occurrences to `plantInstanceId`.
  2. Expose secure endpoints to create cultivation events and query historical logs with date-range filters.
  ```

### Iteration 20: Passive Reminders Engine

- **Value Delivered:** Relieves mental load by dynamically showing tasks that are due soon.
- **Definition of Done:** GET `/reminders` dynamically maps the history of events against suggested treatment schedules and sowing intervals, rendering recommendations.
- **Dependencies:** Iteration 12, Iteration 19.
- **Risks:** Rule computation complexity over time.
- **Prompt for /speckit.specify:**

  ```text
  IMPLEMENT PASSIVE SUGGESTED REMINDERS ENGINE

  WHY: The platform should proactively guide farmers on recurring care by reviewing recent events against recommended input reapplication schedules.
  WHAT:
  1. Create a domain service that inspects the history of applied `GardenInput` events on crops.
  2. Expose a secure GET `/api/v1/reminders` endpoint that dynamically generates pending care actions (without persisting them) on-the-fly.
  ```
