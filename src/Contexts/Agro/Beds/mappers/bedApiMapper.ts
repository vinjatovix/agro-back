import {
  Metadata,
  PositiveNumber,
  StringValueObject,
  Uuid
} from '../../../shared/domain/valueObject/index.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedApiMapper } from './interfaces/BedApiMapper.js';
import type { BedPatch } from '../application/useCases/interfaces/BedPatch.js';

export const bedApiMapper: BedApiMapper = {
  fromCreateInputToDomain(input, user) {
    return Bed.create({
      id: new Uuid(input.id),
      userId: new Uuid(input.userId),
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
      id: new Uuid(input.id).value,
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
