export type DoMissingDependencies = {
  ghostRepository: unknown;
};

export class DoMissing {
  public readonly ghostRepository: unknown;

  constructor({ ghostRepository }: DoMissingDependencies) {
    this.ghostRepository = ghostRepository;
  }
}
