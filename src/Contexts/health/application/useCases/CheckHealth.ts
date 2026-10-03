export type CheckHealthDependencies = {
  appVersion: string;
};

export class CheckHealth {
  private readonly appVersion: string;

  constructor({ appVersion }: CheckHealthDependencies) {
    this.appVersion = appVersion;
  }

  run(): {
    status: string;
    timestamp: string;
    version: string;
  } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: this.appVersion
    };
  }
}
