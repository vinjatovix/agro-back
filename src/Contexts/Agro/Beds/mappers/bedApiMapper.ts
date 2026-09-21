import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber,
  StringValueObject
} from '../../../shared/domain/valueObject/index.js';
import type { BedPatch } from '../application/useCases/interfaces/BedPatch.js';
import { createBedId } from '../domain/BedId.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedApiMapper } from './interfaces/BedApiMapper.js';

export const bedApiMapper: BedApiMapper = {
  fromCreateInputToDomain(input, user) {
    return Bed.create({
      id: createBedId(input.id),
      userId: createUserId(input.userId),
      name: new StringValueObject(input.name),
      width: PositiveNumber.create(input.width),
      height: PositiveNumber.create(input.height),
      depth: PositiveNumber.create(input.depth),
      plantInstances: [],
      metadata: Metadata.create(user),
      deleted: false
    });
  },

  fromUpdateInputToPrimitivesPatch(input): BedPatch {
    return {
      id: createBedId(input.id),
      ...(input.name !== undefined && {
        name: new StringValueObject(input.name).value
      }),
      ...(input.width !== undefined && {
        width: PositiveNumber.create(input.width).value
      }),
      ...(input.height !== undefined && {
        height: PositiveNumber.create(input.height).value
      }),
      ...(input.depth !== undefined && {
        depth: PositiveNumber.create(input.depth).value
      })
    };
  }
};
