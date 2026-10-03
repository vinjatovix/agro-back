# Architecture

- Express API
- Layered architecture (Domain / Application / Infrastructure)
- Awilix for dependency injection: automated directory scanning (`src/apps/agroApi/wiring/`) in `PROXY` mode with `strict: true` and 7 explicit values in `src/apps/agroApi/container.ts`
- OpenAPI as contract source of truth

## Existence Invariants

Single-entity lookups across the application enforce a uniform "not found" contract:

**Rule (FR-001)**: Every operation that needs a single entity must decide absence explicitly via `ensureFound()` and report it uniformly through HTTP 404.

**Implementation:**

- **Primary mechanism**: `ensureFound(value, entityName, key, keyName?)` from `src/Contexts/shared/application/utils/ensureFound.ts` → `DomainNotFoundException` → HTTP 404.
- **Sole exception at infrastructure layer**: `MongoCrudRepository.updateWithDiff` when a conditional write matches nothing (same format: `"<Entity> not found: <key>"`).

**Message format:**

- Primary id: `"<Entity> not found: <key>"`
  - Example: `"Bed not found: abc-123"`
- Alternate keys (slug, email): `"<Entity> not found with <keyName>: <key>"`
  - Example: `"User not found with email: user@example.com"`

**Application loaders** (centralise absence predicates):

- `findOwnedActiveBed(bedRepository, id, user)` — loads bed only if exists, not soft-deleted, and user-owned
- `findActivePlant(plantRepository, id, options?: { allowDeleted? })` — loads plant only if exists and (not soft-deleted or `allowDeleted` is true); respects role-based visibility (admin/collaborator see soft-deleted plants)

**Conditional write semantics** (FR-007a):

- `MongoCrudRepository.updateWithDiff` filter = `{ _id } ∪ activeFilter()`
- `MongoBedRepository.activeFilter()` = `{ deleted: { $ne: true } }`
- `MongoPlantRepository.activeFilter()` = `{ status: { $ne: 'deleted' } }`
- `MongoFamilyRepository.activeFilter()` = `{}` (no soft delete)
- Writes on soft-deleted or missing entities throw `DomainNotFoundException`; no upsert.

**Operation inventory** (data-model.md):

- **Enforced**: GetBedById, UpdateBed, DeleteBed, addPlantToBed, GetPlant, UpdatePlant, DeletePlant, GetFamilyById, GetFamilyBySlug, UpdateFamily, UpdatePasswordLocal
- **Exempt** (anti-enumeration or inverse logic):
  - LoginUserLocal, ValidateMail, AuthenticateWithGoogle, RegisterUserLocal (401 generic, create on unknown)
  - CreateBed/Plant/Family (409 on duplicate, 400 on missing referenced)
  - List endpoints (empty collection, never 404)
