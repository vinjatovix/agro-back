import type { DeepPartial } from '../../../../shared/domain/patch/DeepPartial.js';
import {
  MonthSet,
  Range
} from '../../../../shared/domain/value-objects/index.js';
import { Metadata, Uuid } from '../../../shared/domain/valueObject/index.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../application/useCases/interfaces/UpdatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantKnowledgePrimitives,
  PlantPrimitives,
  PlantProps
} from '../domain/entities/types/index.js';
import {
  PlantKnowledge,
  PlantLifecycle,
  PlantSowing
} from '../domain/value-objects/index.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

export interface PlantMapper {
  toPrimitives(plant: Plant): PlantPrimitives;
  fromPrimitives(primitives: PlantPrimitives): Plant;
  fromCreateDtoToDomain(dto: CreatePlantDto, user: string): Plant;
  fromUpdateDtoToPrimitivesPatch(
    dto: UpdatePlantDto
  ): DeepPartial<PlantPrimitives>;
}

export const plantDomainMapper = {
  toPrimitives(plant: Plant): PlantPrimitives {
    const phenology: PlantPrimitives['phenology'] = {
      sowing: plant.phenology.sowing.toPrimitives(),
      flowering: {
        months: plant.phenology.flowering.months.toArray()
      },
      harvest: {
        months: plant.phenology.harvest.months.toArray()
      }
    };

    if (plant.phenology.flowering.pollination) {
      phenology.flowering.pollination = plant.phenology.flowering.pollination;
    }

    if (plant.phenology.harvest.description) {
      phenology.harvest.description = plant.phenology.harvest.description;
    }

    const knowledge = plantKnowledgeMapper.toPrimitives(
      plant.knowledge ?? PlantKnowledge.empty()
    );

    return {
      id: plant.id.value,
      identity: plant.identity,
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
      deletedAt: plant.deletedAt ? plant.deletedAt.toISOString() : null
    };
  },

  fromPrimitives(primitives: PlantPrimitives): Plant {
    const flowering = {
      months: MonthSet.fromArray(primitives.phenology.flowering.months),
      ...(primitives.phenology.flowering.pollination && {
        pollination: primitives.phenology.flowering.pollination
      })
    };

    const harvest = {
      months: MonthSet.fromArray(primitives.phenology.harvest.months),
      ...(primitives.phenology.harvest.description && {
        description: primitives.phenology.harvest.description
      })
    };

    const phenology = {
      sowing: PlantSowing.fromPrimitives(primitives.phenology.sowing),
      flowering,
      harvest
    };

    const props: PlantProps = {
      id: new Uuid(primitives.id),
      identity: primitives.identity,
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
      status: primitives.status
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
