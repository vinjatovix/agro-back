export type DoThingDependencies = {
  demoRepository: unknown;
};

export class DoThing {
  public readonly demoRepository: unknown;

  constructor({ demoRepository }: DoThingDependencies) {
    this.demoRepository = demoRepository;
  }
}
