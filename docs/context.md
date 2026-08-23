# System Context: Agro-Back

This document serves as a complete technical audit and source of truth for future iterations and development of integrations with the **Agro** backend.

---

## 1. Real Purpose of the System

**Agro-Back** is an HTTP REST API designed for agricultural crop and urban garden management and planning. Unlike generic descriptions, the system acts as:

1.  **Spatial Distribution Validator:** Strictly controls the physical dimensions of the crop beds (`beds`) and calculates, using geometric algorithms, whether a plant (`plantInstance`) can be placed at specific coordinates without interfering with the recommended planting spacing of surrounding plants.
2.  **Botanical Knowledge Catalog:** A structured query repository of reference plants (`plants`) and their botanical families (`families`), allowing users to plan based on light, watering, soil requirements, and sowing/harvesting calendars.
3.  **Crop Lifecycle Manager:** Tracks and persists the growth state (`growthStatus` and `instanceStatus`) of planted crops.

---

## 2. Modules Inventory

The system is structured under a **lightweight Hexagonal Architecture approach with Domain-Driven Design (DDD) principles**. The modules ("Bounded Contexts") are organized in `src/Contexts/`:

### A. Beds Module (`src/Contexts/Agro/Beds`)

- **Real Purpose:** Manage the physical dimensions of cultivation spaces, as well as the assignment and removal of plants within them.
- **Responsibilities:**
  - Creation, update, listing, and soft deletion of crop beds associated with a specific user.
  - Coordination of spatial plant placement by injecting the `BasicSpatialService`.
- **Internal Dependencies:** Consumes `PlantInstances` (for embedded entities) and `Plants` (to verify reference planting spacing).
- **Architectural Patterns:** **Aggregate Root** (`Bed` acts as the aggregate root containing and encapsulating the child entity `PlantInstance`).

### B. Plants Module (`src/Contexts/Agro/Plants`)

- **Real Purpose:** Catalog of botanical varieties, acting as the configuration dictionary for spacing, calendars, watering requirements, etc.
- **Responsibilities:**
  - Maintenance of the reference plants catalog (CRUD).
  - Validation of the existence of its associated botanical family before creation.
- **Internal Dependencies:** Consumes `Families` (to validate and integrate the botanical family of the plant).

### C. Families Module (`src/Contexts/Agro/Families`)

- **Real Purpose:** Taxonomically and culturally classify plants (e.g., Solanaceae, Legumes) for future grouping, crop rotation, or companion planting.
- **Responsibilities:**
  - Management of botanical family taxonomy (creation, editing, public listing).

### D. PlantInstances Module (`src/Contexts/Agro/PlantInstances`)

- **Real Purpose:** Represent a real plant sown by a user at a physical point within a crop bed.
- **Responsibilities:**
  - Define planting coordinates, growth state (`CropGrowthStatus`), lifecycle state (`PlantInstanceLifecycleStatus`), planting/removal date, and specific annotations.
- **Patterns:** Subordinate entity (Entity / Value Object) without its own repository; it is persisted embedded in the `Bed` document.

### E. Events Module (`src/Contexts/Agro/Events`)

- **Real Purpose:** Historical tracking log of individual agricultural activities of the farmer (watering, fertilization, pruning, preventive/palliative treatments, harvests, transplants). It should not be confused with system "Event Sourcing"; these are logs of user activities on their plants.
- **Evolution:** In future phases, it will serve to trigger automatic reminders and schedule recurring notifications (e.g., preventive treatments every 15 days, palliative treatments every 5 days, or seasonal pruning).
- **Current State:** Domain and persistence mappers (`EventMapper`) and entities are implemented with exhaustive unit tests, but are **temporarily inactive** (no use cases or HTTP controllers in the container).

### F. Authentication Module (`src/Contexts/Auth`)

- **Real Purpose:** Local and federated user authentication, role control (user, admin), and secure credential issuance.
- **Responsibilities:**
  - User registration, local login, JWT token refresh, password change, and email validation.
  - Verification and sign-in using Google Identity tokens (Google Sign-In).

### G. Shared Module (`src/Contexts/shared`)

- **Real Purpose:** Provide the common infrastructure base, security adapters, and generic data injection.
- **Key Components:**
  - Base Value Objects (`Uuid`, `Email`, `Metadata`, `StringValueObject`, `PositiveNumber`).
  - Persistence abstractions (`MongoRepository`, `MongoCrudRepository` with pagination, ordering, and dynamic query DSL translation, and `MongoQueryTranslator`).
  - Adapters/Plugins (`CryptAdapter` for bcrypt/JWT, `GoogleIdTokenVerifierAdapter` for Google Auth).

---

## 3. Real Technical Stack (Versions)

- **Runtime:** Node.js v22.23.2 (Configured with `"type": "module"` for native ES Modules support).
- **Language:** TypeScript v6.0.2 (Strict support).
- **HTTP Framework:** Express v4.22.1.
- **Dependency Injection (DI):** Awilix v13.0.3 and Awilix-Express v11.0.1 (Container-driven injection auto-loaded and scoped per request).
- **Database / Persistence Engine:** MongoDB v7.1.1 (Official native driver).
- **Logging & Observability:** Winston v3.19.0 + Winston-MongoDB v7.0.1.
- **Security:** Helmet v8.1.0, Cors v2.8.6, Express-Rate-Limit v8.3.2, BcryptJS v3.0.3, Google-Auth-Library v10.6.2, JSONWebToken v9.0.3.
- **Configuration:** Env-Var v7.5.0 for strict typing of environment variables.
- **Migration Control:** Migrate-Mongo v14.0.7.
- **Testing Frameworks:** Jest v30.3.0 (`ts-jest`), Cucumber v12.8.1 (BDD support), Supertest v7.2.2.

---

## 4. Detected Architectural Patterns

1.  **DDD-Inspired Hexagonal Architecture (Lightweight):**
    - `domain/`: Contains pure business logic (entities, value objects, repository contracts). Independent of frameworks and infrastructure.
    - `application/`: Use cases that orchestrate domain calls. Do not interact directly with Express.
    - `infrastructure/`: External adapters such as the MongoDB repository or encryption adapters.
2.  **Aggregate Roots:**
    - `Bed` is the aggregate root that encapsulates the lifecycle of `PlantInstance`. There is no separate database collection or repository for individual plants; they are always operated on and saved through the bed aggregate.
3.  **Dependency Injection (DI) Container:**
    - Awilix resolves all cabling at runtime (registered in `src/apps/agroApi/container.ts`). Prevents direct coupling between classes.
4.  **Contract-First / Declarative Validation:**
    - Request validation using `express-validator` schemas derived from the official OpenAPI contract (`openapi.yaml`). Responses are assertively validated in integration tests against the OpenAPI spec.
5.  **Audit Diff Checking:**
    - In update operations (e.g., `UpdateFamily`, `UpdateBed`), the current state is read, a utility patch is applied (`applyPatch`), a diff is performed to audit changes, and it is persisted with the acting user's metadata using `updateWithDiff`.
6.  **Rich Domain Value Objects:**
    - Value Objects such as `Email` or `Uuid` are responsible for validating their own business rules and invariants in the constructor. It is impossible to create an invalid instance of a Value Object.

---

## 5. Entry Points

The system exposes only **HTTP REST API** entry points:

- **Main Server:** `src/index.ts` initializes HTTP listening and process error catchers (`uncaughtException`, `unhandledRejection`).
- **Dynamic Routes (`src/apps/agroApi/routes/registerRoutes.ts`):** A glob scans at runtime all files matching `**/*.routes.{ts,js}` and registers endpoints in Express via **Awilix-Express Invokers** linked to the controllers' `run` methods.

### Detailed Endpoints

1.  **Auth (`/api/v1/Auth`):** `POST /register`, `POST /login`, `POST /google`, `GET /validate/:token`, `POST /refresh`, `POST /update`.
2.  **Beds (`/api/v1/beds`):** `POST /` (Create), `GET /` (List current user), `GET /:id` (Detail), `PATCH /:id` (Modify), `DELETE /:id` (Delete).
3.  **Families (`/api/v1/families`):** `POST /` (Admin), `GET /:slug` (Public), `GET /` (Public), `PATCH /:id` (Admin).
4.  **Plants (`/api/v1/plants`):** `POST /` (Admin), `GET /` (Public/Optional Auth), `GET /:id` (Public/Optional Auth), `PATCH /:id` (Admin), `DELETE /:id` (Admin).
5.  **Health (`/api/v1/Health`):** `GET /` (Healthcheck).
6.  **Errors (`/api/v1/error`):** `GET /` (Provoke a controlled error).

---

## 6. Data Model (MongoDB)

The system operates with MongoDB and structures information into the following collections:

### Collection: `users`

Stores user credentials and profiles.

- `_id`: MongoDB ObjectId (Stringified or Binary).
- `email`: String (Indexed, unique).
- `username`: String (Indexed, unique).
- `password`: String (Hashed via bcrypt, null if federated).
- `emailValidated`: Boolean.
- `authMethods`: Array of sub-documents (contains provider, e.g., `local`, `google`, and the date created/used).
- `roles`: Array of Strings (e.g., `['user']`, `['admin']`).
- `metadata`: Audit object (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`).

### Collection: `beds`

Stores physical cultivation beds and their instanced plants.

- `_id`: MongoDB ObjectId.
- `userId`: MongoDB ObjectId (Foreign key pointing to `users`).
- `name`: String.
- `width`: Number (Positive value).
- `height`: Number (Positive value).
- `depth`: Number (Positive value).
- `plantInstances`: Array of sub-documents representing each plant:
  - `id`: String (UUIDv4).
  - `userId`: String (UUIDv4 of the owner).
  - `plantId`: String (UUIDv4 pointing to a document in `plants`).
  - `position`: Object `{ x: Number, y: Number }`.
  - `growthStatus`: String (Enum: `germinating`, `seedling`, `vegetative`, `flowering`, `fruiting`, `harvesting`, `dormant`, `dead`).
  - `instanceStatus`: String (Enum: `active`, `removed`).
  - `plantedAt`: ISODate.
  - `removedAt`: ISODate (Optional).
  - `variety`: String (Optional).
  - `notes`: String (Optional).
- `metadata`: Audit object.
- `deleted`: Boolean (Logical deletion flag).
- `deletedAt`: ISODate (Optional).

### Collection: `families`

Botanical families classification.

- `_id`: MongoDB ObjectId.
- `slug`: String (Indexed, unique).
- `name`: String.
- `aliases`: Array of Strings.
- `scientificName`: String.
- `shortDescription`: String.
- `highlights`: Array of Strings.
- `extra`: Dynamic JSON object with additional properties.
- `metadata`: Audit object.

### Collection: `plants`

Base configuration of cultivable plants.

- `_id`: MongoDB ObjectId.
- `identity`: Object containing `{ name: String, scientificName: String, family: String (ID of family) }`.
- `status`: String (e.g., `active`).
- `lifespan`: String.
- `traits`: Object with spacing, depth, watering, light, and soil requirements.
- `calendar`: Sowing and harvesting calendar.
- `propagation`: Propagation methods.
- `metadata`: Audit object.

### Collection: `changelog`

Automatically generated by `migrate-mongo` for database version control.

---

## 7. External Dependencies

1.  **MongoDB Server:** The main database engine, configured locally in Docker via `docker-compose.yml` and instantiated with scripts to restore database dumps from remote environments.
2.  **Google OAuth2 API:** Federated integration with Google to verify identities via id_tokens provided by frontend clients.

---

## 8. Observed Coding Conventions

- **Strict Typing:** The use of `any` is not allowed. `unknown` is used and types are narrowed explicitly.
- **File and Symbol Conventions:**
  - Classes and Types: **PascalCase** (`Bed`, `User`).
  - Methods, Functions, Variables: **camelCase** (`createBed`, `applyPatch`).
  - Files: camelCase for utilities/mappers, PascalCase if the file primarily exports a class/type (`Bed.ts`).
  - Constants: **UPPER_CASE** with underscores (`MAX_RETRIES`).
- **Typed Error Handling:** Generic JS errors are not thrown in application/domain layers. The `createError` factory is used to throw specific errors (`createError.badRequest`, `createError.notFound`, `createError.conflict`, etc.) that extend `HttpError` and provide semantic HTTP statuses.

---

## 9. Test Coverage per Module (Approximate)

The test suite of this project is exceptionally robust, with an estimated global coverage of **~90%+**:

- **Unit Tests (`tests/Contexts/**/\*.test.ts`):** 78 independent test files. Unit-test all use cases (`CreatePlant.test.ts`, `UpdateBed.test.ts`, `LoginUserLocal.test.ts`), domain entities, value objects, and infrastructure query translators.
- **BDD Feature Tests (`tests/apps/agroApi/features/**/\*.feature`):** 21 functional specifications written in Gherkin (Cucumber). Runs against Express with a real Docker database container. Validates end-to-end integration, route security, rate-limiting quotas, and verifies that HTTP REST API responses strictly comply with `openapi.yaml` definitions.

---

## 10. Technical Debt and Danger Zones

1.  **Modules Awaiting Integration:**
    - **Events Module (`Events`):** Its business logic and mapping are ready, awaiting integration into the container and API layer in future phases.
    - **`addPlantToBed` Use Case:** Implemented in the application layer, but without an associated HTTP controller. Its deployment is planned for the start of the beds design phase.
2.  **Lack of Local Database Migrations:**
    - The `migrate-mongo` engine is configured, but the `migrations/1.0.0/` folder does not contain physical TS/JS migration files. This will be resolved by adopting the use of formal migrations.
3.  **Lack of Direct Unit Tests on Controllers:**
    - Express controllers delegated in Awilix lack Jest `.test.ts` files. This is mitigated by the exhaustive Cucumber BDD tests (`.feature`), but introduces a potential gap for Express exceptional logic.
4.  **Bypass of Google Auth Configuration in CI:**
    - In CI/CD pipelines, `GOOGLE_CLIENT_ID` is a placeholder, requiring strict environment injection in production.

---

## 11. Design Decisions and Evolution Plan

Based on the technical audit and strategic clarification with the team, the following design decisions are established to guide continuous development:

1.  **Events Module Approach:**
    - The `Events` module will be developed as a **historical log of the farmer's actions** on the garden (when they fertilized, when they pruned, treatments performed).
    - Its primary purpose is to **feed the periodic reminders and alerts engine** (e.g., recurring preventive treatments every 15 days, palliative treatments every 5 days, or seasonal pruning).
    - It **does not** act as a system event store (Event Sourcing) that alters or recreates the logical state of the beds.
2.  **Beds Design and Instantiation Deployment:**
    - The `addPlantToBed` use case and its respective HTTP API will be formally integrated in the **next evolutionary phase**.
    - Once the plant catalog is consolidated (current phase finalized), the next iteration will address the visual design and spatial instantiation of plants inside crop beds using this use case.
3.  **Persistence and Migration Strategy:**
    - The **Formal Migrations** rule is adopted.
    - All creations of collections, indexes, or structural transformations in MongoDB will be versioned and deployed via physical scripts controlled under the `migrations/` folder structure and executed using `migrate-mongo` during the deployment and startup lifecycle of the API.
