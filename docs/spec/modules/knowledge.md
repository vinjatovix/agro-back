# MODULE: KNOWLEDGE SYSTEM

version: 1.3.0
source-spec: v1.3.0
status: stable

---

## 1. PURPOSE

The Knowledge System represents the ecological and agronomic intelligence layer of AgroApp.

It is responsible for modeling agricultural relationships, external biological agents, taxonomic datasets, and environmental interactions that influence plants.

It is intentionally **decoupled from core domain entities** (Plant, Bed, PlantInstance).

---

## 2. CORE PRINCIPLE

Knowledge is a **shared ecological dataset**, not ownership data.

Rules:

- NOT part of Plant aggregate
- NOT part of Bed aggregate
- referenced via IDs only
- globally consistent across the system
- extensible without affecting domain invariants

---

## 3. KNOWLEDGE ENTITIES

### 3.1 Anomaly

Unifies pests, diseases (pathogens), physiological disorders, and weeds into a single diagnostic concept.

#### Fields

- id (UUID)
- name
- classification: pest | pathogen | disorder | weed
- description
- symptoms: string[]
- causes: string[]
- affectedPlants: Plant IDs (UUIDs)
- treatments: GardenInput IDs (UUIDs) `[TARGET STATE (Pending Iteration 36)]` (models the therapeutic relationship directly at the document level)

#### Rules

- can affect multiple plants
- symptoms are descriptive only
- no behavioral domain logic

---

### 3.2 GardenInput

Unifies organic remedies, ecological treatments, repellents, bio-stimulants, and organic/permacultural fertilizers (including Korean Natural Farming and JADAM preparations).

#### Fields

- `id`: UUID (value object)
- `name`: string
- `type`: `nutrition` | `defense`
- `subType`: `fungicide` | `insecticide` | `repellent` | `fertilizer` | `bio-stimulant`
- `nutritionalProfile`: (optional object mapping N-P-K percentages or ratios, and lists of micro-elements like Calcium (Ca), Iron (Fe), Magnesium (Mg), Silicon (Si))
- `recipe`: (optional object representing a home-made preparation)
  - `ingredients`: string[] (list of required materials/plants, e.g. "compost", "fresh nettles")
  - `fermentationType`: `alluring` | `aerobic` | `anaerobic` | `none`
  - `preparationTimeDays`: integer (time needed for fermentation or infusion)
  - `instructions`: string[] (step-by-step preparation tutorial)
- `application`: (optional object with dosage instructions)
  - `dilutionRatio`: string (e.g., "1:10", "1:500")
  - `method`: `foliar` | `irrigation` | `soil`
  - `frequencyDays`: integer (how often to apply)
- `safetyWarnings`: string[] (optional safety instructions)

#### 3.2.1 `[TARGET STATE (Pending Iteration 37)]` Organic Dilution Calculator Service

- **Purpose:** A mobile-friendly utility to help farmers calculate precise input-to-water ratios in the field, preventing calculation mistakes that lead to under-dosing (ineffective treatment) or over-dosing (phytotoxicity/crop leaf burn).
- **Service Inputs:**
  - `sprayTankVolumeLiters`: number (the volume of the farmer's knapsack sprayer or irrigation tank, e.g., 15 L or 20 L).
  - `dilutionRatio`: string (retrieved from the target `GardenInput` or customized, parsed as `1:N`, e.g., `1:500` for JADAM Microorganism Solution - JMS).
- **Service Outputs:**
  - `inputVolumeMl`: number (the exact dosage of the organic input required, in milliliters).
  - `waterVolumeLiters`: number (the exact volume of water to mix, in liters).
- **Calculation Formulation:**
  - Given a dilution ratio of `1:N` where `N` is the dilution factor:
    $$\text{inputVolumeMl} = \frac{\text{sprayTankVolumeLiters} \times 1000}{N}$$
    $$\text{waterVolumeLiters} = \text{sprayTankVolumeLiters} - \left(\frac{\text{inputVolumeMl}}{1000}\right)$$
  - _Example:_ For a 15 L spray tank and a 1:500 dilution:
    - $\text{inputVolumeMl} = \frac{15 \times 1000}{500} = 30\text{ mL}$ of preparation.
    - $\text{waterVolumeLiters} = 15 - 0.03 = 14.97\text{ L}$ of water.

---

---

### 3.3 Plant Attributes

Represents ecological or functional properties of plants.

#### Categories

- benefits
- strategies

#### Examples

- attract_pollinators
- trap_crop
- nematode_control

---

### 3.6 Plant Relations Graph

All biological and ecological companion interactions between plant species are now defined and managed under their own dedicated specification:

> See **Module: Plant Relations (plant-relation.md)**

---

### 3.7 Family Taxonomy

All botanical classification units and taxonomical metadata are defined and managed under their own dedicated specification:

> See **Module: Family (family.md)**

---

## 4. SYSTEM BOUNDARIES

### 4.1 What Knowledge System DOES

- models ecological relationships (via Plant Relations integration)
- provides agronomic intelligence
- supports decision-making systems
- references taxonomic datasets (e.g. Family)
- feeds simulation layers

---

### 4.2 What Knowledge System DOES NOT DO

- does not enforce planting rules
- does not validate Plant aggregates
- does not manage persistence of core aggregates
- does not handle spatial placement
- does not execute events

---

## 5. INTEGRATION MODEL

### 5.1 Plant ↔ Knowledge

Plants reference knowledge via IDs:

```ts
plant.knowledgeRefs = {
  anomalies: string[], // references to Anomaly IDs
  inputs: string[],    // references to GardenInput IDs
  attributes: string[]
}
```

And taxonomy:

```ts
plant.identity.family → Family.id
```

No embedded knowledge objects allowed.

---

### 5.2 Events ↔ Knowledge

Events may reference:

- anomalies
- inputs
- family (optional contextual enrichment)

But NEVER embed logic from them.

---

### 5.3 Spatial System ↔ Knowledge

Indirect influence only:

- plant relations may affect recommended spacing
- family taxonomy may influence grouping heuristics (future)
- no direct enforcement

---

## 6. EXTENSIBILITY RULES

New knowledge types MUST:

- be independent modules
- NOT modify Plant aggregate
- NOT introduce circular dependencies

Allowed extensions:

- pollinators
- soil microbiome models
- climate interaction datasets
- expanded taxonomy layers

---

## 7. CURRENT STATUS

> ⚠️ **IMPORTANT NOTE ON PRODUCTION CODEBASE:**
> Except for the **Family Taxonomy** (which is fully implemented and integrated as a domain aggregate), the components of the Knowledge System (Anomalies, GardenInputs, and the Relation Graph) are currently **mock data only** (located in the `mock_data/` directory) and are NOT yet implemented as production domain classes. They are planned for Phase 3 & Phase 4 of the system's roadmap.

### Implemented

- Family taxonomy (integrated as a domain aggregate and fully operational)
- Anomaly, GardenInput models (JSON mock datasets only)
- Plant attributes (basic concept)

### Pending

- full normalization of IDs across knowledge entities
- consistent schema enforcement
- separation from domain types currently leaking
- validation layer for knowledge integrity
- therapeutic mapping execution (`treatments` list resolution) `[TARGET STATE (Pending Iteration 36)]`
- Organic Dilution Calculator Service implementation `[TARGET STATE (Pending Iteration 37)]`

---

## 8. ANTI-PATTERNS

The following are forbidden:

- embedding knowledge inside Plant aggregate
- using knowledge for domain validation
- coupling knowledge with persistence schema
- enforcing spatial rules through knowledge graph
- duplicating knowledge inside events or beds
- turning Family into behavioral domain logic

---

## 9. FUTURE EVOLUTION

Planned extensions:

- recommendation engine
- ecological simulation system
- seasonal behavior modeling
- pest outbreak prediction
- AI-assisted planting planner
- expanded taxonomic hierarchy (genus, subfamily, etc.)

---

## 10. FINAL NOTE

The Knowledge System is the **intelligence layer of AgroApp**.

It must remain:

- independent
- extensible
- non-invasive to core domain logic

Family taxonomy and Plant Relations act as global reference datasets, but are implemented as their own independent Domain Aggregate Roots.
