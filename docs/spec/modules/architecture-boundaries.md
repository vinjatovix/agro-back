# MODULE: ARCHITECTURE BOUNDARIES

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

Defines strict separation rules across AgroApp architecture layers.

---

## 2. CORE RULES

- Domain has no IO
- Spatial has no persistence
- API has no domain leakage
- Events are append-only

---

## 3. QUERY SYSTEM BOUNDARY

The Query System is a cross-layer concern and MUST respect strict separation:

- Query DSL definitions are **structural only**
- Query DSL MUST NOT contain business logic
- Query validation belongs to Validation layer
- Query translation belongs exclusively to Persistence layer
- Domain MUST NOT interpret query semantics

### Strict rule

Query objects are treated as:

> data transport structures, not domain concepts

---

## 4. ENFORCEMENT RULES

- no DTO in domain
- no repository in spatial
- no express in domain (specifically, `HttpError` and `createError` are strictly forbidden inside domain Value Objects, Entities, and Domain Services)
- no business logic inside API layer
- no business logic inside persistence layer
- domain-level business rule and validation violations MUST only throw pure `DomainException`s, decoupled from transport status codes.
- **Privacy Eradication Boundary `[TARGET STATE]`**: The system MUST NEVER retain orphaned user data for machine learning or analytics when an account is deleted. Account deletion MUST trigger a hard-delete cascade across all bounded contexts (Beds, Events, Reminders, etc.) erasing all trace of the user's agricultural activity to comply with GDPR's Right to be Forgotten.

---

### 4.1 JWT & AUTH SESSION STATE BOUNDARY `[TARGET STATE (Pending Iterations 24, 25 & 28)]`

- The API session state (specifically, the JWT payload) MUST NOT carry any business-oriented or operational properties (e.g., `postalCode`, `country`, `latitude`, `longitude`, `hemisphere`, or favorite crop `user_bookmarks`).
- The JWT payload is strictly restricted to user identity and authenticated roles (`id`, `email`, `username`, `roles: string[]`, `iat`, `exp`). _(For the exact serialization structure of the JWT payload, refer strictly to Section 4 of **Module: Authentication & Identity (auth.md)**)_
- **`[TARGET STATE (Pending Iterations 24, 25 & 28)]`** Any usecase or domain calculation requiring geographical context, hemisphere-specific calendar shifts, or favorites lists MUST fetch them dynamically from persistence or the infrastructure cache using the validated `userId`. This ensures complete decouple-by-design, prevents stale configuration bugs, and keeps the HTTP header footprint lightweight.

---

### 4.2 SPATIAL COMPUTATION BOUNDARY `[TARGET STATE (Pending Phase 5)]`

- **Pure Computation Rule:** The `SpatialService` is an advanced calculation engine. It **MUST NOT** execute database transactions, call repositories, or perform state mutations on other domains (like the `SeedBank`).
- **No Side-Effects:** Real-time spatial layout validations (`POST /layout/validate`) are 100% read-only and have zero side-effects on inventory, reminders, or user metrics.
- **De-coupled Historical Loading:** The spatial engine is prohibited from loading its own data dependencies. Any timeline audits (such as retrieving the past 36 months of bed cultivation for rotation heuristics) must be pre-loaded by the calling Use Case as a flat projection (`HistoricalCropSummary`) and passed into the service as passive context, preserving clean layers.

---

## 5. SHARED UTILITIES BOUNDARY

Shared utilities MUST follow strict purity rules:

- MUST be stateless
- MUST be side-effect free
- MUST NOT access persistence
- MUST NOT access domain services
- MUST NOT encode business rules

Examples of allowed behavior:

- string parsing
- object checks
- transformation helpers

---

## 6. VALIDATION BOUNDARY CLARIFICATION

- Validation layer is responsible for:
  - input shape validation
  - query structure validation
  - DTO structure validation

- Validation layer MUST NOT:
  - enforce business rules
  - interpret domain meaning
  - perform persistence checks

---

## 7. PERSISTENCE BOUNDARY CLARIFICATION

- Persistence layer:
  - translates query DSL → Mongo queries
  - applies patches
  - maps DTOs via mappers

- Persistence MUST NOT:
  - validate input correctness
  - enforce domain rules
  - interpret query intent beyond translation

---

## 7.1 CQRS READ-ONLY BYPASS ALLOWANCE (GET QUERIES) `[TARGET STATE (Pending Iteration 18)]`

- To optimize system performance (CPU and memory), pure read-only operations (such as GET lists, search endpoints, and paginated listings) **are officially permitted to bypass full rich Domain aggregate hydration**.
- The API layer / Persistence layer can directly project MongoDB query results into plain DTOs or primitives without instantiating domain Entities, Value Objects, or executing constructor validations.
- **Schema Validation Safety Net**: To mitigate the risk of projecting malformed or corrupted persistent data when bypassing aggregate construction, output validation schemas (Zod) in the API layer MUST strictly validate the response DTO contract shape. This ensures data integrity at the system boundary with minimal overhead.
- This bypass is strictly forbidden for write/mutation operations (POST, PATCH, DELETE), where full Domain aggregate lifecycle validation remains mandatory to enforce business invariants.

_(Note: For complete details on repository implementation and data projection rules, see **Module: Persistence (persistence.md) Sec. 5.8.8**)_

---

## 7.2 TELEMETRY AND BUSINESS EVENTS BOUNDARY `[TARGET STATE (Pending Iterations 48 & 43)]`

To prevent architectural erosion and ensure optimal performance, strict rules are established for the usage of the Kafka cluster:

1.  **Strict Topic Isolation:**
    - Business events (Domain Events) travel exclusively through the `agro.domain.events` topic.
    - Technical system logs (Telemetry) travel exclusively through the `agro.app.logs` topic.
2.  **Prohibition of Cross-Topic Consumption:**
    - No business service or use case (e.g., `RemindersEngine`) is allowed to consume or react to the `agro.app.logs` topic to drive operational decisions.
    - No log visualization service or ingestion agent (e.g., Vector, Loki, Grafana) is allowed to inject data or alter the state of transactional MongoDB collections through technical Kafka events.
3.  **Asymmetric Fault Handling (Fail-Handling vs Fail-Safe):**
    - **Domain Events (Fail-Safe):** Prioritizes data consistency and integrity over immediate throughput. If the Kafka cluster is down, transactional writes are protected in the local MongoDB `outbox` collection until Kafka recovers. No messages are discarded.
    - **Telemetry Logs (Fail-Silent):** Prioritizes HTTP server stability and low API latency over observability metrics. If the Kafka cluster is down, the Winston log transport silently discards asynchronous logs or fallback-redirects them to the standard console standard out stream to prevent RAM saturation (Out-Of-Memory) of the Node.js application, failing gracefully.

---

## 8. GOAL

Prevent architectural erosion by enforcing strict separation between:

- domain logic
- transport layer
- persistence layer
- validation layer
- query system
- shared utilities

---

## 9. FINAL STATEMENT

Any violation of these boundaries is considered an architectural regression and MUST be corrected before feature completion.
