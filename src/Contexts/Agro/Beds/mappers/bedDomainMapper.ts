import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber,
  StringValueObject
} from '../../../shared/domain/valueObject/index.js';
import { PlantInstance } from '../../PlantInstances/domain/entities/PlantInstance.js';
import { createBedId } from '../domain/BedId.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedPrimitives } from '../domain/entities/types/BedPrimitives.js';
import type { BedDomainMapper } from './interfaces/BedDomainMapper.js';

export const bedDomainMapper: BedDomainMapper = {
  toPrimitives(bed: Bed): BedPrimitives {
    return {
      id: bed.id,
      userId: bed.userId,
      name: bed.name.value,
      width: bed.width.value,
      height: bed.height.value,
      depth: bed.depth.value,
      plantInstances: bed.plantInstances.map((p) => p.toPrimitives()),
      metadata: bed.metadata.toPrimitives(),
      deleted: bed.isDeleted,
      ...(bed.deletedAt && { deletedAt: bed.deletedAt })
    };
  },

  fromPrimitives(primitives: BedPrimitives): Bed {
    return Bed.create({
      id: createBedId(primitives.id),
      userId: createUserId(primitives.userId),
      name: new StringValueObject(primitives.name),
      width: PositiveNumber.create(primitives.width),
      height: PositiveNumber.create(primitives.height),
      depth: PositiveNumber.create(primitives.depth),
      plantInstances: primitives.plantInstances.map((p) =>
        PlantInstance.fromPrimitives(p)
      ),
      deleted: primitives.deleted,
      ...(primitives.deletedAt && { deletedAt: primitives.deletedAt }),
      metadata: Metadata.fromPrimitives(primitives.metadata)
    });
  }
};
