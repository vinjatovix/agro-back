import type { DeepPartial } from '../../../../shared/domain/patch/DeepPartial.js';
import {
  Metadata,
  StringValueObject,
  Uuid
} from '../../../shared/domain/valueObject/index.js';
import type { BedPrimitives } from '../domain/entities/types/BedPrimitives.js';
import { Bed } from '../domain/entities/Bed.js';
import { PlantInstance } from '../../PlantInstances/domain/entities/PlantInstance.js';
import type { UpdateBedDto } from '../application/useCases/interfaces/UpdateBedDto.js';
import type { CreateBedInput } from '../application/useCases/interfaces/CreateBedInput.js';
import { PositiveNumber } from '../../../shared/domain/valueObject/PositiveNumber.js';

export interface BedMapper {
  toPrimitives(bed: Bed): BedPrimitives;
  fromPrimitives(primitives: BedPrimitives): Bed;
  fromCreateInputToDomain(input: CreateBedInput, user: string): Bed;
  fromUpdateDtoToPrimitivesPatch(
    dto: Partial<UpdateBedDto>
  ): DeepPartial<BedPrimitives>;
}

export const bedMapper: BedMapper = {
  toPrimitives(bed: Bed): BedPrimitives {
    return {
      id: bed.id.value,
      userId: bed.userId.value,
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
      id: new Uuid(primitives.id),
      userId: new Uuid(primitives.userId),
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
  },

  fromCreateInputToDomain(input: CreateBedInput, user: string): Bed {
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

  fromUpdateDtoToPrimitivesPatch(
    dto: Partial<UpdateBedDto>
  ): DeepPartial<BedPrimitives> {
    return {
      ...(dto.name !== undefined && {
        name: new StringValueObject(dto.name).value
      }),
      ...(dto.width !== undefined && {
        width: PositiveNumber.create(dto.width).value
      }),
      ...(dto.height !== undefined && {
        height: PositiveNumber.create(dto.height).value
      }),
      ...(dto.depth !== undefined && {
        depth: PositiveNumber.create(dto.depth).value
      })
    };
  }
};
