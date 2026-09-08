import type { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
import type { EventType } from './EventTypes.js';

export type EventBase<TType extends EventType, TData> = {
  id: Uuid;

  type: TType;

  plantInstanceId: Uuid;
  bedId: Uuid;
  userId: Uuid;

  date: Date;

  data: TData;

  notes?: string;

  metadata: {
    createdAt: Date;
  };
};
