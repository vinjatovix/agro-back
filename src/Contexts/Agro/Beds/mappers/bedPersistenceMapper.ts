import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber,
  StringValueObject
} from '../../../shared/domain/valueObject/index.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { PlantInstance } from '../../PlantInstances/domain/entities/PlantInstance.js';
import { createBedId } from '../domain/BedId.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedPersistenceMapper } from './interfaces/BedPersistenceMapper.js';

export const bedPersistenceMapper: BedPersistenceMapper = {
  fromMongoDocument(document) {
    return Bed.create({
      id: createBedId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      name: new StringValueObject(document.name),
      width: PositiveNumber.create(document.width),
      height: PositiveNumber.create(document.height),
      depth: PositiveNumber.create(document.depth),
      plantInstances: document.plantInstances
        ? document.plantInstances.map((p) => PlantInstance.fromPrimitives(p))
        : [],
      metadata: Metadata.fromPrimitives(document.metadata),
      deleted: document.deleted,
      ...(document.deletedAt && { deletedAt: new Date(document.deletedAt) })
    });
  },

  toMongoDocument(bed) {
    return {
      _id: toMongoId(bed.id),
      userId: toMongoId(bed.userId),
      name: bed.name.value,
      width: bed.width.value,
      height: bed.height.value,
      depth: bed.depth.value,
      plantInstances: bed.plantInstances.map((p) => p.toPrimitives()),
      metadata: bed.metadata.toPrimitives(),
      deleted: bed.isDeleted,
      ...(bed.deletedAt && { deletedAt: bed.deletedAt.toISOString() })
    };
  }
};
