export class HealthService {
  constructor(private readonly appVersion: string) {}
  checkHealth(): { status: string; timestamp: string; version: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: this.appVersion
    };
  }
}
