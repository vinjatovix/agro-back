import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { plantMapper } from '../../../../Contexts/Agro/Plants/mappers/plantMapper.js';

export class GetAllPlantsController extends HttpController {
  constructor(private readonly listPlants: ListPlants) {
    super();
  }

  async run(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const plants = await this.listPlants.execute(user);
      const mappedPlants = plants.map((plant) =>
        plantMapper.toPrimitives(plant)
      );

      res.status(this.status()).json(mappedPlants);
    } catch (error) {
      next(error);
    }
  }
}
