import type { UserId } from '../../../../Auth/domain/UserId.js';
import type { BedId } from '../../../Beds/domain/BedId.js';
import type { PlantInstanceId } from '../../../PlantInstances/domain/PlantInstanceId.js';
import type { EventId } from '../EventId.js';
import type { EventType } from './EventTypes.js';

export type EventBase<TType extends EventType, TData> = {
  id: EventId;

  type: TType;

  plantInstanceId: PlantInstanceId;
  bedId: BedId;
  userId: UserId;

  date: Date;

  data: TData;

  notes?: string;

  metadata: {
    createdAt: Date;
  };
};
