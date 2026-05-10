import type { DeepPartial } from '../../../../shared/domain/patch/interfaces/DeepPartial.js';
import { MonthSet } from '../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../shared/domain/value-objects/Range.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../shared/domain/valueObject/Uuid.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../application/useCases/interfaces/UpdatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type { PlantPrimitives } from '../domain/entities/types/PlantPrimitives.js';
import type { PlantProps } from '../domain/entities/types/PlantProps.js';
import { PlantKnowledge } from '../domain/value-objects/PlantKnowledge.js';
import { PlantLifecycle } from '../domain/value-objects/PlantLifecycle.js';
import { PlantSowing } from '../domain/value-objects/PlantSowing.js';
import type { PlantApiMapper } from './interfaces/PlantApiMapper.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

export const plantApiMapper: PlantApiMapper = {
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
      id: Uuid.create(dto.id),
      identity: dto.identity,
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

  fromUpdateDtoToPrimitivesPatch(
    dto: UpdatePlantDto
  ): DeepPartial<PlantPrimitives> {
    return {
      ...(dto.identity && { identity: mapIdentity(dto.identity) }),
      ...(dto.traits && { traits: mapTraits(dto.traits) }),
      ...(dto.phenology?.sowing && {
        phenology: { sowing: mapSowing(dto.phenology.sowing) }
      }),
      ...(dto.knowledge && { knowledge: dto.knowledge })
    };
  }
};

function mapIdentity(
  identity: UpdatePlantDto['identity']
): DeepPartial<PlantPrimitives['identity']> {
  return {
    ...(identity?.name && {
      name: {
        ...(identity.name.primary !== undefined && {
          primary: identity.name.primary
        }),
        ...(identity.name.aliases && {
          aliases: identity.name.aliases
        })
      }
    }),
    ...(identity?.scientificName !== undefined && {
      scientificName: identity.scientificName
    }),
    ...(identity?.family && {
      family: identity.family
    })
  };
}

function mapTraits(
  traits: UpdatePlantDto['traits']
): DeepPartial<PlantPrimitives['traits']> {
  return {
    ...(traits?.lifecycle && { lifecycle: traits.lifecycle }),
    ...(traits?.spacingCm && { spacingCm: traits.spacingCm }),
    ...(traits?.size && {
      size: {
        ...(traits.size.height && { height: traits.size.height }),
        ...(traits.size.spread && { spread: traits.size.spread })
      }
    })
  };
}

function mapSowing(
  sowing: NonNullable<UpdatePlantDto['phenology']>['sowing']
): DeepPartial<PlantPrimitives['phenology']['sowing']> {
  return {
    ...(sowing?.months && { months: sowing.months }),
    ...(sowing?.seedsPerHole && { seedsPerHole: sowing.seedsPerHole }),
    ...(sowing?.germinationDays && {
      germinationDays: sowing.germinationDays
    }),
    ...(sowing?.methods && {
      methods: {
        ...(sowing.methods?.direct && {
          direct: { depthCm: sowing.methods.direct.depthCm }
        }),
        ...(sowing.methods?.starter && {
          starter: { depthCm: sowing.methods.starter.depthCm }
        })
      }
    })
  };
}
