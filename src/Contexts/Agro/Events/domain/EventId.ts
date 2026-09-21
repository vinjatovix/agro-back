import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type EventId = Brand<string, 'EventId'>;

const generator = createIdGenerator<EventId>('EventId');

export function createEventId(value: string): EventId {
  return generator.create(value);
}

export function randomEventId(): EventId {
  return generator.random();
}
