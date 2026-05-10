# MODULE: PLANT

version: 1.1.0
source-spec: v1.1.0
status: formalized (derived from codebase snapshot)

---

## 1. PURPOSE

The Plant module defines the --biological definition layer-- of AgroApp.

It represents a plant as a --species-level aggregate--, not a spatial or temporal instance.

Plant is the --source of agronomic truth-- used by:

- PlantInstance (runtime occurrence)
- Knowledge System (ecological context)
- Spatial System (indirect spacing rules)
- Events System (context enrichment)

---

## 2. DOMAIN ROLE

Plant is a --definition aggregate root--.

It is responsible for describing:

- identity (what it is)
- traits (how it behaves biologically)
- phenology (how it develops over time)
- knowledge references (ecological context)

---

## 3. CORE PRINCIPLE

> Plant defines _what a plant is_, not _what happens to it in space or time_

Rules:

- Plant is NOT spatial
- Plant is NOT temporal
- Plant is NOT lifecycle runtime
- Plant is NOT event-driven

---

## 4. INTERNAL STRUCTURE

Plant is composed of 4 core subdomains:

### 4.1 Identity

```ts
{
  name: {
    primary: string;
    aliases?: string[];
  };
  scientificName?: string;
  family: string;
}
```

Rules:

- primary name is required semantic identifier
- aliases are optional semantic enrichments
- family links to taxonomy layer (external bounded context)

---

### 4.2 Traits (Biological constraints)

```ts
{
  lifecycle: PlantLifecycle;
  size: {
    height: Range;
    spread: Range;
  }
  spacingCm: Range;
}
```

#### Meaning

- lifecycle → biological growth pattern
- size → expected physical bounds
- spacingCm → **advisory spatial constraint (NOT enforcement)**

#### Important boundary rule

Spacing is:

> advisory constraint for SpatialSystem, not a rule enforced by Plant

---

### 4.3 Phenology (time behavior model)

#### Sowing

Encapsulated as:

- seedsPerHole
- germinationDays
- months
- methods (direct / starter)

This is a **structured sub-aggregate (PlantSowing)**

Rules:

- validation is strict at construction time
- months must not be empty
- depth constraints must exist

---

#### Flowering

- months
- pollination (optional)

---

#### Harvest

- months
- description (optional)

---

### 4.4 Knowledge (ecological reference layer)

```ts
knowledge?: PlantKnowledge
```

Rules:

- optional
- may default to empty object
- never embedded logic
- pure reference layer only

---

## 5. BEHAVIOR

### 5.1 Lifecycle control

Plant supports soft deletion:

```ts
markAsDeleted();
```

Rules:

- idempotent
- sets status = DELETED
- sets deletedAt timestamp

---

### 5.2 Validation invariants

#### Status consistency

- ACTIVE → cannot have deletedAt
- DELETED → must have deletedAt

This is enforced in constructor.

---

### 5.3 Immutability principle

- props are deeply frozen
- domain state cannot be mutated externally
- only controlled mutations via explicit methods

---

## 6. DOMAIN RULES

### 6.1 Allowed dependencies

Plant MAY depend on:

- Value Objects (Range, MonthSet, Metadata)
- Sub-aggregates (PlantSowing)
- Knowledge references

---

### 6.2 Forbidden dependencies

Plant MUST NOT depend on:

- API layer
- persistence layer
- spatial logic
- event system
- validation middleware

---

## 7. RELATIONSHIP MODEL

### 7.1 Plant → PlantInstance

- Plant defines blueprint
- PlantInstance is runtime instantiation

No bidirectional coupling.

---

### 7.2 Plant → Knowledge System

- Plant references knowledge IDs
- Knowledge system remains external

---

### 7.3 Plant → Spatial System

- Plant defines spacingCm (advisory)
- Spatial system enforces actual placement

---

### 7.4 Plant → Events (indirect future link)

- Plant does not consume events
- Events may reference Plant metadata

---

## 8. SERIALIZATION CONTRACT

Plant is not self-serializable.

All transformations must go through:

- PlantMapper
- DTO layer
- Repository mapping layer

---

## 9. MAPPING STRATEGY

### 9.1 PlantMapper responsibilities

- Plant ↔ PlantPrimitives
- DTO → Plant
- Patch → Partial PlantPrimitives
- Knowledge mapping delegation

---

### 9.2 Critical rule

Mapper is the **only place where structural translation is allowed**

Plant must remain pure.

---

## 10. QUERY SUPPORT (NEW)

Plant collection endpoints support the global Query System.

---

### 10.1 Find all Plants

GET /api/v1/plants

Supports:

- filtering (Query DSL)
- sorting
- pagination
- include (future)

---

### 10.2 Query behavior rules

- filters MUST follow validated Query DSL
- invalid filters are rejected in Validation layer
- Plant domain MUST NOT interpret query semantics
- query execution is handled in Application + Persistence layers

---

### 10.3 Allowed filter fields

Filterable Plant fields include:

- identity.aliases
- identity.family
- traits.lifecycle
- traits.spacingCm
- phenology.sowing.months
- phenology.sowing.methods
- knowledge.soil.ph
- knowledge.soil.availableDepthCm
- knowledge.light.hoursMin
- knowledge.light.type
- knowledge.ecology.strategicBenefits
- knowledge.rootSystem.type

(Exact enforcement delegated to validation layer)

---

## 11. CURRENT ARCHITECTURAL OBSERVATIONS

### 11.1 Strengths

- strong value object usage
- clear separation of phenology and knowledge subdomains
- good immutability via deepFreeze
- explicit validation rules
- proper aggregate boundary usage

---

### 11.2 Emerging risks

#### 1. Plant is becoming "semantic hub"

It contains:

- biology
- partial lifecycle
- knowledge reference
- deletion lifecycle
- validation rules

risk: gradual expansion into god-aggregate

---

#### 2. Phenology is well-designed but heavy

PlantSowing is already:

- mini-aggregate inside aggregate
- full validation + serialization + factory

acceptable, but must remain isolated

---

#### 3. Knowledge coupling is still loose

- PlantKnowledge is embedded but optional
- risk of hidden coupling increasing over time

---

## 12. ANTI-PATTERNS

Forbidden in Plant:

- spatial logic
- event handling
- persistence awareness
- DTO awareness
- business workflows
- cross-aggregate mutation
- query parsing logic

---

## 13. EVOLUTION PATH

### 13.1 Likely future stabilizations

- PlantLifecycle may become full state machine module
- Phenology may split further (GrowthModel module)
- Knowledge may become external query system only

---

### 13.2 Potential refactor trigger

If Plant grows beyond:

- identity + traits + phenology + references

→ it should be split into:

- PlantIdentity
- PlantBiology
- PlantPhenology

(But NOT yet needed)

---

## 14. FINAL STATEMENT

Plant is currently:

> a **well-structured biological definition aggregate with controlled internal submodels**

It is stable, but near the upper limit of acceptable complexity for a single aggregate root.
