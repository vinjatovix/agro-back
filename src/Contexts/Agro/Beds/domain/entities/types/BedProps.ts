import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PositiveNumber } from '../../../../../shared/domain/valueObject/PositiveNumber.js';
import type { StringValueObject } from '../../../../../shared/domain/valueObject/StringValueObject.js';
import type { PlantInstance } from '../../../../PlantInstances/domain/entities/PlantInstance.js';
import type { BedId } from '../../BedId.js';

export type BedProps = {
  id: BedId;
  userId: UserId;
  name: StringValueObject;
  width: PositiveNumber;
  height: PositiveNumber;
  depth: PositiveNumber;
  plantInstances: PlantInstance[];
  metadata: Metadata;
  deleted: boolean;
  deletedAt?: Date;
};
