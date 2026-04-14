import type { Request, Response, Router } from 'express';
import { TestError } from '../../../../shared/errors/index.js';
import type { HealthService } from '../../../../Contexts/backend/health/application/health.service.js';
import { makeInvoker } from 'awilix-express';

const api = (healthService: HealthService) => ({
  getHealth: async (_req: Request, res: Response) => {
    const healthInfo = await healthService.checkHealth();
    res.json(healthInfo);
  }
});

const apiInvoker = makeInvoker(api);

const prefix = '/api/v1';

export const registerRoutes = (router: Router): void => {
  router.get(`${prefix}/health`, apiInvoker('getHealth'));

  router.get(`${prefix}/error`, (_req: Request, _res: Response) => {
    throw new TestError('Forced error for testing');
  });
};
