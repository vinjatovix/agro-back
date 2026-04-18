import { CheckHealth } from '../../../../../../src/Contexts/agroApi/health/application/useCases/CheckHealth.js';

describe('CheckHealth', () => {
  it('should return status, version and timestamp', () => {
    const version = '1.2.3';
    const useCase = new CheckHealth(version);

    const result = useCase.run();

    expect(result.status).toBe('OK');
    expect(result.version).toBe(version);
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('should return an ISO-8601 timestamp', () => {
    const useCase = new CheckHealth('1.0.0');

    const result = useCase.run();

    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    expect(result.timestamp).toBe(new Date(result.timestamp).toISOString());
  });
});
