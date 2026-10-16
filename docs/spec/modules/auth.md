# MODULE: AUTHENTICATION & IDENTITY (AUTH)

version: 1.5.0
source-spec: v1.5.0
status: stable

---

## 1. PURPOSE

This module defines the authentication, authorization, and identity system of MiBancal.

It specifies how users are identified, authorized, and how their user profile data is structured to support secure, scoped access across the application.

---

## 2. PROVIDERS

The system supports the following authentication providers:

- **local:** Standard email and password authentication. _(CURRENTLY IMPLEMENTED)_
- **google:** Stateless OAuth provider; the client sends a Google ID token (`idToken`) and the API verifies it. _(CURRENTLY IMPLEMENTED)_
- **github / facebook:** Secondary OAuth providers. **`[TARGET STATE (Pending [Iteration 28](../../roadmap.md#iteration-28-implement-stateless-github-oauth))]`**

---

## 3. FEATURES & USE CASES

### 3.1 Currently Implemented Features

The current codebase in `@src/Contexts/Auth` implements:

- **`RegisterUserLocal`** (`POST /auth/register`, [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow)): every well-formed registration answers `202` with an empty body, whatever the email. Order: password rules and confirmation, then every other request rule (id, email, username), then the password is hashed (on every path), then a taken id (`409 "User with id <id> already exists"`), then the account of the email is looked up, then a taken username (`409 "Username already in use"`). A username is taken by any other account, including an expired pending account of another email, an active account or a pending one with a valid link; the only holder that does not count is the replaceable pending account of the same email, which this registration replaces and whose username it keeps ([Iteration 26b](../../roadmap.md#iteration-26b-implement-password-reset-by-email); the check compares ids, as usernames and emails are unique). Then, by the email's account:
  - new email → a PENDING account (`emailValidated: false`, `local` method, one activation token) and the activation email;
  - ACTIVE account → nothing stored, the owner gets the "registration attempt" notice;
  - PENDING with a valid activation token → nothing stored, nothing sent;
  - PENDING whose token expired (or that never had one) → replaced in one transaction (`deleteIfReplaceable` + `create`), activation email for the new one; if it was activated or linked meanwhile, or the email was taken again after the delete, nothing is written and nothing is sent;
  - a duplicate-email race on insert (`create` → `emailTaken`) answers the same `202` with no email.
- **`ActivateAccount`** (`POST /auth/activate`, body `{ token }`, [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow)): hashes the token, finds the account by it, validates the email and removes the token in one write. Answers `204` with no body and no session token. Any token that cannot activate an account (unknown, expired, used, replaced, of another purpose, malformed, a session JWT) gets the same `400 { "message": "Invalid or expired token" }` (`InvalidEmailTokenException`), including the loser of two concurrent activations. Failed attempts count towards `authLimiter`.
- **`LoginUserLocal`:** verifies local email/password credentials and issues a stateless JWT. After the password matches, an account whose email is not validated gets the same `401 "Invalid credentials"`, in every mode (§7). Every refusal costs one bcrypt comparison: a missing account, or one without a local password (Google only), runs `EncrypterTool.simulateCompare` against a hash of an unknown value built once with the configured cost, so response time does not reveal whether the email has an account.
- **`AuthenticateWithGoogle`:** verifies Google ID tokens, links Google through `User.linkProvider` (§3.5), auto-creates users derived from Google profiles, and generates JWTs. A write that lost a race is retried once after reading the account again; a second loss is a `409`.
- **`RefreshToken`:** loads the account of the verified session (`searchById`); a removed or unvalidated account gets the same `401 "Invalid token"` as a bad token, otherwise the session is extended.
- **`ForgotPassword`** (`POST /auth/password/forgot`, body `{ email }`, [Iteration 26b](../../roadmap.md#iteration-26b-implement-password-reset-by-email)): every well-formed email answers `202` with an empty body. The request only looks the account up; for an existing one, a background task issues a `passwordReset` token (30 minutes, replacing any previous one) and sends the reset email. Within 2 minutes of the last reset token nothing is issued or sent (`User.hasRecentResetToken`). If the token write loses a race (`stale`) no email is sent. An unknown email schedules nothing. Background failures are only logged (recipient domain and reason). Guarded by `passwordResetLimiter`.
- **`ResetPassword`** (`POST /auth/password/reset`, body `{ token, password, repeatPassword }`, [Iteration 26b](../../roadmap.md#iteration-26b-implement-password-reset-by-email)): checks the password rules and the confirmation first, so a password `400` leaves the token usable; then finds the account by the token hash and applies `User.resetPassword`: stores the new hash (adding the `local` auth method if missing, keeping linked providers), sets `emailValidated: true`, and removes the reset token and any activation token, in one write. Answers `204` with no body and no session token, and emails the "password changed" notice. Any token that cannot reset (unknown, used, expired, replaced, an activation token, the loser of a concurrent reset) gets `400 { "message": "Invalid or expired token" }`. Failed attempts count towards `authLimiter`.
- **`UpdatePasswordLocal`:** safely updates a user's password through `User.changePassword`, verifying the old password matches first; a concurrent change of the same account is a `409`.

`GET /auth/validate/:token` and `ValidateMail` were removed in [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow). `POST /auth/register` uses `registrationLimiter` and `POST /auth/password/forgot` uses `passwordResetLimiter`; both count every request (5 per IP every 15 minutes) because every request answers the same success and may send an email.

### 3.2 Planned Features

- **Stateless OAuth Multi-provider:** GitHub sign-in through a server-side exchange of the authorization code (with PKCE), requiring a primary verified email, and one user-resolution step shared with Google (§3.5). **`[TARGET STATE (Pending [Iteration 28](../../roadmap.md#iteration-28-implement-stateless-github-oauth))]`**

### 3.3 Request Validation _(CURRENTLY IMPLEMENTED)_

Auth routes validate input with Zod through `validateRequest` (validation.md §3.2–§3.3); schemas live in `src/apps/agroApi/controllers/Auth/requestSchemas.ts`. Every route below also declares an empty strict `query`, so any query parameter gets `"Unknown field"`, and any body field not listed gets `"Unknown field"` too. Field order is the order of the error keys.

| Route                        | Validated input                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`        | body `id` (RFC UUID), `email` (email), `username` (string), `password` and `repeatPassword` (strings, must match) |
| `POST /auth/login`           | body `email` (email), `password` (string)                                                                         |
| `POST /auth/google`          | body `idToken` (string)                                                                                           |
| `POST /auth/activate`        | body `token` (string, 1 to 512 characters)                                                                        |
| `POST /auth/password/forgot` | body `email` (email)                                                                                              |
| `POST /auth/password/reset`  | body `token` (string, 1 to 512 characters), `password` and `repeatPassword` (strings, must match)                 |
| `POST /auth/update`          | body `password` and `repeatPassword` (strings, must match), `oldPassword` (string)                                |
| `POST /auth/refresh`         | no client input, no schema                                                                                        |

- **Strength rule** lives only in the domain value object `PlainPassword`: 8 to 64 characters (counted in code points, so an emoji is one) and at most 72 bytes in UTF-8, because bcrypt ignores every byte after the 72nd, with at least one uppercase letter, one lowercase letter, one digit and one non-alphanumeric character (ASCII letters and digits; anything else, such as `ñ` or a space, counts as the special character). `RegisterUserLocal`, `UpdatePasswordLocal` and `ResetPassword` build it before any repository lookup, so a weak password is always a `400` with a top-level `message` (e.g. `"<PlainPassword> must include at least one digit"`), never a `409` or `401`. The schemas only check that both fields are strings.
- **Match rule:** `"Passwords do not match"` under `repeatPassword`, reported together with other field errors. The use cases check it again with the same text and answer `400` (`InvalidArgumentException`) if called without the schema. A new password equal to the old one is also a `400` (`"New password must be different from old password"`), checked after the old password is verified.
- **Stricter formats:** `email` uses Zod's email format and `id` an RFC UUID (version and variant digits checked). Examples now answered `400`: email `a!b@example.com`, id `12345678-1234-1234-1234-123456789012`. The domain value object `Email` uses the same pattern as Zod, so any entry point (not only HTTP) rejects the same addresses; `User.fromPrimitives` builds `Email` too, so a stored user whose email no longer matches can no longer be loaded.
- No message contains the submitted value.

### 3.4 Mailer Infrastructure _(CURRENTLY IMPLEMENTED, [Iteration 25](../../roadmap.md#iteration-25-implement-mailer-port-and-local-bypass))_

- **Port:** `Mailer.send(message: EmailMessage): Promise<MailReceipt>` (`src/Contexts/shared/application/mailer`), injected as `mailer`. `EmailMessage.create({ to, subject, text, html? })` validates before any channel is used: `to` follows the shared `Email` rules, `subject` is trimmed, non-empty and has no line breaks, `text` is non-empty, `html` is optional but non-empty when present. Violations throw `InvalidArgumentException` with one entry per field.
- **Channels, picked once at start-up from `NODE_ENV` and `RESEND_API_KEY`** (`src/Contexts/shared/infrastructure/mailer/createMailer.ts`):

  | `NODE_ENV`    | `RESEND_API_KEY` | Channel                                                      |
  | ------------- | ---------------- | ------------------------------------------------------------ |
  | `test`        | any              | `InMemoryMailer`: records messages, never leaves the process |
  | `development` | empty            | `ConsoleMailer`: logs `[SIMULATED EMAIL]` with the message   |
  | `development` | set              | `ResendMailer`: real delivery, with a start-up warning       |
  | `production`  | any              | `ResendMailer`: real delivery                                |
  | anything else | any              | start-up fails                                               |

- **Settings:** `RESEND_API_KEY` (secret), `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` (optional, sent quoted as `"Name" <address>`), `MAIL_SEND_TIMEOUT_MS` (default 5000, 1–10000). They are checked only when the real channel is selected: a missing key or sender, a malformed sender, a name with line breaks or an out-of-range time-out stops start-up with an error that names the variable, never its value.
- **Failures:** `ResendMailer` rejects with `MailDeliveryException` and a `reason`: `unauthorized` (401/403), `rateLimited` (429), `rejected` (other 4xx), `unavailable` (5xx or network error), `timeout`. It is not mapped to an HTTP status yet. A `2xx` whose body cannot be read still resolves (without id). A `timeout` or network failure does not prove the message was not delivered, so a retry may send it twice. `ResendMailer` logs carry the recipient's domain, the provider id or status, never the API key or the body. `ConsoleMailer` logs the whole message on purpose (the developer needs its links), so in development the body reaches the log files and the Mongo log collection.
- **Acceptance tests:** `settledMailbox()` (`tests/apps/agroApi/features/step_definitions/utils/mailbox.ts`) waits for the application's `BackgroundTasks.idle()` and returns its `InMemoryMailer` (`sentMessages()`, `clear()`); steps that read mail use it, and the Cucumber `Before` hook clears it for every scenario.

### 3.4.1 Account Emails _(CURRENTLY IMPLEMENTED, [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow))_

Built by `MailerAccountNotifier` (`src/Contexts/Auth/application/notifications`), Spanish only, with `text` and a minimal `html`. None contains a password; only the activation and password reset emails contain a token, and only inside the link's fragment.

| Kind                  | Sent when                                                    | Subject                                         |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `activation`          | Registration creates or replaces a pending account           | `Activa tu cuenta de MiBancal`                  |
| `registrationAttempt` | Registration with the email of an ACTIVE account             | `Alguien ha intentado registrarse con tu email` |
| `providerLinked`      | A provider sign-in links an ACTIVE account                   | `Se ha vinculado <Proveedor> a tu cuenta`       |
| `passwordReset`       | A reset is requested for an existing account (Iteration 26b) | `Restablece tu contraseña de MiBancal`          |
| `passwordChanged`     | A password reset is completed (Iteration 26b)                | `Tu contraseña de MiBancal ha sido cambiada`    |

- **Links:** `${FRONTEND_BASE_URL}/activate#token=<token>` and `${FRONTEND_BASE_URL}/reset-password#token=<token>` (valid 30 minutes, said in the email, which also tells whoever did not ask for it to ignore it). `FRONTEND_BASE_URL` is a required URL setting (one trailing `/` dropped); a missing or malformed value stops start-up in every mode. Fragments never reach servers, proxies or `Referer`.
- **Activation token:** 32 random bytes as base64url (43 characters) from `OneTimeTokenTool` (`node:crypto`), valid 24 hours, single use. The account stores only `SHA-256(token)` in hex inside `emailTokens: [{ purpose, tokenHash, expiresAt }]` (absent when empty, never `[]` or `null`; at most one token per purpose; `passwordReset` tokens are built the same way and live 30 minutes). Unique partial index `users_email_token_hash_unique` on `emailTokens.tokenHash` (migration `20261016120000-create-users-email-token-index`).
- **Background sending:** the notifier builds the message at once and hands `mailer.send` to `BackgroundTasks` (`InProcessBackgroundTasks`): no request waits for the mailer. A failure is logged at `warn` as `Account email <kind> to <recipient domain> failed: <reason>` (`MailDeliveryException.reason` or the error class name), never the address, token, link or body. The HTTP server stop waits for pending sends up to `MAIL_SEND_TIMEOUT_MS`. An email in flight is lost if the process crashes (accepted; no queue).

### 3.5 Account Linking and Pre-Hijacking Protection _(CURRENTLY IMPLEMENTED, [Iteration 26](../../roadmap.md#iteration-26-implement-email-account-activation-flow))_

One person has one `User`, whatever the ways they sign in: each one is an entry in `authMethods` (`local` with a password hash, or a provider with its `providerUserId`). An OAuth sign-in finds the user by provider id first, then by email, and links or creates the account.

**The risk.** An attacker registers locally with the victim's email and a password of their own. They cannot open the activation link, so the account stays unvalidated. Before Iteration 26, when the victim later signed in with Google, Google was linked to that account and the attacker's password kept working.

**Rules**, owned by `User.linkProvider` (outcomes `alreadyLinked`, `securedPendingAccount`, `linkedToActiveAccount`) so every OAuth provider reuses them:

1. **No session before validation.** `LoginUserLocal` and `RefreshToken` refuse a user whose `emailValidated` is false, in every mode (§7), with the same `401` as wrong credentials so the answer does not reveal the account.
2. **Linking to an unvalidated account removes its password.** The provider has just proved who owns the email; whoever chose the password did not. The `local` auth method and the stored hash are removed (unset, never stored as `null`) in the same write that links the provider and validates the email.
3. **Linking to a validated account keeps the password and tells the owner.** The owner gets an email naming the provider that was linked, so a link they did not expect is visible.
4. **A pending account cannot hold an email forever.** A registration with the email of an unvalidated account whose activation token has expired replaces that account. While the token is valid, the registration gets the same answer as any other (no account enumeration, §3.2) and nothing changes.
5. **The activation email** tells whoever did not create the account not to open the link: opening it would validate an account whose password someone else chose.

A user whose password was removed by rule 2 signs in through the provider only, until they set a new one with the password reset (`ResetPassword`, §3.1, [Iteration 26b](../../roadmap.md#iteration-26b-implement-password-reset-by-email)). A reset also validates the email, so the real owner of a pre-hijacked account takes it back with it.

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
- **No Direct Domain Exposure:** Authentication primitives are mapped to domain-specific Value Objects and branded types (`Email`, `UserId`, etc.) only at the boundary level.
- **Audit Metadata Ownership:** every User change goes through a `User` method (`register`, `activate`, `issueEmailToken`, `changePassword`, `linkProvider`) that refreshes `updatedAt`/`updatedBy` in memory with one timestamp, the actor being the account's own username. `UserPatch` was removed. The use case keeps `before = user.toPrimitives()`, calls the method and passes both states to `AuthRepository.update(before, after)`, which writes the top-level diff (`$set`, `$unset` for removed fields, `metadata` field by field as given) and never adds audit data (persistence.md, Metadata Ownership).
- **Concurrent writes without a version:** User has no `version` / `If-Match`. `update(before, after)` is a compare-and-set: it only matches while every changed field (except `metadata`) still holds its `before` value (`$exists: false` when it was absent), and answers `written`, `unchanged` or `stale`. Two activations with the same token: the first writes, the second is `stale` and gets the uniform `400`.
- **Validated Email in Every Mode:** login and refresh require a validated email in every mode, `development` included (`User.canStartSession()`). There is no bypass: locally, the console mailer prints the activation link, so a developer activates the account like any user.

### 7.1 Account Deletion & Right to be Forgotten (GDPR) `[TARGET STATE]`

While the agricultural lifecycle extensively uses Soft Delete mechanics (`status = 'removed'`) to preserve botanical history and temporal analytics, the user account lifecycle is governed by strict privacy laws (GDPR Right to be Forgotten).

- **Hard Delete Cascade:** When a user requests to delete their account, the system MUST execute a complete and irreversible **Hard Delete** of the `User` document and all associated data.
- **Erradication Scope (Batch-based Asynchronous Cascade):** To prevent MongoDB transaction log overflow (exceeding the 16MB physical limit) and potential write lock timeouts, the system MUST NOT run this cascade within a single monolithic HTTP transaction. Instead, the deletion API endpoint marks the User status as `pending_deletion`. A background worker picks up the job and physically deletes downstream records (such as all owned `Beds`, `PlantInstances`, `Events`, `SeedBatches`, and `Reminders` associated with that `userId`) in bounded, sequential batches (e.g., 100 rows per lightweight transaction). It publishes corresponding `Deleted` domain events to Kafka to keep consumers fully synchronized. Once all dependencies are cleared, the final `User` document is hard-deleted.
- **Zombie Session Mitigation (Stateless Revocation):** Because the API uses stateless JWTs that cannot be revoked database-side, the system mitigates "zombie" requests post-deletion through a dual strategy:
  1. Access Tokens (JWTs) MUST have an ultra-short Time-To-Live (e.g., 15 minutes).
  2. The account deletion transaction MUST immediately destroy all associated `Refresh Tokens` in the database. Thus, the client's session will permanently die within minutes without adding Redis blacklist checks to every HTTP request.
- **Rationale:** This ensures immediate and absolute compliance with privacy regulations without the technical burden of anonymizing or managing orphaned data sets.
