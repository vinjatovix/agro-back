# MODULE: PLANT

version: 1.0.0
source-spec: v1.0.0
status: formalized (derived from codebase snapshot)

---

# 1. PURPOSE

The Plant module defines the **biological definition layer** of AgroApp.

It represents a plant as a **species-level aggregate**, not a spatial or temporal instance.

Plant is the **source of agronomic truth** used by:

* PlantInstance (runtime occurrence)
* Knowledge System (ecological context)
* Spatial System (indirect spacing rules)
* Events System (context enrichment)

---

# 2. DOMAIN ROLE

Plant is a **definition aggregate root**.

It is responsible for describing:

* identity (what it is)
* traits (how it behaves biologically)
* phenology (how it develops over time)
* knowledge references (ecological context)

---

# 3. CORE PRINCIPLE

> Plant defines *what a plant is*, not *what happens to it in space or time*

Rules:

* Plant is NOT spatial
* Plant is NOT temporal
* Plant is NOT lifecycle runtime
* Plant is NOT event-driven

---

# 4. INTERNAL STRUCTURE

Plant is composed of 4 core subdomains:

## 4.1 Identity

```ts
{
  name: {
    primary: string;
    aliases?: string[];
  };
  scientificName?: string;
  familyId: string;
}
```

### Rules

* primary name is required semantic identifier
* aliases are optional semantic enrichments
* familyId links to taxonomy layer (external bounded context)

---

## 4.2 Traits (Biological constraints)

```ts
{
  lifecycle: PlantLifecycle;
  size: {
    height: Range;
    spread: Range;
  };
  spacingCm: Range;
}
```

### Meaning

* lifecycle → biological growth pattern
* size → expected physical bounds
* spacingCm → **indirect spatial constraint (NOT enforcement)**

### Important boundary rule

Spacing is:

> advisory constraint for SpatialSystem, not a rule enforced by Plant

---

## 4.3 Phenology (time behavior model)

### Sowing

Encapsulated as:

* seedsPerHole
* germinationDays
* months
* methods (direct / starter)

👉 This is a **structured sub-aggregate (PlantSowing)**

Rules:

* validation is strict at construction time
* months must not be empty
* depth constraints must exist

---

### Flowering

* months
* pollination (optional)

---

### Harvest

* months
* description (optional)

---

## 4.4 Knowledge (ecological reference layer)

```ts
knowledge?: PlantKnowledge
```

Rules:

* optional
* may default to empty object
* never embedded logic
* pure reference layer only

---

# 5. BEHAVIOR

## 5.1 Lifecycle control

Plant supports soft deletion:

```ts
markAsDeleted()
```

Rules:

* idempotent
* sets status = DELETED
* sets deletedAt timestamp

---

## 5.2 Validation invariants

### Status consistency

* ACTIVE → cannot have deletedAt
* DELETED → must have deletedAt

This is enforced in constructor.

---

## 5.3 Immutability principle

* props are deeply frozen
* domain state cannot be mutated externally
* only controlled mutations via explicit methods

---

# 6. DOMAIN RULES

## 6.1 Allowed dependencies

Plant MAY depend on:

* Value Objects (Range, MonthSet, Metadata)
* Sub-aggregates (PlantSowing)
* Knowledge references

---

## 6.2 Forbidden dependencies

Plant MUST NOT depend on:

* API layer
* persistence layer
* spatial logic
* event system
* validation middleware

---

# 7. RELATIONSHIP MODEL

## 7.1 Plant → PlantInstance

* Plant defines blueprint
* PlantInstance is runtime instantiation

No bidirectional coupling.

---

## 7.2 Plant → Knowledge System

* Plant references knowledge IDs
* Knowledge system remains external

---

## 7.3 Plant → Spatial System

* Plant defines spacingCm (advisory)
* Spatial system enforces actual placement

---

## 7.4 Plant → Events (indirect future link)

* Plant does not consume events
* Events may reference Plant metadata

---

# 8. SERIALIZATION CONTRACT

Plant is not self-serializable.

All transformations must go through:

* PlantMapper
* DTO layer
* Repository mapping layer

---

# 9. MAPPING STRATEGY

From codebase analysis:

## 9.1 PlantMapper responsibilities

* Plant ↔ PlantPrimitives
* DTO → Plant
* Patch → Partial PlantPrimitives
* Knowledge mapping delegation

---

## 9.2 Critical rule

Mapper is the **only place where structural translation is allowed**

Plant must remain pure.

---

# 10. CURRENT ARCHITECTURAL OBSERVATIONS

From your implementation:

## 10.1 Strengths

* strong value object usage
* clear separation of phenology subdomain
* good immutability via deepFreeze
* explicit validation rules
* proper aggregate boundary usage

---

## 10.2 Emerging risks

### 1. Plant is becoming “semantic hub”

It contains:

* biology
* partial lifecycle
* knowledge reference
* deletion lifecycle
* validation rules

risk: gradual expansion into god-aggregate

---

### 2. Phenology is well-designed but heavy

PlantSowing is already:

* mini-aggregate inside aggregate
* full validation + serialization + factory

acceptable, but must remain isolated

---

### 3. Knowledge coupling is still loose

* PlantKnowledge is embedded but optional
* risk of hidden coupling increasing over time

---

# 11. ANTI-PATTERNS

Forbidden in Plant:

* spatial logic
* event handling
* persistence awareness
* DTO awareness
* business workflows
* cross-aggregate mutation

---

# 12. EVOLUTION PATH

## 12.1 Likely future stabilizations

* PlantLifecycle may become full state machine module
* Phenology may split further (GrowthModel module)
* Knowledge may become external query system only

---

## 12.2 Potential refactor trigger

If Plant grows beyond:

* identity + traits + phenology + references

→ it should be split into:

* PlantIdentity
* PlantBiology
* PlantPhenology

(But NOT yet needed)

---

# 13. FINAL STATEMENT

Plant is currently:

> a **well-structured biological definition aggregate with controlled internal submodels**

It is stable, but near the upper limit of acceptable complexity for a single aggregate root.
