# MODULE: PLANT

version: 1.3.0
source-spec: v1.3.0
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
  // [TARGET STATE (Pending Iteration 12)]
  ecological?: {
    edibility: boolean;
    toxicity: 'none' | 'low' | 'high';
    attractsPollinators: boolean;
    invasivePotential: boolean; // Note: Invasiveness depends heavily on local geography
  }
  // [TARGET STATE (Pending Iteration 63)]
  stratum?: 'root' | 'ground_cover' | 'herbaceous' | 'shrub' | 'low_canopy' | 'overstory_canopy' | 'climber';
}
```

#### Meaning

- lifecycle → biological growth pattern
- size → expected physical bounds
- spacingCm → **advisory spatial constraint (NOT enforcement)**
- ecological → **[TARGET STATE (Pending Iteration 12)]** optional attributes used for quick banners and ecological context
- stratum → **[TARGET STATE (Pending Iteration 63)]** optional canopy/strata classification used by the spatial system to bypass geometric 2D overlap warnings in polyculture companion planting guilds (e.g. root layers occupying the same 2D footprint as trellised climbers).

#### Important boundary rule

Spacing is:

> advisory constraint for SpatialSystem, not a rule enforced by Plant

---

### 4.3 Phenology (time behavior model)

#### Sowing `[TARGET STATE (Pending Iteration 30)]`

Encapsulated under `phenology.sowing` as an **optional, structured submodel (PlantSowing)**. For plants that are sterile or only propagated vegetatively (such as Russian Comfrey _Symphytum x uplandicum_ / _Bocking 14_ which has no viable seeds), the `sowing` block can be completely omitted (`null` or `undefined`).

If present, `PlantSowing` comprises:

- `seedsPerHole`: Range (min and max seeds to sow per station)
- `germinationDays`: Range (min and max days for sprouting)
- `seedViabilityYears`: PositiveNumber `[TARGET STATE (Pending Iteration 52)]` (optional average lifespan in years of the seeds)
- `months`: MonthSet (the allowed calendar months for sowing)
- `methods`: Object containing specific sowing methods and their depths:
  - `direct`: SowingMethod (mandatory, containing `depthCm: Range` for direct soil sowing)
  - `nursery`: SowingMethod (optional, containing `depthCm: Range` for starter seedbed cells; **`[TARGET STATE (Pending Iteration 30)]`** - currently named `starter` in the codebase and slated to be renamed to `nursery` in Iteration 30)

Rules:

- Validation is strict at construction time if the `sowing` block is provided.
- `months` must not be empty if `sowing` is present.
- If a plant is sterile or vegetatively-only propagated, the system bypasses `sowing` validation completely.

---

#### Flowering

- `months`: MonthSet
- `pollination` (optional):
  - `type`: PollinationType
  - `agents`: string[] (optional list of animal/insect vectors)

---

#### Harvest

- `months`: MonthSet
- `description` (optional)

---

### 4.4 Knowledge (ecological & propagation reference layer)

The `knowledge` field contains rich agronomic and ecological information (optional, represented by `PlantKnowledge`). This layer does not enforce hard domain constraints, but serves as the reference database for companions, soil profiles, and care routines.

#### 4.4.1 Propagation Knowledge `[TARGET STATE (Pending Iteration 12)]`

Instead of a flat array of keywords, propagation methods are defined as a rich structured object under `knowledge.propagation.methods` where each active propagation technique is mapped by name (e.g., `'division'`, `'cutting'`, `'layering'`, `'seed'`, `'sucker'`, `'grafting'`) to its own biological requirements:

```ts
type PropagationMethodDetails = {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  bestPractices: string[];
  estimatedTimeWeeks?: Range;
};
```

This structured object allows the system to support diverse, multi-method cultivation strategies simultaneously, perfectly mirroring physical gardening reality (e.g., a single shrub variety like Blackberry or Raspberry being propagated via both stem cuttings and root division, while Russian Comfrey is listed with only crown division).

#### 4.4.2 Core Ecological & Soil Knowledge

- `soil`:
  - `ph`: Range (advisory pH tolerance, e.g. `[6.0, 6.8]`)
  - `availableDepthCm`: Range (advisory minimum and maximum soil depth needed)
- `rootSystem`:
  - `type`: fibrous | taproot | tuberous | rhizomatous
  - `depthCm`: Range (advisory root depth)
  - `spreadCm`: Range (advisory root spread)
- `watering`:
  - `frequency`: string (e.g., `'weekly'`)
  - `conditions`: string[]
- `light`:
  - `hoursMin`: number (minimum sun hours needed)
  - `type`: full_sun | partial_shade | full_shade
  - `preference`: string (e.g. `'all_day'`)
- `ecology`:
  - `strategicBenefits`: string[] (list of ecological advantages like "attracts pollinators")
- `resources`: PlantResource[] (rich media and article attachments):
  ```ts
  type PlantResource = {
    type: 'image' | 'video' | 'article';
    url: string;
    title?: string;
    source?: string;
    tags?: string[];
  };
  ```
- `notes`: string[] (general agronomic notes)

#### 4.4.3 Media Storage & Upload Strategy (PlantResource) `[TARGET STATE]`

To prevent RAM saturation on the Node.js API and manage operational costs, binary file uploads (`multipart/form-data`) through the API are strictly prohibited. The system handles media attachments in two phases:

- **Phase 1 (Current State):** The `url` field inside `PlantResource` only accepts external links (e.g., Wikimedia Commons, YouTube, or external blogs). Admins "Bring Your Own URL".
- **Phase 2 `[TARGET STATE]`:** To support native file uploads securely, the system will implement **Presigned URLs via Google Cloud Storage (GCS)**. The frontend will request a temporary signed URL from the API, and upload the binary file directly to the GCP bucket, completely bypassing the Node.js backend.

Rules:

- Optional, may default to empty object.
- Never contains embedded business logic.
- Pure reference layer only.

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

_(Note on Standardization Target State `[TARGET STATE (Pending Iteration 39)]`: Standardizing the Plant lifecycle status to lowercase `status: 'active' | 'removed'` and `deletedAt` to match the global unified soft-deletion pattern across all aggregates is planned as a domain refactoring in Iteration 39)._

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

### 5.4 Social Interactions Invariant `[TARGET STATE (Pending Iteration 29)]`

- Social interactions (Likes and Dislikes) MUST NOT be stored as arrays of user IDs inside the Plant aggregate root or document.
- To prevent write contention, lock bottlenecks under high concurrency, and document size bloat (MongoDB 16MB limit), interactions must be persisted in a separate, dedicated collection (e.g. `plant_social_interactions`).
- They are projected into the `Plant` aggregate strictly as read-only numeric counters (`likesCount`, `dislikesCount`) desensitized from individual user IDs.

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

## 10. QUERY SUPPORT

Plant collection query operations support the global Query System.

---

### 10.1 Find all Plants

Operations for retrieving all plants support unified search criteria.

_Note: For the exact HTTP verbs, status codes, and routing parameters exposing these rules, see **api-layer.md**._

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
