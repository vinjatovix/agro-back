import { type NextFunction, type Request, type Response } from 'express';
import type { CheckHealth } from '../../../../Contexts/agroApi/health/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class HealthController extends HttpController {
  constructor(protected readonly checkHealth: CheckHealth) {
    super();
  }

  async run(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const healthInfo = await this.checkHealth.run();
      res.status(this.status()).json(healthInfo);
    } catch (error) {
      next(error);
    }
  }
}
