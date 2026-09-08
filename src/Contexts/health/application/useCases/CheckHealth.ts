export class CheckHealth {
  constructor(private readonly appVersion: string) {}

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
