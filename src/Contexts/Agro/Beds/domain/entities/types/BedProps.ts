import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PositiveNumber } from '../../../../../shared/domain/valueObject/PositiveNumber.js';
import type { BedId } from '../../BedId.js';
import type { BedName } from '../../BedName.js';

export type BedProps = {
  id: BedId;
  userId: UserId;
  name: BedName;
  width: PositiveNumber;
  height: PositiveNumber;
  depth: PositiveNumber;
  metadata: Metadata;
  deleted: boolean;
  deletedAt?: Date;
  version?: number;
};
