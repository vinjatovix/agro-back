export type DoThingControllerDependencies = {
  doThing: unknown;
};

export class DoThingController {
  public readonly doThing: unknown;

  constructor({ doThing }: DoThingControllerDependencies) {
    this.doThing = doThing;
  }
}
