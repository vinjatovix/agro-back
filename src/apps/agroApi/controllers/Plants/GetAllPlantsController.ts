import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';

export class GetAllPlantsController extends HttpController {
  constructor(private readonly listPlants: ListPlants) {
    super();
  }

  async run(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const plants = await this.listPlants.execute(user);

      res.status(this.status()).json(plants);
    } catch (error) {
      next(error);
    }
  }
}
