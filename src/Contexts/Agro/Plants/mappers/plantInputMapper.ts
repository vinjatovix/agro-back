import { MonthSet } from '../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../shared/domain/value-objects/Range.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../application/useCases/interfaces/UpdatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantChanges,
  PlantIdentityChanges,
  PlantSowingChanges,
  PlantTraitsChanges
} from '../domain/entities/types/index.js';
import type { PlantProps } from '../domain/entities/types/PlantProps.js';
import { createPlantId } from '../domain/PlantId.js';
import { PlantKnowledge } from '../domain/value-objects/PlantKnowledge.js';
import { PlantLifecycle } from '../domain/value-objects/PlantLifecycle.js';
import { PlantSowing } from '../domain/value-objects/PlantSowing.js';
import type { PlantInputMapper } from './interfaces/PlantInputMapper.js';
import { plantIdentityMapper } from './plantIdentityMapper.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

function buildNameChanges(
  name: NonNullable<NonNullable<UpdatePlantDto['identity']>['name']>
): { primary?: string; aliases?: string[] } {
  const result: { primary?: string; aliases?: string[] } = {};
  if (name.primary !== undefined) result.primary = name.primary.trim();
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
  // Trimmed but never dropped: an empty value reaches the domain, which rejects it.
  if (src.scientificName !== undefined)
    identity.scientificName = src.scientificName.trim();
  if (src.family !== undefined) identity.family = src.family.trim();
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
  if (s.methods?.starter) methods.starter = s.methods.starter;
  return methods;
}

function buildPhenologyChanges(
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

export const plantInputMapper: PlantInputMapper = {
  fromCreateDto(dto: CreatePlantDto, user = 'system'): Plant {
    const phenology = {
      sowing: PlantSowing.fromPrimitives(dto.phenology.sowing),
      flowering: {
        months: MonthSet.fromArray(dto.phenology.flowering.months),
        ...(dto.phenology.flowering.pollination && {
          pollination: dto.phenology.flowering.pollination
        })
      },
      harvest: {
        months: MonthSet.fromArray(dto.phenology.harvest.months),
        ...(dto.phenology.harvest.description && {
          description: dto.phenology.harvest.description
        })
      }
    };

    const knowledge = dto.knowledge
      ? plantKnowledgeMapper.fromPrimitives(dto.knowledge)
      : PlantKnowledge.empty();

    const props: PlantProps = {
      id: createPlantId(dto.id),
      identity: plantIdentityMapper.fromPrimitives(dto.identity),
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

    return Plant.create(props);
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

    const sowing = buildPhenologyChanges(dto);
    if (sowing) result.phenology = { sowing };

    if (dto.knowledge) result.knowledge = dto.knowledge;

    return result;
  }
};
