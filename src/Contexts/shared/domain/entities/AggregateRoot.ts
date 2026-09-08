import type { Uuid } from '../valueObject/Uuid.js';

export abstract class AggregateRoot<TId = Uuid> {
  constructor(public readonly id: TId) {}
}
