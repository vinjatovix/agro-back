import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { CheckHealth } from '../../../../Contexts/agroApi/health/application/index.js';

export class HealthController {
  constructor(protected readonly checkHealth: CheckHealth) {}

  run(_req: Request, res: Response, next: NextFunction): void {
    try {
      const healthInfo = this.checkHealth.run();
      res.status(httpStatus.OK).json(healthInfo);
    } catch (error) {
      next(error);
    }
  }
}
