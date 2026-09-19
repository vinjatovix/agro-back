import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PositiveNumber } from '../../../../../shared/domain/valueObject/PositiveNumber.js';
import type { StringValueObject } from '../../../../../shared/domain/valueObject/StringValueObject.js';
import type { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import type { PlantInstance } from '../../../../PlantInstances/domain/entities/PlantInstance.js';

export type BedProps = {
  id: Uuid;
  userId: Uuid;
  name: StringValueObject;
  width: PositiveNumber;
  height: PositiveNumber;
  depth: PositiveNumber;
  plantInstances: PlantInstance[];
  metadata: Metadata;
  deleted: boolean;
  deletedAt?: Date;
};
