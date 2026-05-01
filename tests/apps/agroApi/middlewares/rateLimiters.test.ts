import {
  authLimiter,
  globalLimiter,
  strictLimiter
} from '../../../../src/apps/agroApi/middlewares/rateLimiters.js';

describe('rate limit config', () => {
  it('should define global limiter config', () => {
    expect(globalLimiter).toBeDefined();
  });

  it('should define auth limiter config', () => {
    expect(authLimiter).toBeDefined();
  });

  it('should define strict limiter config', () => {
    expect(strictLimiter).toBeDefined();
  });
});
