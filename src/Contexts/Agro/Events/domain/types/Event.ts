import type { EventBase } from './EventBase.js';
import type { EventDataMap } from './EventData.js';

export type Event<T extends keyof EventDataMap = keyof EventDataMap> =
  EventBase<T, EventDataMap[T]>;
