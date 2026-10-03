import type { DoScoped } from '../../application/useCases/DoScoped.js';

export type MongoMismatchRepositoryDependencies = {
  doScoped: DoScoped;
};

export class MongoMismatchRepository {
  public readonly doScoped: DoScoped;

  constructor({ doScoped }: MongoMismatchRepositoryDependencies) {
    this.doScoped = doScoped;
  }
}
