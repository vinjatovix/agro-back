import { Range } from '../../../../shared/domain/value-objects/Range.js';
import { createError } from '../../../../shared/errors/index.js';
import { DomainException } from '../../../shared/domain/errors/index.js';
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
import { createPlantId } from '../domain/PlantId.js';
import {
  PlantIdentity,
  PlantKnowledge,
  PlantLifecycle,
  PlantPhenology
} from '../domain/value-objects/index.js';
import type { MongoPlantDocument } from '../infrastructure/persistence/types/MongoPlantDocument.js';
import type { PlantPersistenceMapper } from './interfaces/PlantPersistenceMapper.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

const mapKnowledge = (
  knowledge?: PlantKnowledgePrimitives | null
): PlantKnowledge => {
  if (!knowledge || Object.keys(knowledge).length === 0) {
    return PlantKnowledge.empty();
  }

  return plantKnowledgeMapper.fromPrimitives(knowledge);
};

const toPlant = (document: MongoPlantDocument): Plant => {
  const phenology = PlantPhenology.fromPrimitives(document.phenology);

  const props: PlantProps = {
    id: createPlantId(fromMongoId(document._id)),
    identity: PlantIdentity.fromPrimitives(document.identity),
    traits: {
      lifecycle: PlantLifecycle.from(document.traits.lifecycle),
      size: {
        height: Range.fromPrimitives(document.traits.size.height),
        spread: Range.fromPrimitives(document.traits.size.spread)
      },
      spacingCm: Range.fromPrimitives(document.traits.spacingCm),
      ...(document.traits.ecological && {
        ecological: document.traits.ecological
      })
    },
    phenology,
    knowledge: mapKnowledge(document.knowledge),
    metadata: Metadata.fromPrimitives(document.metadata),
    status: document.status,
    version: document.version
  };

  if (document.deletedAt) {
    props.deletedAt = new Date(document.deletedAt);
  }

  return new Plant(props);
};

export const plantPersistenceMapper: PlantPersistenceMapper = {
  /**
   * A stored plant that breaks a domain rule is a server fault, not a client
   * one: it fails as a `500` instead of the rule's own `400`, whatever request
   * loaded it (a crop placed next to it, a delete...).
   */
  fromMongoDocument: function (document: MongoPlantDocument): Plant {
    try {
      return toPlant(document);
    } catch (error) {
      if (!(error instanceof DomainException)) throw error;

      throw createError.internal(
        `Stored plant ${fromMongoId(document._id)} breaks a domain rule: ${error.message}`
      );
    }
  },
  mapKnowledge,
  toMongoDocument: function (plant: Plant): MongoPlantDocument {
    const phenology = plant.phenology.toPrimitives();

    return {
      _id: toMongoId(plant.id),
      identity: plant.identity.toPrimitives(),
      traits: {
        lifecycle: plant.traits.lifecycle.getValue(),
        size: {
          height: plant.traits.size.height.toPrimitives(),
          spread: plant.traits.size.spread.toPrimitives()
        },
        spacingCm: plant.traits.spacingCm.toPrimitives(),
        ...(plant.traits.ecological && {
          ecological: { ...plant.traits.ecological }
        })
      },
      phenology,
      knowledge: plantKnowledgeMapper.toPrimitives(plant.knowledge),
      metadata: plant.metadata.toPrimitives(),
      status: plant.status,
      deletedAt: plant.deletedAt ? plant.deletedAt.toISOString() : null,
      version: plant.version
    };
  }
};
