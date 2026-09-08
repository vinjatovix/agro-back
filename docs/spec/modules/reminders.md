# MODULE: REMINDERS SYSTEM `[TARGET STATE (Pending Iteration 79)]`

version: 1.3.0
source-spec: v1.3.0
status: evolving

---

## 1. PURPOSE `[TARGET STATE (Pending Iteration 79)]`

This module defines the explicit, stateful, and persisted care task recommendation engine of AgroApp.

It is responsible for automatically generating, scheduling, and updating task actions (such as watering, fertilization, or crop rotations) to guide the gardener's daily activities.

---

## 2. CORE CONCEPT

Unlike on-the-fly calculated warnings, a **Reminder** is a concrete, stateful, and persisted domain entity.

### 2.1 Performance Rationale

Persisting explicit reminder records (with statuses: `pending`, `completed`, `dismissed`) guarantees O(1) performance when rendering user dashboards and agenda views, completely avoiding heavy, real-time recalculation of agronomic schedules over hundreds of crop instances.

---

## 3. DATA MODEL

### 3.1 Reminder (Aggregate Root)

Each Reminder is scoped to an owning user and linked to a physical growing space.

- `id`: UUID (value object)
- `userId`: UUID (ownership reference)
- `bedId`: UUID (anchored location reference)
- `plantInstanceId`: UUID (optional, mandatory if scope === 'instance')
- `scope`: enum (`'bed'` | `'instance'`)
- `type`: enum (`'watering'` | `'fertilization'` | `'pruning'` | `'treatment'` | `'rotation'` | `'harvest'` | `'transplant'`)
- `scheduledDate`: ISODate
- `status`: enum (`'pending'` | `'completed'` | `'dismissed'`)
- `dismissedReason`: string (optional, e.g., "precipitation threshold exceeded")
- `notes`: string (optional details)
- `metadata`: Audit metadata

---

## 4. EXPLICIT TARGET SCOPE (NO MAGIC NULLS)

To maintain clear domain interfaces, every Reminder features an explicit `scope` field:

1. **Instance Scope (`scope === 'instance'`):**
   - Target: A specific physical crop.
   - `plantInstanceId` is mandatory.
   - Focuses on individual life cycles (e.g., pruning or localized pest treatments).

2. **Bed Scope (`scope === 'bed'`):**
   - Target: The physical Bed container as a whole.
   - `plantInstanceId` is null.
   - Focuses on overall container care (e.g., general weeding, soil preparation, or bio-stimulant spraying).

---

## 5. PASSIVE EVENT-DRIVEN TRIGGERS `[TARGET STATE (Pending Iteration 80)]`

Reminders are never generated in isolation. They are passively managed through an event-driven architecture triggered by the chronological logging journal:

- **Creation:** Logging a cultivation `Event` (e.g., watering or fertilizing) completes any matching pending `Reminder` and automatically schedules the next chronological task based on the plant's advisory intervals.
- **Modification / Deletion:** Mutating (`PATCH`) or removing historical `Event` logs triggers an automatic cascading recalculation of future scheduled tasks.
- **Anomaly Resolution (Recovery):** Logging a `recovery` (anomaly resolved) event explicitly signals the end of a disease or pest cycle. This triggers the Reminders Engine to automatically dismiss any pending, recurring `treatment` reminders associated with that specific anomaly, preventing indefinite task loops.

---

## 6. CASCADING INVALIDATION RULES

To protect data consistency and avoid ghost alerts, the system enforces automatic, database-level cascades:

1. **PlantInstance Soft-Deletion `[TARGET STATE (Pending Iteration 81)]`:**
   - When a `PlantInstance` is marked as deleted (`status = 'removed'`), any pending `Reminder` with `scope === 'instance'` targeting its ID is immediately updated to `'dismissed'` with the reason `"instance_removed"`.

2. **Bed Deletion or Empty Bed `[TARGET STATE (Pending Iteration 82)]`:**
   - When a `Bed` is deleted, all pending Reminders linked to its `bedId` are automatically dismissed.
   - If a Bed becomes completely empty (0 active/alive plants), any pending Reminders with `scope === 'bed'` representing crop-dependent tasks (such as pest prevention or soil nutrition) are automatically cancelled.

---

## 7. METEOROLOGICAL ADAPTABILITY & REDIS CACHING

Reminders dynamically adapt to local weather forecasts and geographic contexts without compromising performance:

### 7.1 Geographic & Temporal Inheritance

Beds immutably inherit and store their `postalCode`, `country`, `hemisphere`, and `timezone` from the User's profile at the exact moment of creation (as defined in `bed.md`).

**Local Time Anchoring `[TARGET STATE]`:** Reminders use an absolute `ISODate` for backend storage. However, agricultural tasks are strictly diurnal. To prevent alerting a user in the middle of the night, the Reminders Engine retrieves the `timezone` (e.g., `'America/Argentina/Buenos_Aires'`) directly from the target `Bed` aggregate. It uses this historically-anchored timezone to shift the generated `scheduledDate` to the correct local morning hour (e.g., 08:00 AM local time) before converting it back to UTC for storage and execution. This guarantees that if a user relocates to another country and updates their profile, their older established gardens remain completely unaffected.

### 7.2 Redis Cache Policies

All technical specifications of these caching mechanisms (such as TTLs, serialization, and memory fallback behaviors) are defined centrally in **Module: Persistence (persistence.md)** to prevent spec duplication.

### 7.3 Climatic Rain Silencing & Promise Deduplication

- **Check `[TARGET STATE (Pending Iteration 83)]`:** Before displaying active watering reminders, the system checks cached weather reports.
- **Thundering Herd Protection (Promise Deduplication) `[TARGET STATE (Pending Iteration 84)]`:** To prevent thousands of simultaneous reminders scheduled at the exact same hour from triggering a mass concurrent fetch to Open-Meteo (if the Redis cache has expired), the system employs **Promise Deduplication (Lazy Fetching)**. If Redis is empty, the first Node.js thread initiates the API call and stores the pending `Promise` in a local memory Map. All subsequent concurrent requests for the same GeoHash will `await` this identical Promise, resulting in only 1 actual HTTP request to Open-Meteo, shielding the external API from rate limits.
- **Rule `[TARGET STATE (Pending Iteration 85)]`:** If local precipitation exceeds a configurable threshold (e.g., 5mm of rain in the last 24h or forecasted for the next 12h), the system automatically silences or delays the reminder, updating its status to `'dismissed'` or rescheduling it with a note.
- **Protected Environment Bypass `[TARGET STATE (Pending Iteration 86)]`:** This meteorological check is strictly **bypassed** under the centralized **Protected Environment Bypass Rule (spatial.md Sec. 5.4.1)** for `'indoor'` or `'greenhouse'` Bed environments. These protected crops are isolated from external precipitation and must never have their watering schedules silenced.
- **Resilient Fallback:** If Open-Meteo or Redis is unreachable, the system silently falls back to the standard static calendar schedule, ensuring continuous operation.

---

## 8. SYSTEM BOUNDARIES

- Reminders depend on: `Auth`, `Bed`, `PlantInstance`, `Events`.
- The domain layer is pure; scheduling intervals and weather logic are computed via pure domain services.
- Integration with Redis, Open-Meteo, and database transactions is isolated within the infrastructure layer.
