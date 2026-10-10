import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber
} from '../../../shared/domain/valueObject/index.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createBedId } from '../domain/BedId.js';
import { BedName } from '../domain/BedName.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedPersistenceMapper } from './interfaces/BedPersistenceMapper.js';

export const bedPersistenceMapper: BedPersistenceMapper = {
  fromMongoDocument(document) {
    return Bed.create({
      id: createBedId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      name: new BedName(document.name),
      width: PositiveNumber.create(document.width),
      height: PositiveNumber.create(document.height),
      depth: PositiveNumber.create(document.depth),
      metadata: Metadata.fromPrimitives(document.metadata),
      deleted: document.deleted,
      ...(document.deletedAt && { deletedAt: new Date(document.deletedAt) }),
      version: document.version
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
      metadata: bed.metadata.toPrimitives(),
      deleted: bed.isDeleted,
      ...(bed.deletedAt && { deletedAt: bed.deletedAt.toISOString() }),
      version: bed.version
    };
  }
};
