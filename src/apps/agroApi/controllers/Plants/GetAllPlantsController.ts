import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';

export class GetAllPlantsController extends HttpController {
  constructor(private readonly listPlants: ListPlants) {
    super();
  }

  async run(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plants = await this.listPlants.execute();

      res.status(this.status()).json(plants);
    } catch (error) {
      next(error);
    }
  }
}
