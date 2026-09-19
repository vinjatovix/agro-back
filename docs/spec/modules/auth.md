# MODULE: AUTHENTICATION & IDENTITY (AUTH)

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

This module defines the authentication, authorization, and identity system of AgroApp.

It specifies how users are identified, authorized, and how their user profile data is structured to support secure, scoped access across the application.

---

## 2. PROVIDERS

The system supports the following authentication providers:

- **local:** Standard email and password authentication. _(CURRENTLY IMPLEMENTED)_
- **google:** Stateless OAuth provider. _(CURRENTLY IMPLEMENTED)_
- **github / facebook:** Secondary OAuth providers. **`[TARGET STATE (Pending [Iteration 28](../../roadmap.md#iteration-28-implement-stateless-github-oauth))]`**

---

## 3. FEATURES & USE CASES

### 3.1 Currently Implemented Features

The current codebase in `@src/Contexts/Auth` implements:

- **`RegisterUserLocal`:** Creates a new local user with encrypted password. Sets `emailValidated` to false and registers standard `local` auth method.
- **`LoginUserLocal`:** Verifies local email/password credentials and issues a stateless JWT.
- **`AuthenticateWithGoogle`:** Verifies Google ID tokens, links Google auth methods, auto-creates users derived from Google profiles, and generates JWTs.
- **`ValidateMail`:** Receives a verification token, sets `emailValidated: true`, and issues an updated refresh token.
- **`RefreshToken`:** Verifies and extends active user sessions.
- **`UpdatePasswordLocal`:** Safely updates a user's password, verifying the old password matches first.

### 3.2 Planned Features

- **Stateless OAuth Multi-provider:** Clean verification and profile generation for Github and others. **`[TARGET STATE (Pending [Iteration 28](../../roadmap.md#iteration-28-implement-stateless-github-oauth))]`**
- **Core Mailer Infrastructure (Activation Mail):** Programmatically sending actual registration validation emails. **`[TARGET STATE (Pending Iterations [25](../../roadmap.md#iteration-25-implement-mailer-port-and-local-bypass) & [26](../../roadmap.md#iteration-26-implement-email-account-activation-flow))]`**

---

## 4. JWT & AUTHENTICATION CONTRACT

The authentication system issues stateless JSON Web Tokens (JWT) signed using HMAC SHA-256 (`HS256`).

### 4.1 Token Payload Schema _(CURRENTLY IMPLEMENTED)_

The JWT payload is strictly **lightweight**, containing only the minimal essential user identifier and roles. It does **not** embed variable user profile attributes (such as `postalCode`, `country`, or `hemisphere`), preventing header size bloat (avoiding 431 errors) and ensuring real-time data consistency.

The serialized payload contains exactly:

```json
{
  "id": "string (UUID)",
  "email": "string (email)",
  "username": "string",
  "roles": ["string"]
}
```

_Where:_

- **`roles`:** An array of strings (`string[]`) corresponding to the primitives of the `UserRoles` value object (e.g., `["admin", "user"]`).
- **`iat` (Issued At) and `exp` (Expiration):** Standard numerical claims automatically generated and attached by the cryptographic adapter during signing.

### 4.2 Decoded User Context (`res.locals.user`) _(CURRENTLY IMPLEMENTED)_

The `EnsureAuthentication` middleware decodes and verifies the Bearer token, attaching the light profile representation to the request state context:

```ts
res.locals.user = {
  id: string;         // user UUID
  email: string;
  username: string;
  roles: string[];    // Array of roles
  token: string;      // raw trimmed JWT string
};
```

---

## 5. LOCATION & HEMISPHERE CONFIGURATION (USER PROFILE) `[TARGET STATE (Pending [Iteration 29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate))]`

_Note: The current User aggregate root and database schema do NOT yet support these fields. This entire geographic configuration is planned for [Iteration 29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate)._

To support geographic-specific sowing calendars, local time scheduling, and meteorological watering adjustments without compromising user privacy, the User profile will support the following location configurations:

- `postalCode` (string, optional)
- `country` (string, optional, e.g., "Spain", "Argentina")
- `hemisphere` (enum: `'north'` | `'south'`, defaults to `'north'`)
- `timezone` (string, optional, IANA timezone format e.g., `'Europe/Madrid'`, defaults to `'UTC'`)

### 5.1 Resolution Flow `[TARGET STATE (Pending [Iteration 29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate))]`

1. When a user updates their profile (by submitting geolocation parameters), if `postalCode` and `country` are provided, the backend initiates geolocation resolution (via an offline ZIP-to-lat database or Open-Meteo Geocoding API).
2. If geolocation succeeds, the backend stores the resolved `latitude`/`longitude` in the database and automatically extracts/computes the `hemisphere` (`latitude >= 0 ? 'north' : 'south'`) and the exact IANA `timezone`.
3. If geolocation fails, is empty, or is skipped for privacy, the backend honors any manual `hemisphere` override or `timezone` sent by the user frontend (e.g., captured via `Intl.DateTimeFormat().resolvedOptions().timeZone` in the browser). If none is provided, it defaults to `'north'` and `'UTC'`.

### 5.2 Low-Latency Redis Caching `[TARGET STATE (Pending [Iteration 30](../../roadmap.md#iteration-30-build-redis-cache-repository-with-memory-fallback))]`

All technical caching specifications (including TTLs, Redis configuration, and local in-memory backup fallbacks) are defined centrally in **Module: Persistence (persistence.md)** to prevent specification redundancies.

### 5.3 Context Resolution & Immutability Flow (Backend) `[TARGET STATE (Pending Iterations [29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate), [30](../../roadmap.md#iteration-30-build-redis-cache-repository-with-memory-fallback) & [33](../../roadmap.md#iteration-33-implement-private-user-bookmarks-collection))]`

When a protected use case requires geographic or user-specific configuration details:

1. The endpoint controller receives the request with the JWT validated.
2. The use case is executed, receiving the `userId` (`id` from `res.locals.user`).
3. **`[TARGET STATE (Pending [Iteration 29](../../roadmap.md#iteration-29-add-geographic-fields-to-user-profile-and-bed-aggregate))]` Bed Creation (Snapshotting):** When creating new physical structures like a `Bed`, the usecase queries the `User` aggregate (or the fast Redis cache) to retrieve the profile's `postalCode`, `country`, and `hemisphere` on-the-fly. **These values are then explicitly copied and persisted into the newly created `Bed` document**. This ensures that the historical climate context of a physical location remains permanently immutable, even if the user moves to another continent years later.
4. **`[TARGET STATE (Pending [Iteration 33](../../roadmap.md#iteration-33-implement-private-user-bookmarks-collection))]`** User-level dynamic states, such as bookmarked plants, are still queried dynamically from the independent `user_bookmarks` collection because they are not tied to historical physics.

This hybrid flow guarantees that layout-dependent physics (climates, seasons) are historically preserved, while purely operational states remain 100% fresh and independent of token lifecycles.

---

## 6. ROLES & AUTHORIZATION

### 6.1 Supported Roles

- **admin:** Full system access, including catalog management, user management, and system administration. _(CURRENTLY IMPLEMENTED)_
- **collaborator:** Read-write access to shared botanical datasets (including Plants, Families, Anomalies, and GardenInputs) but restricted from system administration and user management. **`[TARGET STATE (Pending [Iteration 31](../../roadmap.md#iteration-31-introduce-collaborator-role-in-auth-middleware))]`** (Note: `UserRoles.ts` currently restricts values to `admin` and `user`).
- **user:** Standard user, restricted to managing their own Bed, PlantInstance, Event, and SeedBank inventory. _(CURRENTLY IMPLEMENTED)_

---

## 7. BOUNDARY RULES

- **No Shared State:** The authentication session state (specifically, the JWT payload) MUST NOT carry any business-oriented or operational properties (e.g., `postalCode`, `country`, `latitude`, `longitude`, or `hemisphere`).
- **No Direct Domain Exposure:** Authentication primitives are mapped to domain-specific Value Objects (`Email`, `Uuid`, etc.) only at the boundary level.
- **`[TARGET STATE (Pending [Iteration 25](../../roadmap.md#iteration-25-implement-mailer-port-and-local-bypass))]` Local Development Email Validation Bypass:** The local email validation check is strictly enforced in production/staging environments, blocking unvalidated local logins until activated. However, to prevent developer deadlocks prior to full mailer integration ([Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow)), the login system implements a temporary validation bypass strictly constrained to local development environments (`NODE_ENV === 'development'`), enabling local testing and rapid prototyping.

### 7.1 Account Deletion & Right to be Forgotten (GDPR) `[TARGET STATE]`

While the agricultural lifecycle extensively uses Soft Delete mechanics (`status = 'removed'`) to preserve botanical history and temporal analytics, the user account lifecycle is governed by strict privacy laws (GDPR Right to be Forgotten).

- **Hard Delete Cascade:** When a user requests to delete their account, the system MUST execute a complete and irreversible **Hard Delete** of the `User` document and all associated data.
- **Erradication Scope (Batch-based Asynchronous Cascade):** To prevent MongoDB transaction log overflow (exceeding the 16MB physical limit) and potential write lock timeouts, the system MUST NOT run this cascade within a single monolithic HTTP transaction. Instead, the deletion API endpoint marks the User status as `pending_deletion`. A background worker picks up the job and physically deletes downstream records (such as all owned `Beds`, `PlantInstances`, `Events`, `SeedBatches`, and `Reminders` associated with that `userId`) in bounded, sequential batches (e.g., 100 rows per lightweight transaction). It publishes corresponding `Deleted` domain events to Kafka to keep consumers fully synchronized. Once all dependencies are cleared, the final `User` document is hard-deleted.
- **Zombie Session Mitigation (Stateless Revocation):** Because the API uses stateless JWTs that cannot be revoked database-side, the system mitigates "zombie" requests post-deletion through a dual strategy:
  1. Access Tokens (JWTs) MUST have an ultra-short Time-To-Live (e.g., 15 minutes).
  2. The account deletion transaction MUST immediately destroy all associated `Refresh Tokens` in the database. Thus, the client's session will permanently die within minutes without adding Redis blacklist checks to every HTTP request.
- **Rationale:** This ensures immediate and absolute compliance with privacy regulations without the technical burden of anonymizing or managing orphaned data sets.
