# MODULE: QUERY

version: 1.3.0
source-spec: v1.3.0
status: active

---

## 1. PURPOSE

Define a unified system for parsing, validating and normalizing API query parameters across the application.

### Location & Relocation target `[TARGET STATE (Pending Iteration 4)]`

- **Current State:** The `GenericQueryParser` and associated parsing utilities temporarily reside inside `src/shared/domain/query/` (under active relocation `[IN PROGRESS (Iteration 4)]`).
- **Target State:** As part of Clean Architecture boundaries (Iteration 1), these technical components belong exclusively to the API Delivery mechanism and will be relocated to `src/apps/agroApi/shared/query/`, leaving the domain core fully pure and agnostic of parsing details.

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

#### Semantic Contract Exception

All semantic rules, matching behaviors, and operator definitions are defined exclusively in **Module: Query DSL Contract (query-dsl-contract.md)**.

The `GenericQueryParser` is strictly a technical parser responsible for:

- Mapping raw incoming HTTP query params into the internal representation.
- Splitting comma-separated values (CSVs) into arrays for array-based operators (`has`, `hasAny`).
- Coercing string values to numbers for technical numeric comparisons (`gt`, `gte`, `lt`, `lte`).

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

#### parseInclude(value) `[TARGET STATE (Pending Iteration 19)]`

- supports:
  - CSV string
  - array input

- normalizes all values to string[]
- supports JSON:API fields and sparse fieldset extraction
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
