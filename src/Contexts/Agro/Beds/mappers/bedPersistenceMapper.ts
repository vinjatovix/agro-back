import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../shared/domain/valueObject/PositiveNumber.js';
import { StringValueObject } from '../../../shared/domain/valueObject/StringValueObject.js';
import { Uuid } from '../../../shared/domain/valueObject/Uuid.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { PlantInstance } from '../../PlantInstances/domain/entities/PlantInstance.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedPersistenceMapper } from './interfaces/BedPersistenceMapper.js';

export const bedPersistenceMapper: BedPersistenceMapper = {
  fromMongoDocument(document) {
    return Bed.create({
      id: Uuid.create(fromMongoId(document._id)),
      userId: Uuid.create(fromMongoId(document.userId)),
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
      _id: toMongoId(bed.id.value),
      userId: toMongoId(bed.userId.value),
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
