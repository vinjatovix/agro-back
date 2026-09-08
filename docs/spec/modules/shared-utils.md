# MODULE: SHARED-UTILS

version: 1.3.0
source-spec: v1.3.0
status: active

---

## 1. PURPOSE

Provide a framework-agnostic utility layer used across:

- tests
- API layer
- DTO transformations
- request building
- interpolation system
- response comparison

---

## 2. RESPONSIBILITY

Shared Utils MUST:

- contain NO domain logic
- remain deterministic
- be pure functions only
- be safe for test environments
- be reusable across all layers

---

## 3. CORE UTILITIES

---

### 3.1 DTO Utilities

#### buildPatch(overrides)

Builds nested patch objects from dot-path keys.

Example:

```ts
{
  "identity.family": "abc"
}
```

→ produces:

```ts
{
  identity: {
    family: 'abc';
  }
}
```

Rules:

- supports deep object creation
- preserves immutability
- merges multiple paths safely

---

#### deepMerge(target, patch)

Deep merges two objects.

Rules:

- recursive merge for objects
- patch overrides primitive values
- non-object values replace target entirely

---

## 3.2 Interpolation System

### interpolateRoute(route, world)

- replaces `{param}` in routes
- requires primitive values only
- throws if missing param

---

### interpolateJson(body, world)

- parses JSON string
- recursively interpolates:
  - strings
  - objects
  - arrays

- returns serialized JSON string

---

## 3.3 Request Utilities

### buildRequest({ method, route, token, body })

Standardized HTTP request builder.

Rules:

- supports methods:
  - GET
  - POST
  - PATCH
  - DELETE

- attaches Authorization header if token exists
- serializes body if present

---

### withToken(token)

Helper for conditional auth injection.

---

### buildGetRequestWithQuery()

- builds GET request with encoded query string
- ensures consistent encoding via `encodeURIComponent`
- supports world interpolation context

---

## 3.4 Response Comparison

### compareResponseObject(a, b)

Deep comparison utility used in tests.

Supports:

- primitives
- nested objects
- arrays (order-insensitive matching for expected subset)

Rules:

- undefined expected → always passes
- null expected → strict null match
- arrays → partial match allowed
- objects → recursive comparison

---

## 4. RULES

### 4.1 Purity rule

All utilities MUST be pure functions.

---

### 4.2 No side effects rule

Shared utilities MUST NOT:

- access DB
- access HTTP directly (except test request builders)
- depend on domain logic

---

### 4.3 Deterministic behavior rule

Given the same input:

- output MUST always be identical
- no randomness allowed

---

## 5. TESTING ROLE

Shared utils are heavily used in:

- Cucumber step definitions
- contract validation
- OpenAPI response matching
- request building abstraction layer

---

## 6. DEPENDENCIES

- none (except minimal shared type guards like `isObject`, `isPrimitive`)
