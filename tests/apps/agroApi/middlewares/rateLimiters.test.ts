import express, { type RequestHandler } from 'express';
import request from 'supertest';

import {
  createAuthLimiter,
  createRegistrationLimiter
} from '../../../../src/apps/agroApi/middlewares/rateLimiters.js';

const LIMIT = 5;
const neverSkip = (): boolean => false;

/** A route behind `limiter` that answers `status`. */
const appWith = (limiter: RequestHandler, status: number) => {
  const app = express();
  app.post('/limited', limiter, (_req, res) => {
    res.status(status).send();
  });

  return app;
};

const statusesOf = async (
  app: express.Express,
  count: number
): Promise<number[]> => {
  const statuses: number[] = [];
  for (let sent = 0; sent < count; sent += 1) {
    statuses.push((await request(app).post('/limited')).status);
  }

  return statuses;
};

describe('rate limit config', () => {
  describe('registration limiter', () => {
    it('should count successful answers and refuse the sixth request', async () => {
      const app = appWith(createRegistrationLimiter({ skip: neverSkip }), 202);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).toEqual([...Array<number>(LIMIT).fill(202), 429]);
    });
  });

  describe('auth limiter', () => {
    it('should not count successful answers', async () => {
      const app = appWith(createAuthLimiter({ skip: neverSkip }), 200);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).not.toContain(429);
    });

    it('should count failed answers and refuse the sixth request', async () => {
      const app = appWith(createAuthLimiter({ skip: neverSkip }), 400);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).toEqual([...Array<number>(LIMIT).fill(400), 429]);
    });
  });
});
