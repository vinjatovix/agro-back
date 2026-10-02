import { Range } from '../../../../shared/domain/value-objects/index.js';
import { Metadata } from '../../../shared/domain/valueObject/index.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantKnowledgePrimitives,
  PlantPrimitives,
  PlantProps
} from '../domain/entities/types/index.js';
import { createPlantId } from '../domain/PlantId.js';
import {
  PlantIdentity,
  PlantKnowledge,
  PlantLifecycle,
  PlantPhenology
} from '../domain/value-objects/index.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

export interface PlantMapper {
  toPrimitives(plant: Plant): PlantPrimitives;
  fromPrimitives(primitives: PlantPrimitives): Plant;
  fromCreateDtoToDomain(dto: CreatePlantDto, user: string): Plant;
}

export const plantDomainMapper = {
  toPrimitives(plant: Plant): PlantPrimitives {
    const phenology = plant.phenology.toPrimitives();

    const knowledge = plantKnowledgeMapper.toPrimitives(plant.knowledge);

    return {
      id: plant.id,
      identity: plant.identity.toPrimitives(),
      traits: {
        lifecycle: plant.traits.lifecycle.getValue(),
        size: {
          height: plant.traits.size.height.toPrimitives(),
          spread: plant.traits.size.spread.toPrimitives()
        },
        spacingCm: plant.traits.spacingCm.toPrimitives()
      },
      phenology,
      knowledge,
      metadata: plant.metadata.toPrimitives(),
      status: plant.status,
      deletedAt: plant.deletedAt ? plant.deletedAt.toISOString() : null,
      version: plant.version
    };
  },

  fromPrimitives(primitives: PlantPrimitives): Plant {
    const phenology = PlantPhenology.fromPrimitives(primitives.phenology);

    const props: PlantProps = {
      id: createPlantId(primitives.id),
      identity: PlantIdentity.fromPrimitives(primitives.identity),
      traits: {
        lifecycle: PlantLifecycle.from(primitives.traits.lifecycle),
        size: {
          height: Range.fromPrimitives(primitives.traits.size.height),
          spread: Range.fromPrimitives(primitives.traits.size.spread)
        },
        spacingCm: Range.fromPrimitives(primitives.traits.spacingCm)
      },
      phenology,
      knowledge: this.mapKnowledge(primitives.knowledge),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      status: primitives.status,
      version: primitives.version
    };

    if (primitives.deletedAt) {
      props.deletedAt = new Date(primitives.deletedAt);
    }

    return new Plant(props);
  },

  mapKnowledge(knowledge?: PlantKnowledgePrimitives | null): PlantKnowledge {
    if (!knowledge || Object.keys(knowledge).length === 0) {
      return PlantKnowledge.empty();
    }

    return plantKnowledgeMapper.fromPrimitives(knowledge);
  }
};
