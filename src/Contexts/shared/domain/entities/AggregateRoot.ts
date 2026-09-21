export abstract class AggregateRoot<TId extends string> {
  constructor(public readonly id: TId) {}
}
