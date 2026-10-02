import { Range } from '../../../../shared/domain/value-objects/Range.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../application/useCases/interfaces/UpdatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantChanges,
  PlantFloweringChanges,
  PlantHarvestChanges,
  PlantIdentityChanges,
  PlantPhenologyChanges,
  PlantProps,
  PlantSowingChanges,
  PlantTraitsChanges
} from '../domain/entities/types/index.js';
import { createPlantId } from '../domain/PlantId.js';
import {
  PlantFlowering,
  PlantHarvest,
  PlantIdentity,
  PlantLifecycle,
  PlantPhenology,
  PlantSowing
} from '../domain/value-objects/index.js';
import type { PlantInputMapper } from './interfaces/PlantInputMapper.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

function buildNameChanges(
  name: NonNullable<NonNullable<UpdatePlantDto['identity']>['name']>
): NonNullable<PlantIdentityChanges['name']> {
  const result: NonNullable<PlantIdentityChanges['name']> = {};
  if (name.primary !== undefined) result.primary = name.primary;
  if (name.aliases !== undefined) {
    result.aliases = name.aliases;
  }
  return result;
}

function buildIdentityChanges(dto: UpdatePlantDto): PlantIdentityChanges {
  const identity: PlantIdentityChanges = {};
  const src = dto.identity;
  if (!src) return identity;
  if (src.name) {
    const name = buildNameChanges(src.name);
    if (Object.keys(name).length) identity.name = name;
  }
  // Passed as sent: `PlantIdentity` trims them and rejects a blank one.
  if (src.scientificName !== undefined)
    identity.scientificName = src.scientificName;
  if (src.family !== undefined) identity.family = src.family;
  return identity;
}

function buildTraitsChanges(dto: UpdatePlantDto): PlantTraitsChanges {
  const traits: PlantTraitsChanges = {};
  const src = dto.traits;
  if (!src) return traits;
  if (src.lifecycle) traits.lifecycle = src.lifecycle;
  if (src.spacingCm !== undefined) traits.spacingCm = src.spacingCm;
  if (src.size) {
    const size: PlantTraitsChanges['size'] = {};
    if (src.size.height) size.height = src.size.height;
    if (src.size.spread) size.spread = src.size.spread;
    if (Object.keys(size).length) traits.size = size;
  }
  return traits;
}

function buildSowingMethods(
  s: NonNullable<NonNullable<UpdatePlantDto['phenology']>['sowing']>
): NonNullable<PlantSowingChanges['methods']> {
  const methods: NonNullable<PlantSowingChanges['methods']> = {};
  if (s.methods?.direct) methods.direct = s.methods.direct;
  if (s.methods?.starter !== undefined) methods.starter = s.methods.starter;
  return methods;
}

function buildSowingChanges(
  dto: UpdatePlantDto
): PlantSowingChanges | undefined {
  if (!dto.phenology?.sowing) return undefined;
  const s = dto.phenology.sowing;
  const sowing: PlantSowingChanges = {};
  if (s.months) sowing.months = s.months;
  if (s.seedsPerHole) sowing.seedsPerHole = s.seedsPerHole;
  if (s.germinationDays) sowing.germinationDays = s.germinationDays;
  if (s.methods) {
    const methods = buildSowingMethods(s);
    if (Object.keys(methods).length) sowing.methods = methods;
  }
  return Object.keys(sowing).length ? sowing : undefined;
}

function buildFloweringChanges(
  dto: UpdatePlantDto
): PlantFloweringChanges | undefined {
  if (!dto.phenology?.flowering) return undefined;
  const f = dto.phenology.flowering;
  const flowering: PlantFloweringChanges = {};
  if (f.months) flowering.months = f.months;
  if (f.pollination === null) flowering.pollination = null;
  else if (f.pollination) {
    const pollination: NonNullable<PlantFloweringChanges['pollination']> = {};
    if (f.pollination.types) pollination.types = f.pollination.types;
    if (f.pollination.agents !== undefined)
      pollination.agents = f.pollination.agents;
    if (Object.keys(pollination).length) flowering.pollination = pollination;
  }
  return Object.keys(flowering).length ? flowering : undefined;
}

function buildHarvestChanges(
  dto: UpdatePlantDto
): PlantHarvestChanges | undefined {
  if (!dto.phenology?.harvest) return undefined;
  const h = dto.phenology.harvest;
  const harvest: PlantHarvestChanges = {};
  if (h.months) harvest.months = h.months;
  if (h.description !== undefined) harvest.description = h.description;
  return Object.keys(harvest).length ? harvest : undefined;
}

function buildPhenologyChanges(
  dto: UpdatePlantDto
): PlantPhenologyChanges | undefined {
  if (!dto.phenology) return undefined;
  const phenology: PlantPhenologyChanges = {};
  const sowing = buildSowingChanges(dto);
  if (sowing) phenology.sowing = sowing;
  const flowering = buildFloweringChanges(dto);
  if (flowering) phenology.flowering = flowering;
  const harvest = buildHarvestChanges(dto);
  if (harvest) phenology.harvest = harvest;
  return Object.keys(phenology).length ? phenology : undefined;
}

export const plantInputMapper: PlantInputMapper = {
  fromCreateDto(dto: CreatePlantDto, user = 'system'): Plant {
    const { sowing, flowering, harvest } = dto.phenology;
    const phenology = new PlantPhenology({
      sowing: PlantSowing.fromPrimitives(sowing),
      flowering: flowering
        ? PlantFlowering.fromPrimitives(flowering)
        : PlantFlowering.never(),
      harvest: harvest
        ? PlantHarvest.fromPrimitives(harvest)
        : PlantHarvest.never()
    });

    const knowledge = plantKnowledgeMapper.fromPrimitives(dto.knowledge);

    const props: PlantProps = {
      id: createPlantId(dto.id),
      identity: PlantIdentity.fromPrimitives(dto.identity),
      traits: {
        lifecycle: PlantLifecycle.from(dto.traits.lifecycle),
        size: {
          height: Range.fromPrimitives(dto.traits.size.height),
          spread: Range.fromPrimitives(dto.traits.size.spread)
        },
        spacingCm: Range.fromPrimitives(dto.traits.spacingCm)
      },
      phenology,
      knowledge,
      metadata: Metadata.create(user)
    };

    return new Plant(props);
  },

  toChanges(dto: UpdatePlantDto): PlantChanges {
    const result: PlantChanges = {};

    if (dto.identity) {
      const identity = buildIdentityChanges(dto);
      if (Object.keys(identity).length) result.identity = identity;
    }

    if (dto.traits) {
      const traits = buildTraitsChanges(dto);
      if (Object.keys(traits).length) result.traits = traits;
    }

    const phenology = buildPhenologyChanges(dto);
    if (phenology) result.phenology = phenology;

    if (dto.knowledge) result.knowledge = dto.knowledge;

    return result;
  }
};
