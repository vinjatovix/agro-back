# MODULE: OBSERVABILITY & TELEMETRY PIPELINE

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE `[TARGET STATE (Pending Iterations 48 & 43)]`

Defines the technical specifications, boundaries, and policies of AgroApp's distributed logging pipeline, ensuring high-availability and performant system monitoring through the PLG Stack (Promtail/Vector, Loki, Grafana) buffered by Apache Kafka.

---

## 2. PIPELINE LIFECYCLE

The system's technical telemetry and diagnostic logs follow this streaming path:

```
[ AgroApp API (Winston) ]
            │
            │ (Winston Kafka Transport) - Asynchronous Transport
            ▼
 [ Kafka Topic: "agro.app.logs" ] (Temporal Buffer / Rate-Limiter)
            │
            │ (Vector Agent - Bulk Ingestion)
            ▼
  [ Loki (Time-Series Log DB) ] ◄───── [ Grafana (Dashboards & Alerts) ]
```

---

## 3. CORE DESIGN PRINCIPLES

### 3.1 Decoupling App I/O

To prevent diagnostic log writing from competing with transactional database queries (MongoDB) or degrading HTTP server latencies:

- In production, local file-system logging (`File` transport) and direct database logging (`winston-mongodb`) are deactivated.
- All technical logs are dispatched asynchronously to Kafka in a structured JSON format, guaranteeing a virtual $0\text{ms}$ write latency on the main HTTP request thread. `[TARGET STATE (Pending Iteration 45)]`

### 3.2 Rate-Limiting Protection (Kafka Buffering)

- **Kafka as Buffer:** During massive traffic spikes or DDoS attacks, Kafka acts as an absorbing buffer. Instead of flooding Loki with immediate writes, logs are safely held in the `agro.app.logs` topic.
- **Vector Batching:** The ingestion agent (Vector) consumes from Kafka at a controlled rate, packing thousands of logs into single bulk requests to Loki, reducing network and CPU overhead.
- **Kafka Retention TTL:** Technical logs are configured with a strict **24-hour** retention window in Kafka, which is sufficient to buffer spikes and allow Vector to recover if Loki undergoes maintenance.

### 3.3 SRE-Centric Monitoring & Outbox Lag Tracking

- **API Metrics:** Grafana will compile real-time dashboards from structured logs, analyzing endpoint response times (via Request/Response Logger) and technical error rates (5xx vs 4xx).
- **Outbox Lag Metric:** To guarantee real-time data streaming visibility, the telemetry system MUST track and expose an **Outbox Lag** metric (the delta between the oldest unpublished/unconfirmed event in the MongoDB `outbox` collection and the current time). This measures pipeline health and detects tailer bottlenecks.
- **Critical Alerts:** Instant alerts will be triggered for critical system failures:
  - MongoDB unreachable or down.
  - Kafka broker connection drops or buffer saturation.
  - Outbox Lag exceeding a critical SLA threshold (e.g., lag > 5 minutes), indicating the Change Stream publisher is stalled or failing.

---

## 4. BOUNDARY RULES (CRITICAL)

- **Mandatory Fail-Silent & Bounded Queue Rule:** Under no circumstances should a connection failure, timeout, or unavailability of the Kafka cluster block the Node.js application startup or degrade customer requests.
  - **Memory Protection:** The Winston Kafka transport MUST implement a strict **Bounded Queue (Ring Buffer)** of configurable size (e.g., maximum 10,000 logs in-memory).
  - **OOM Prevention:** If the Kafka cluster becomes unreachable and the bounded queue fills up completely, new incoming technical logs must be immediately dropped (or fallback-redirected to the system's `stdout` standard stream), silently discarding telemetry data to prevent memory saturation (Out-of-Memory) and ensure absolute API server stability.
- **Absolute Data Privacy (GDPR & IP Protection) `[TARGET STATE (Pending Iteration 44)]`:** To ensure total farmer privacy and protect corporate seed bank secrets:
  - Dumping personally identifiable information (PII), passwords, authorization JWTs, or exact crop coordinate values in logs at `INFO`, `WARN`, or `ERROR` levels is strictly prohibited.
  - Winston formatters will apply automatic regex masking on keys containing "password", "token", or spatial "position" coordinates before dispatching to Kafka.
