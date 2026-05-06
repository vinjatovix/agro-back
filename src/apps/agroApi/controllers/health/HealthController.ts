import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { CheckHealth } from '../../../../Contexts/health/application/index.js';

export type HealthControllerDependencies = {
  checkHealth: CheckHealth;
};

export class HealthController {
  protected readonly checkHealth: CheckHealth;
  constructor({ checkHealth }: HealthControllerDependencies) {
    this.checkHealth = checkHealth;
  }

  run = (req: Request, res: Response, next: NextFunction) => {
    try {
      const healthInfo = this.checkHealth.run();
      res.status(httpStatus.OK).json(healthInfo);
    } catch (error) {
      next(error);
    }
  };
}
