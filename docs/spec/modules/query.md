# MODULE: QUERY

version:1.1.0
source-spec: v1.1.0
status: active

---

## 1. PURPOSE

Define a unified system for parsing, validating and normalizing API query parameters across the application.

---

## 2. RESPONSIBILITY

The Query Module is responsible for:

- parsing incoming HTTP query params
- normalizing filter operators
- enforcing type safety in query values
- providing deterministic query transformation
- ensuring API-level consistency for filtering and pagination

---

## 3. CORE COMPONENTS

### 3.1 GenericQueryParser

Central parser for transforming raw query objects into a structured query model.

Supports:

#### Filters

- `eq` → strict equality
- `has` → CSV → array normalization
- `hasAny` → CSV → array intersection input
- `contains` → substring match
- `startsWith` → prefix match
- `endsWith` → suffix match

#### Numeric operators

- `gt`
- `gte`
- `lt`
- `lte`

All numeric values MUST be coerced from string → number.

---

### 3.2 QueryParserUtils

Utility layer for normalization:

#### parseCsv(value)

- input: string
- output: string[]

Rules:

- split by comma
- trim values
- remove empty entries

---

#### toNumber(value, fallback)

- converts string → number
- returns fallback if invalid / NaN

---

#### parseSort(value)

- supports:
  - JSON string input
  - direct object input

- validates sort directions:
  - `asc`
  - `desc`

- invalid values → undefined

---

#### parseInclude(value)

- supports:
  - CSV string
  - array input

- normalizes all values to string[]
- invalid input → undefined

---

## 4. RULES

### 4.1 Determinism rule

Query parsing MUST always produce the same output for the same input.

---

### 4.2 Strict coercion rule

- numeric filters MUST be numbers
- CSV filters MUST be arrays

- invalid formats MUST either:
  - be ignored
  - or throw (depending on context)

---

### 4.3 Safety rule

- malformed filters MUST NOT crash the system
- unknown filter keys MUST be ignored

---

## 5. EDGE CASES

- eq with array-like string ("a,b") is invalid in strict mode
- invalid JSON sort → undefined
- invalid filter structure → ignored

---

## 6. DEPENDENCIES

- shared-utils module
- validation layer (for strict enforcement contexts)

---
