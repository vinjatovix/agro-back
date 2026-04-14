import type { Request, Response, Router } from 'express';
import { TestError } from '../../../../shared/errors/index.js';

const prefix = '/api/v1/health';

export const registerRoutes = (router: Router): void => {
  const healthRouter = router.route(prefix);
  healthRouter.get((_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.get(`${prefix}/error`, (_req: Request, _res: Response) => {
    throw new TestError('Forced error for testing');
  });
};
