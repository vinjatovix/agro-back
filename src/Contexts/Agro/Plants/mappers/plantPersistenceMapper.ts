import { MonthSet } from '../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../shared/domain/value-objects/Range.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantKnowledgePrimitives,
  PlantProps
} from '../domain/entities/types/index.js';
import type { PollinationType } from '../domain/entities/types/PollinationType.js';
import { createPlantId } from '../domain/PlantId.js';
import {
  PlantKnowledge,
  PlantLifecycle,
  PlantSowing
} from '../domain/value-objects/index.js';
import type { MongoPlantDocument } from '../infrastructure/persistence/types/MongoPlantDocument.js';
import type { PlantPersistenceMapper } from './interfaces/PlantPersistenceMapper.js';
import { plantIdentityMapper } from './plantIdentityMapper.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

export const plantPersistenceMapper: PlantPersistenceMapper = {
  fromMongoDocument: function (document: MongoPlantDocument): Plant {
    const flowering = {
      months: MonthSet.fromArray(document.phenology.flowering.months),
      ...(document.phenology.flowering.pollination && {
        pollination: {
          type: document.phenology.flowering.pollination
            .type as PollinationType,
          ...(document.phenology.flowering.pollination.agents && {
            agents: document.phenology.flowering.pollination.agents
          })
        }
      })
    };

    const harvest = {
      months: MonthSet.fromArray(document.phenology.harvest.months),
      ...(document.phenology.harvest.description && {
        description: document.phenology.harvest.description
      })
    };

    const phenology = {
      sowing: PlantSowing.fromPrimitives(document.phenology.sowing),
      flowering,
      harvest
    };

    const props: PlantProps = {
      id: createPlantId(fromMongoId(document._id)),
      identity: plantIdentityMapper.fromPrimitives(document.identity),
      traits: {
        lifecycle: PlantLifecycle.from(document.traits.lifecycle),
        size: {
          height: Range.fromPrimitives(document.traits.size.height),
          spread: Range.fromPrimitives(document.traits.size.spread)
        },
        spacingCm: Range.fromPrimitives(document.traits.spacingCm)
      },
      phenology,
      knowledge: this.mapKnowledge(document.knowledge),
      metadata: Metadata.fromPrimitives(document.metadata),
      status: document.status
    };

    if (document.deletedAt) {
      props.deletedAt = new Date(document.deletedAt);
    }

    return Plant.create(props);
  },
  mapKnowledge(knowledge?: PlantKnowledgePrimitives | null): PlantKnowledge {
    if (!knowledge || Object.keys(knowledge).length === 0) {
      return PlantKnowledge.empty();
    }

    return plantKnowledgeMapper.fromPrimitives(knowledge);
  },
  toMongoDocument: function (plant: Plant): MongoPlantDocument {
    const flowering = {
      months: plant.phenology.flowering.months.toArray(),
      ...(plant.phenology.flowering.pollination && {
        pollination: plant.phenology.flowering.pollination
      })
    };

    const harvest = {
      months: plant.phenology.harvest.months.toArray(),
      ...(plant.phenology.harvest.description && {
        description: plant.phenology.harvest.description
      })
    };

    const phenology = {
      sowing: plant.phenology.sowing.toPrimitives(),
      flowering,
      harvest
    };

    const knowledge = plant.knowledge
      ? plantKnowledgeMapper.toPrimitives(plant.knowledge)
      : undefined;

    return {
      _id: toMongoId(plant.id),
      identity: plantIdentityMapper.toPrimitives(plant.identity),
      traits: {
        lifecycle: plant.traits.lifecycle.getValue(),
        size: {
          height: plant.traits.size.height.toPrimitives(),
          spread: plant.traits.size.spread.toPrimitives()
        },
        spacingCm: plant.traits.spacingCm.toPrimitives()
      },
      phenology,
      ...(knowledge && { knowledge }),
      metadata: plant.metadata.toPrimitives(),
      status: plant.status,
      deletedAt: plant.deletedAt ? plant.deletedAt.toISOString() : null
    };
  }
};
