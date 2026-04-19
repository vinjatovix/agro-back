export abstract class AggregateRoot<TPrimitives = Record<string, unknown>> {
  abstract toPrimitives(): TPrimitives;
}
