import type { Request, Response, Router } from 'express';
import { TestError } from '../../../../shared/errors/index.js';
import { healthApiInvoker } from './healthApiInvoker.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/index.js';

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.get(`${API_PREFIXES.health}`, healthApiInvoker('getHealth'));

  router.get(`${API_PREFIXES.testError}`, (_req: Request, _res: Response) => {
    throw new TestError('Forced error for testing');
  });
};
