# AgroApp - Ideas Backlog & Future Opportunities (v2.x)

> **IMPORTANT STATUS NOTE (v1.3.0 Baseline)**
> All critical architectural risks and structural bottlenecks previously identified in this document have been successfully mitigated and formalized as strict rules within the core specifications (`docs/spec/**`).
>
> This document now serves purely as an **Ideas Backlog** for post-v1.0 development. The opportunities listed below are categorized as either **[OUT OF SCOPE for v1.x]** (architectural leaps reserved for v2.x when scale demands it) or **[PRODUCT FEATURE - Backlog]** (user-facing features that can be added incrementally without altering the core architecture).

---

## 💡 Improvement and Innovation Opportunities

### 2.1 Port the Spatial Validation Engine to WebAssembly (Rust) / Local Execution `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** The `SpatialService` is specified as a purely computational layer, stateless and without direct access to persistence.
- **Opportunity:** Port this service to Rust and compile it to WebAssembly (WASM). This would allow sharing the exact same mathematical collision and spacing engine between the Node.js backend and the client application (React/KonvaJS).
- **Benefit:** The user would get instant, offline, real-time visual feedback on collisions in the browser when dragging crops, eliminating network latency.

### 2.2 Formalize a Schema Registry for Event Evolution in Phase 8 `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** With the introduction of distributed architecture using Kafka, event payloads will start to evolve.
- **Opportunity:** Natively integrate a _Schema Registry_ (Apicurio or Confluent Registry) using **Apache Avro** or **Protocol Buffers**.
- **Benefit:** Ensures backward/forward compatibility of events, preventing "poison pills" in the queue.

### 2.3 Evolution from JSON:API to tRPC or GraphQL for Complex Queries `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** JSON:API requires complex custom parsers for batch loading nested relationships (e.g., associating beds with plants, relations, and families).
- **Opportunity:** Implement **tRPC** (for closed web/mobile environments) or a **GraphQL** server coupled with the DataLoader pattern.
- **Benefit:** Accelerates load times on the frontend with native typing support and avoids N+1 query problems.

### 2.4 Integration of a Vector Database for Agro-Ecological Recommendations `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** Botanical relationships and anomaly diagnostics grow combinatorially.
- **Opportunity:** Incorporate a vector database (Qdrant, pgvector) and generate _embeddings_ of the biological technical data sheets and pest symptoms.
- **Benefit:** Enables a semantic search engine (e.g., _"I have wet brown spots and planted basil nearby, what should I apply?"_) combining symptoms, proximity, and organic recipes.

### 2.5 Geospatial Grouping (Geo-Pooling) for Weather and Reminders `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Nearby urban gardens share identical climate profiles.
- **Opportunity:** Use geospatial indexing like H3 (Uber's hexagons). By grouping farms, a single call to Open-Meteo is made for the entire block.
- **Benefit:** Drastically minimizes rate-limit risks and accelerates large-scale reminder generation.

### 2.7 Partial Event Sourcing Architecture for the Seed Bank `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Directly mutating the `remainingQuantity` stock field is a collision-prone point.
- **Opportunity:** Treat inventory as an append-only ledger of seed transactions (`StockAdjusted`, `SeedSown`).
- **Benefit:** Eliminates OCC inventory collisions and allows for a perfect audit history.

### 2.8 Typed Auto-Wiring and Static Dependency Inspection `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Dynamic auto-wiring sacrifices static safety in TypeScript.
- **Opportunity:** Implement a TypeScript schema generator script that scans Awilix modules and generates typed interfaces for the `Cradle`.
- **Benefit:** Combines the convenience of automatic registration with the unbreakable protection of static typing at compile time.

### 2.9 Incremental Hot Auto-Purge of the Outbox Collection `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Performing massive sweeps with Cron Jobs causes CPU spikes in the database.
- **Opportunity:** The Kafka worker itself performs selective asynchronous deletions in MongoDB immediately after receiving the ACK from the broker.
- **Benefit:** Keeps the `outbox` collection at a constant size close to zero.

### 2.10 "What-If" Predictive Planner using Historical Climate Records `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** The backend has access to geolocation and the seasonal optimums of the catalog.
- **Opportunity:** Integrate historical climate data (Copernicus project) to simulate scenarios: _"How would it affect my design if I sow in an unusually dry year?"_.
- **Benefit:** Elevates the platform to a high-value predictive planning tool.

### 2.11 Sister Polyculture Templates (Guilds) as Canvas "Stamps" `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** Designing biodiverse gardens by dragging plants one by one generates friction.
- **Opportunity:** Support **Ecological Guild Templates** (e.g., the "Three Sisters"). The user selects the template and the system stamps it on the canvas, applying spacing and strata rules instantly.
- **Benefit:** Facilitates real permaculture designs with a single click.

### 2.12 Predictive Decay Model for Seed Viability `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Viability calculation depends on manual tests by users.
- **Opportunity:** Analyze historical aggregated results by variety with Machine Learning to predict the viability loss curve according to climate.
- **Benefit:** Proactive alerts before seeds become non-viable.

### 2.13 Dynamic Exposure and Compilation of Zod Schemas to JSON Schema `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** The backend uses Zod to validate request bodies.
- **Opportunity:** Use `zod-to-json-schema` to expose public endpoints that return the schemas in standard JSON Schema format.
- **Benefit:** The mobile or web client can auto-generate reactive input forms, guaranteeing total synchrony in the data contract.

### 2.14 Proactive Companion Polyculture Recommender `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** The backend has a synergy graph (`PlantRelation`) and a spatial engine.
- **Opportunity:** An analytical endpoint that scans the canvas, identifies empty polygons, and proactively recommends which plants to sow there based on the graph.
- **Benefit:** Educates the user on biodiversity in a visual and guided way.

### 2.15 Climate-Edaphological Dosing based on Actual Evapotranspiration `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** The system crosses climate, soil, and ground covers.
- **Opportunity:** Calculate the daily evapotranspiration (ET) rate using the Penman-Monteith Formula to recommend the exact liters of water needed.
- **Benefit:** Prevents water stress and maximizes water efficiency with scientific rigor.

### 2.16 Predictive Alerts for Viability Loss in the Seed Batch `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** The seed bank dynamically evaluates viability.
- **Opportunity:** Regression algorithm to suggest new germination tests if the success rate drops below the expected curve.
- **Benefit:** Minimizes sowing failures in seedbeds.

### 2.17 Solar and Shadow Auto-Discovery via Physical Orientation `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** Shadow zones are statically parameterized manually.
- **Opportunity:** The user indicates the cardinal orientation (e.g., North-South) and obstructions. The system dynamically calculates the seasonal shadow mapping based on latitude (azimuth/elevation).
- **Benefit:** Automates the sectoral analysis of sun/shade, a pillar of permaculture design.

### 2.18 Event-Driven Mass Weather Forecasting (Webhooks/Batch) `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** The Reminders Engine uses Lazy Fetching (Promise Deduplication) and Redis caching by GeoHash to prevent rate-limit exhaustion. However, if background chron jobs evaluate thousands of reminders simultaneously at 08:00 AM across expired caches, it could still result in massive synchronous polling spikes to Open-Meteo.
- **Opportunity:** Implement an asynchronous bulk weather ingestion worker that runs daily during off-peak hours. It fetches forecasts for all active user GeoHashes and emits `PrecipitationForecasted` events to Kafka. The Reminders Engine would react solely to these events rather than actively polling.
- **Benefit:** Completely decouples external API rate limits from the internal task scheduling engine and guarantees predictable CPU loads.

### 2.19 Orphaned Media Garbage Collection (GCS SAGA) `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** The planned use of Presigned URLs for direct-to-GCS media uploads (`PlantResource`) delegates file transfers to the client.
- **Opportunity/Risk:** If a client requests a presigned URL, uploads the binary file, but closes the browser before dispatching the final `PATCH` to the backend to link the file, the GCS bucket will accumulate orphaned, unreferenced "garbage" files, incurring storage costs.
- **Benefit/Mitigation:** Implement a local SAGA or GCS Lifecycle Policy (e.g., auto-delete unconfirmed files after 24 hours) combined with Pub/Sub webhooks to solidify the upload transaction state, maintaining cloud storage hygiene.

### 2.20 Evolution of PlantRelations into a GraphQL Graph `[PRODUCT FEATURE - Backlog]`

- **Technical Reason:** The companion planting dataset (`PlantRelation`) is modeled as a directed graph. Exploring ecological networks (e.g., finding indirect synergistic chains: A helps B, which helps C) is extremely difficult to query and serialize using traditional REST or JSON:API.
- **Opportunity:** Expand the planned GraphQL evolution (Point 2.3) to specifically target the biological relationship network. GraphQL's native graph traversal capabilities would allow clients to dynamically query multi-level companion networks in a single request.
- **Benefit:** Empowers advanced visual tools (like network mapping UI components) in the client to seamlessly explore permaculture synergies.

### 2.21 Decoupled Database Schema Migrations Execution `[OUT OF SCOPE for v1.x]`

- **Technical Reason:** Executing complex, data-mutating migrations (e.g., backfilling `sowingMethod` to `establishment`) during the Node.js application startup phase (`app.listen`) is highly dangerous in orchestrated environments (Kubernetes/Docker Swarm).
- **Opportunity/Risk:** Multiple replicated pods starting simultaneously will attempt to run the same backfill scripts, causing database locking contention or data corruption.
- **Benefit/Mitigation:** Extract schema migration execution (`migrate-mongo`) completely out of the Express lifecycle. Migrations should be executed by isolated `init-containers` or dedicated CI/CD release jobs before the application pods are updated.
