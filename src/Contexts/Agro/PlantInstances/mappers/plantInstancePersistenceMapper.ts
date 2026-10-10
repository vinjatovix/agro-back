import { Coordinates } from '../../../../shared/domain/value-objects/Coordinates.js';
import { createUserId } from '../../../Auth/domain/UserId.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createBedId } from '../../Beds/domain/BedId.js';
import { createPlantId } from '../../Plants/domain/PlantId.js';
import { PlantInstance } from '../domain/entities/PlantInstance.js';
import { createPlantInstanceId } from '../domain/PlantInstanceId.js';
import type { MongoPlantInstanceDocument } from '../infrastructure/persistence/types/MongoPlantInstanceDocument.js';
import type { PlantInstancePersistenceMapper } from './interfaces/PlantInstancePersistenceMapper.js';

export const plantInstancePersistenceMapper: PlantInstancePersistenceMapper = {
  fromMongoDocument(document: MongoPlantInstanceDocument): PlantInstance {
    return PlantInstance.create({
      id: createPlantInstanceId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      bedId: createBedId(fromMongoId(document.bedId)),
      plantId: createPlantId(fromMongoId(document.plantId)),
      position: document.position
        ? new Coordinates(document.position.x, document.position.y)
        : undefined,
      growthStatus: document.growthStatus,
      instanceStatus: document.instanceStatus,
      plantedAt: new Date(document.plantedAt),
      removedAt: document.removedAt ? new Date(document.removedAt) : undefined,
      variety: document.variety,
      notes: document.notes,
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(instance: PlantInstance): MongoPlantInstanceDocument {
    const doc: MongoPlantInstanceDocument = {
      _id: toMongoId(instance.id),
      userId: toMongoId(instance.userId),
      bedId: toMongoId(instance.bedId),
      plantId: toMongoId(instance.plantId),
      growthStatus: instance.growthStatus,
      instanceStatus: instance.instanceStatus,
      plantedAt: instance.plantedAt.toISOString(),
      metadata: instance.metadata.toPrimitives(),
      version: instance.version
    };

    if (instance.position !== undefined) {
      doc.position = {
        x: instance.position.x,
        y: instance.position.y
      };
    }

    if (instance.removedAt !== undefined) {
      doc.removedAt = instance.removedAt.toISOString();
    }

    if (instance.variety !== undefined) {
      doc.variety = instance.variety;
    }

    if (instance.notes !== undefined) {
      doc.notes = instance.notes;
    }

    return doc;
  }
};
