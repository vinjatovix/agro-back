# MODULE: DISTRIBUTED EVENT BUS (KAFKA)

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE `[TARGET STATE (Pending Iterations 47, 48 & 50)]`

Defines the event-driven integration layer of AgroApp.

It specifies how modules publish and consume asynchronous **Domain Events** to trigger cross-module workflows (such as updating or dismissing scheduled Reminders when plants are removed or watered) in a decoupled, resilient, and chronological manner.

This module is strictly isolated from **Agricultural Events** (`events.md`), which represent the user-logged horticultural log journal.

---

## 2. PORT & ADAPTERS

To keep the application and domain layers free of infrastructure dependencies, all event-driven messaging is designed around the Port and Adapter pattern:

### 2.1 Event Bus Port (`EventBus`)

A technology-agnostic interface defined in the application layer:

- `publish(events: DomainEvent[]): Promise<void>`
- `subscribe(eventType: string, handler: EventHandler): void`

### 2.2 InMemory Adapter (`InMemoryEventBusAdapter`)

- A lightweight, synchronous, in-process implementation.
- Designed for local developer builds, fast unit tests, and Cucumber ATDD step scenarios without external broker dependencies.

### 2.3 Kafka Adapter (`KafkaEventBusAdapter`)

- A production-ready adapter utilizing `kafkajs` to stream messages to Apache Kafka.
- Enforces high-performance distributed streaming, transactional publishing, and retry capabilities.

---

## 3. RESILIENCE & DATA INTEGRITY PATTERNS

### 3.1 Transactional Outbox Pattern with Change Streams & Fallback Polling `[CRITICAL SECURITY RULE] [TARGET STATE (Pending Iteration 46)]`

To guarantee that "ghost events" are never published to Kafka (e.g., publishing a message for an operation that eventually rolled back or failed in MongoDB), the system enforces the **Transactional Outbox** pattern:

1.  **Atomic Write:** Within a MongoDB multi-document transaction (using `ClientSession`), the application use case persists the target domain aggregate and, in the same transaction, writes an event representation document into a temporary `outbox` collection.
    - **ID Architecture & Sequencing `[TARGET STATE]`:** By enforcing the system-wide generation of **UUIDv7** for all domain events (which embed a 48-bit unix timestamp in their prefix), the domain's native `eventId` inherently provides absolute chronological sequencing. This eliminates the need for database-specific technical fields like MongoDB's `ObjectId` to track insertion order.
2.  **Asynchronous Tailer (Change Streams) & Singleton Worker `[TARGET STATE]`:** An independent background worker tails the MongoDB oplog via a **Change Stream listener** (filtering solely on insert operations in the `outbox` collection). It reads unpublished events in exact replication order and dispatches them to Kafka. To prevent massive event duplication during horizontal scaling of the API, this tailer MUST be entirely decoupled from the main HTTP API (Express) and deployed as a standalone **Singleton Worker** (configured to run exactly 1 active replica).
3.  **Fallback Polling Mechanism `[TARGET STATE]` (Oplog Rotation Resilience):** If the tailer process crashes or is taken offline for an extended period, the MongoDB Oplog may rotate and overwrite older entries, invalidating the Change Stream's `resume token`. If the tailer throws an `InvalidResumeToken` error upon startup:
    - It MUST automatically switch to **Fallback Polling mode**.
    - It executes a standard query to retrieve stranded messages: `db.outbox.find({ processedAt: null }).sort({ _id: 1 })`. _(Note: Because `_id` maps directly to the domain's `eventId` encoded as a UUIDv7, sorting by `_id` guarantees perfect chronological sequencing without relying on external clocks or technical fields)._
    - Once the backlog is cleared, the worker establishes a fresh Change Stream starting from the current database time.
4.  **Confirmation & Cleanup Routine:** Once Kafka confirms the secure storage of the message (broker acknowledgment), the publisher marks the event as processed (e.g., setting `processedAt` timestamp) in the `outbox` collection, guaranteeing **at-least-once** delivery. To prevent the `outbox` collection from growing infinitely, a fallback cleanup routine MUST be enforced:
    - **Fail-Safe Cron Job Sweep (CRITICAL):** Under no circumstances should native age-based MongoDB TTL indexes be used on the raw collection age, as a Kafka or Change Stream outage exceeding the TTL would permanently prune unprocessed events. Instead, a scheduled task (Cron Job / Worker) MUST sweep the collection periodically, executing a safe delete operation strictly constrained to successfully dispatched events: `deleteMany({ processedAt: { $ne: null }, createdAt: { $lt: SEVEN_DAYS_AGO } })`.
    - A secondary alert monitoring rule triggers alerts in Grafana if any un-dispatched event stays in the outbox longer than a critical SLA window (e.g., 1 hour).

---

### 3.2 Dynamic Partitioning & Message Ordering (Dual Design) `[TARGET STATE (Pending Iteration 49)]`

To prevent race conditions across parallel consumers (such as processing a "watering" event before a "transplant" event for the same crop), messages must be processed in strict chronological order. This is guaranteed by dynamic partition routing based on event scope:

- **Topic Name:** `agro.domain.events`
- **Dynamic Partition Key Rules (Dual Design):**
  - **Instance-Scoped Events:** If the event targets an individual crop instance, the partition key MUST be **`plantInstanceId` (UUID)**. This forces all events throughout that plant's lifetime (including nurseries and transplants) to fall on the exact same physical partition, ensuring sequential processing and long-term biological traceability.
  - **Bed-Scoped Events:** If the event targets a bed container as a whole (e.g., bed-wide soil fertilization), the partition key MUST be **`bedId` (UUID)**, guaranteeing sequence on soil operations.
- **Chronological Re-ordering / Agronomic Triviality:** Because bed-scoped and instance-scoped events travel through separate partitions, they can arrive slightly out-of-order at the milliseconds level. However, this is agronomically trivial (e.g., processing a bed watering milliseconds before or after an instance pruning does not violate any critical domain invariants). Consumers requiring a unified, combined chronological timeline of both scopes MUST merge the streams and rely on the internal message `occurredAt` timestamp.

---

### 3.3 Strict Consumer Idempotence (Duplicate Protection)

Because the Outbox publisher guarantees _at-least-once_ delivery, network failures or consumer crashes will eventually cause duplicate messages to be processed.

- **Rule:** Every event consumer (e.g., `Reminders Handler`) MUST be strictly idempotent.
- **Mechanism:** Consumers must verify if the incoming event's `id` (UUID) has already been processed by checking a lightweight processed-events store (e.g., a MongoDB `processed_events` collection or a Redis cache) before executing any state modifications.
- **Idempotence TTL Rule:** To prevent infinite database bloat, the processed event registry MUST enforce a Time-To-Live (TTL) index or eviction policy. The expiration window (e.g., 7 to 15 days) MUST be strictly greater than or equal to the maximum retention configuration of the source Kafka topic, guaranteeing that replay windows are fully covered without carrying legacy keys forever.

---

### 3.4 Non-Blocking Multi-Topic Consumer Retry Flow `[TARGET STATE (Pending Iteration 51)]`

To prevent a transient failure (e.g., MongoDB unreachable or external API timeout) from blocking healthy messages in the same partition (Head-of-Line blocking), a dedicated non-blocking retry flow is established:

```
[ agro.domain.events (Main Topic) ] ── (Failure) ──► [ retry.5s ] ── (Seek / Wait)
                                                        │
                                                     (Failure)
                                                        ▼
[ agro.domain.events.dlq (DLQ) ] ◄─── (Failure) ─── [ retry.30s ]
```

1.  **Main Partition Offset Release:** On failure, the consumer captures the exception, publishes the message to `agro.domain.events.retry.5s` (incrementing a retry counter in Kafka headers), and immediately commits the offset on the main topic.
2.  **Progressive Retry Topics:** The system defines specific topics for progressive backoff levels:
    - `agro.domain.events.retry.5s`
    - `agro.domain.events.retry.30s`
    - `agro.domain.events.retry.5m`
3.  **Delay Consumer Scheduling:** Consumers of retry topics inspect the message timestamp in headers and pause fetching or wait until the progressive delay has elapsed, ensuring healthy partitions are never blocked.
4.  **Dead Letter Queue (DLQ) & Manual Replay (No Data Drift):** If a message fails after exceeding the maximum retry limit (e.g., 3 attempts), it is classified as a "poison pill" and redirected to `agro.domain.events.dlq` with failure metadata in headers. This triggers critical alerts in Grafana.
    - **Replay Protocol:** To prevent permanent data drift (e.g., a seed inventory deduction that never executed, or a reminder that never cleared), the platform MUST include an administrative **Replay Tool** (CLI script or internal admin endpoint). Once engineers resolve the underlying outage, this tool re-injects the DLQ messages back into the main `agro.domain.events` topic.
    - **Safety:** Because all consumers are strictly mandated to be idempotent (see Section 3.3), this replay operation is 100% safe and will not cause duplicate state mutations if a consumer partially succeeded before failing.

---

### 3.5 Message Schema Versioning & Registry Strategy

Every message published to the Event Bus is wrapped in a structured envelope to support safe contract evolution:

```json
{
  "id": "string (UUID)",
  "version": "string (e.g., '1.0')",
  "type": "string (Event Type Name)",
  "occurredAt": "string (ISODate)",
  "payload": {
    "//...": "Type-safe, version-specific payload"
  }
}
```

- **Evolution beyond Envelope Versioning:** While the `"version"` field inside the JSON envelope serves as a fast-routing metadata parameter, the production target state mandates the integration of an official **Schema Registry** (e.g., Confluent Schema Registry or Apicurio Registry) enforcing schemas via **JSON Schema**, **Apache Avro**, or **Protocol Buffers**.
- **Compatibility Constraints:** The Schema Registry MUST enforce either `BACKWARD` or `FULL` compatibility rules at the broker level to prevent "poison pill" payloads from crashing downstream consumer systems.

---

### 3.6 BedLayoutSaved Consolidated Event Integration (KonvaJS Side-Effects) `[TARGET STATE (Pending Iteration 69)]`

To prevent event flooding and redundant processing during rapid UI design changes on the interactive canvas, layout mutations are consolidated into a single atomic transactional commit that publishes exactly one overarching event to Kafka:

- **Event Type:** `BedLayoutSaved`
- **Topic:** `agro.domain.events`
- **Partition Key:** `bedId` (UUID) - Enforces sequential execution of all actions on the same physical bed.
- **Payload Structure:**
  ```json
  {
    "bedId": "string (UUID)",
    "userId": "string (UUID)",
    "activeInstancesCount": "number",
    "savedAt": "string (ISODate)"
  }
  ```
- **Asynchronous Consumer Actions:**
  Upon receiving `BedLayoutSaved`, secondary asynchronous consumers (such as the **Reminders Engine**) trigger background tasks:
  1. Retrieve the newly saved layout for `bedId`.
  2. Clear and dismiss old future reminders for this bed (using reasons like `layout_overwritten`).
  3. Schedule new care calendars and maintenance tasks based on the active species, current season, and companion planting relationships.
     This maintains immediate UI Canvas responsiveness while delegating heavy task-scheduling math completely to the asynchronous Kafka worker tier.

```

```
