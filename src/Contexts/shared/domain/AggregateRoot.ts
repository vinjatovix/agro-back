import type { Uuid } from './valueObject/index.js';

export abstract class AggregateRoot<TId = Uuid> {
  constructor(public readonly id: TId) {}
}
