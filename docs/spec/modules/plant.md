# MODULE: PLANT

version: 1.4.0
source-spec: v1.4.0
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
  scientificName: string;
  family: string;
}
```

Rules:

- primary name is required semantic identifier
- `scientificName` is required on every plant (decided 2026-10-02): the contract publishes it, so the `normalize-plant-knowledge` migration stops on a stored plant without one instead of inventing it
- aliases are optional semantic enrichments
- enforced by the `PlantIdentity` value object (decided 2026-10-02): its constructor trims `name.primary`, `scientificName` and `family`, rejects them blank (`InvalidArgumentException`, `400`) and drops empty aliases, on create, load and update alike
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
  // [TARGET STATE (Pending [Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod))]
  ecological?: {
    edibility: boolean;
    toxicity: 'none' | 'low' | 'high';
    attractsPollinators: boolean;
    invasivePotential: boolean; // Note: Invasiveness depends heavily on local geography
  }
  // [TARGET STATE (Pending [Iteration 63](../../roadmap.md#iteration-63-bypass-2d-collisions-for-complementary-vertical-strata))]
  stratum?: 'root' | 'ground_cover' | 'herbaceous' | 'shrub' | 'low_canopy' | 'overstory_canopy' | 'climber';
}
```

#### Meaning

- lifecycle → biological growth pattern
- size → expected physical bounds
- spacingCm → **advisory spatial constraint (NOT enforcement)**
- ecological → **[TARGET STATE (Pending [Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod))]** optional attributes used for quick banners and ecological context
- stratum → **[TARGET STATE (Pending [Iteration 63](../../roadmap.md#iteration-63-bypass-2d-collisions-for-complementary-vertical-strata))]** optional canopy/strata classification used by the spatial system to bypass geometric 2D overlap warnings in polyculture companion planting guilds (e.g. root layers occupying the same 2D footprint as trellised climbers).

#### Important boundary rule

Spacing is:

> advisory constraint for SpatialSystem, not a rule enforced by Plant

---

### 4.3 Phenology (time behavior model)

#### Sowing `[TARGET STATE (Pending [Iteration 35](../../roadmap.md#iteration-35-make-plant-sowing-block-optional))]`

Encapsulated under `phenology.sowing` as an **optional, structured submodel (PlantSowing)**. For plants that are sterile or only propagated vegetatively (such as Russian Comfrey _Symphytum x uplandicum_ / _Bocking 14_ which has no viable seeds), the `sowing` block can be completely omitted (`null` or `undefined`).

If present, `PlantSowing` comprises:

- `seedsPerHole`: Range (min and max seeds to sow per station)
- `germinationDays`: Range (min and max days for sprouting)
- `seedViabilityYears`: PositiveNumber `[TARGET STATE (Pending [Iteration 52](../../roadmap.md#iteration-52-implement-seedbatch-aggregate-and-repository))]` (optional average lifespan in years of the seeds)
- `months`: MonthSet (the allowed calendar months for sowing)
- `methods`: Object containing specific sowing methods and their depths:
  - `direct`: SowingMethod (mandatory, containing `depthCm: Range` for direct soil sowing)
  - `nursery`: SowingMethod (optional, containing `depthCm: Range` for starter seedbed cells; **`[TARGET STATE (Pending [Iteration 35](../../roadmap.md#iteration-35-make-plant-sowing-block-optional))]`** - currently named `starter` in the codebase and slated to be renamed to `nursery` in [Iteration 35](../../roadmap.md#iteration-35-make-plant-sowing-block-optional))

Rules:

- Validation is strict at construction time if the `sowing` block is provided.
- `months` must not be empty if `sowing` is present.
- If a plant is sterile or vegetatively-only propagated, the system bypasses `sowing` validation completely.

---

#### Flowering

Value object `PlantFlowering`.

- `months`: MonthSet (empty for a plant that does not flower in a yearly cycle). An empty `months` may still carry a `pollination`: bamboos (`Fargesia`) flower once every few decades and are wind-pollinated (decided 2026-10-02).
- `pollination` (optional), value object `Pollination`:
  - `types`: PollinationType[] (`insect`, `wind`, `self`, `water`, `bird`, `bat`), at least one and no repeats; a plant may be pollinated in several ways (tomato: `self` helped by bumblebees, `insect`). Decided 2026-10-02 (it was a single `type`).
  - `agents`: string[] (optional list of animal vectors); only with an `insect`, `bird` or `bat` type; an empty list is no agents
  - A plant that is not pollinated has no `pollination`: plants that reproduce by spores (horsetails, with a `spores` propagation method; their `months` are those of the spore-bearing stems), sterile hybrids, or plants that do not flower in cultivation. `spore` and `none` were removed from `PollinationType` (decided 2026-10-02): they are not ways of pollinating.

---

#### Harvest

Value object `PlantHarvest`.

- `months`: MonthSet (empty for a plant that is not harvested)
- `description` (optional; trimmed and never blank when given, decided 2026-10-02)

Every plant is sown, but not every plant flowers or is harvested: on create, `phenology.flowering` and `phenology.harvest` may be left out and are stored with no months (decided 2026-10-02). The three sections form the `PlantPhenology` value object, whose `update(changes)` applies a `PATCH`.

---

### 4.4 Knowledge (ecological & propagation reference layer)

The `knowledge` field contains rich agronomic and ecological information (represented by `PlantKnowledge`, required in the domain state since 2026-10-02; a plant stored without `knowledge` is loaded as `PlantKnowledge.empty()`), so mutation methods and mappers need no "absent knowledge" fallback. This layer does not enforce hard domain constraints, but serves as the reference database for companions, soil profiles, and care routines.

#### 4.4.1 Propagation Knowledge `[TARGET STATE (Pending [Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod))]`

Instead of a flat array of keywords, propagation methods are defined as a rich structured object under `knowledge.propagation.methods` where each active propagation technique is mapped by name (e.g., `'division'`, `'cutting'`, `'layering'`, `'seed'`, `'sucker'`, `'grafting'`) to its own biological requirements.

**Current state (Iteration 12):** on `POST` and `PATCH`, method names must be camelCase letters (`^[a-z][a-zA-Z]*$`), because they become storage paths; any other name returns `400`. Stored names that were not camelCase (`leaf_cutting`, `root cutting`, `air_layering`) were renamed by the `normalize-plant-knowledge` migration. Restricting them to a closed list of known techniques is still pending.

```ts
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

type PropagationMethodDetails = {
  seasons?: Season[]; // non-empty, no repeats
  bestPractices?: string[];
  estimatedTimeWeeks?: Range;
};
```

A period that spans several seasons is listed season by season (e.g. "autumn to early spring" is `['autumn', 'winter', 'spring']`, "year round" is all four). Pruning entries use the same `seasons` list (`knowledge.pruning[].seasons`). A season cannot be repeated in a list: `PlantKnowledge` rejects it (`400`) and the contract publishes `uniqueItems` (decided 2026-10-02). Both replaced a single `season` value, which could not express those periods (decided 2026-10-02). A pruning entry's `frequencyPerYear` must be above zero (`0.5` is once every two years): `PlantKnowledge` rejects `0` or a negative value (`400`) and the contract publishes it (`minimum: 0`, `exclusiveMinimum`) (decided 2026-10-02).

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
  - `hoursMin`: number (minimum sun hours needed), from 0 to 24: `PlantKnowledge` rejects any other value (`400`) and the contract publishes it (`minimum`, `maximum`) (decided 2026-10-02)
  - `type`: full_sun | partial_shade | full_shade
  - `preference`: string (e.g. `'all_day'`)
- Required labels are all treated as `rootSystem.type` (decided 2026-10-02): `rootSystem.type`, `watering.frequency`, `light.type`, `pruning[].type`, `pruning[].intensity` and `resources[].type` are trimmed and never blank, in the Zod schema (create and `PATCH`), in `PlantKnowledge`/`RootSystem` (`400`) and in the contract (`RequiredShortText`).
- `ecology`:
  - `strategicBenefits`: string[] (list of ecological advantages like "attracts pollinators")
  - An `ecology` left without fields (e.g. after `strategicBenefits: null`) is removed, not stored as `{}` (decided 2026-10-02).
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

- **Phase 1 (Current State):** The `url` field inside `PlantResource` only accepts external links (e.g., Wikimedia Commons, YouTube, or external blogs). Admins "Bring Your Own URL". Only absolute `http(s)` URLs are accepted (decided 2026-10-02): other schemes such as `javascript:` or `data:` would become a stored XSS wherever the frontend renders the link.
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
markAsDeleted(user);
```

Rules:

- idempotent at domain level (an already deleted plant is a silent no-op, audit data untouched)
- sets status = DELETED
- sets deletedAt timestamp
- records the deleting user as `metadata.updatedBy`, with `metadata.updatedAt` equal to `deletedAt`
- at HTTP level `DELETE /plants/:id` requires `If-Match: "<version>"` (outdated → `412`, missing → `428`). A repeated `DELETE` returns `404` instead of `204` because the use case only loads active plants; it remains idempotent per RFC 9110 §9.2.2 because server state is identical
- `GET /plants` and `GET /plants/:id` show deleted plants only to admins and collaborators (`canSeeDeletedPlants`); for everyone else the listing adds `status: { eq: ACTIVE }` to the filter, which `PlantQueryMapper` translates to the `status` field (`findAll` does not apply `activeFilter()`)
- **Read path (Iteration 18)**: `GetPlant` and `ListPlants` depend on the read port `PlantReadRepository` (`application/queries/`), not on `PlantRepository`; they return `PlantReadView` (plain stored data) and never build a `Plant`. The visibility rule above is unchanged. Write use cases keep loading the aggregate (persistence.md §5.8.8)

---

_(Note on Standardization Target State `[TARGET STATE (Pending [Iteration 21](../../roadmap.md#iteration-21-standardize-soft-deletion-on-plant-aggregate))]`: Standardizing the Plant lifecycle status to lowercase `status: 'active' | 'removed'` and `deletedAt` to match the global unified soft-deletion pattern across all aggregates is planned as a domain refactoring in [Iteration 21](../../roadmap.md#iteration-21-standardize-soft-deletion-on-plant-aggregate))._

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

### 5.4 Aggregate mutation methods (Iterations 7 & 8)

`Plant` exposes four explicit mutation methods, each receiving the acting user's username:

- `updateIdentity(changes, user)` — updates `name.primary`, `name.aliases`, `scientificName`, `family` through `PlantIdentity.update`; text fields trimmed, empty after trim → `InvalidArgumentException` (`400`); `scientificName`/`family` cannot be `null`; aliases trimmed with empty entries dropped, `aliases: null` removes them; ranges must be objects, aliases must be strings
- `updateTraits(changes, user)` — updates trait fields
- `updatePhenology(changes, user)` — updates phenology fields through `PlantPhenology.update`; `null` removes `sowing.methods.starter`, `flowering.pollination`, `flowering.pollination.agents` and `harvest.description`. Pollination agents alone keep the stored types; on a plant without pollination they are rejected (`pollination.types` is required). `pollination.types` replaces the stored list; the agents are kept while an `insect`, `bird` or `bat` type remains and dropped otherwise. Repeated types or agents without an animal type → `400`. A blank `harvest.description` → `400`
- `updateKnowledge(changes, user)` — updates knowledge fields; `rootSystem` cannot be cleared with `null` (`rootSystem: null` → `400`). Object sections (`soil`, `rootSystem`, `watering`, `light`, propagation methods) merge key by key and ranges merge by bound. A section or range created from scratch must carry its required fields (both range bounds, `rootSystem.type`, `watering.frequency`, `light.hoursMin` and `light.type`); no default values are filled in. `propagation` and `ecology` without any field to apply (e.g. `{}`) keep the current value, so they neither create an empty section nor bump `version`. `null` removes `watering`, `watering.conditions`, `light.preference`, `pruning`, `ecology`, `ecology.strategicBenefits`, `resources`, `notes`, one propagation method (`methods.<name>: null`) or its `seasons`, `estimatedTimeWeeks` and `bestPractices`; `soil`, `rootSystem`, `light`, `propagation` and their required fields reject `null` (`400`)

**PATCH semantics (decided 2026-10-02):** JSON Merge Patch (RFC 7396): an absent field is kept, `null` removes an optional field, and required fields reject `null`. Only the clearable fields are `nullable` in the Zod schema and in the OpenAPI `UpdatePlant`/`UpdatePlantKnowledge`; the removal reaches Mongo as a `$unset` through the repository diff. An empty body `{}` is a valid patch that changes nothing (decided 2026-10-02, as for Families): `If-Match` is still checked, so an outdated version answers `412`, and the version is not bumped; a missing body answers `400` at `body`.

All methods: throw `DomainConflictException` on a soft-deleted plant; validate before mutating (atomic); `identity.scientificName` is never `null`; refresh `updatedAt`/`updatedBy` only when their own section really changed (domain-core.md Sec. 5.2), so in a request touching several sections the last real change sets the audit data. `UpdatePlant` returns the in-memory plant after `syncVersion` (1 read + 1 write, plus the family `exists` check when `identity.family` is sent and differs from the current one).

---

### 5.4 Social Interactions Invariant `[TARGET STATE (Pending [Iteration 34](../../roadmap.md#iteration-34-project-social-interaction-counters-on-plant))]`

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

- PlantKnowledge is embedded but optional (becomes required in the domain state in [Iteration 12](../../roadmap.md#iteration-12-migrate-plants-endpoints-to-zod))
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

- PlantIdentity (done 2026-10-02)
- PlantBiology
- PlantPhenology (done 2026-10-02)

(`PlantBiology` NOT yet needed)

---

## 14. FINAL STATEMENT

Plant is currently:

> a **well-structured biological definition aggregate with controlled internal submodels**

It is stable, but near the upper limit of acceptable complexity for a single aggregate root.
