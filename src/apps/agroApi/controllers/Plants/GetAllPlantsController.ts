import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';

export type GetAllPlantsControllerDependencies = {
  listPlants: ListPlants;
};

export class GetAllPlantsController extends HttpController {
  protected readonly listPlants: ListPlants;
  constructor({ listPlants }: GetAllPlantsControllerDependencies) {
    super();
    this.listPlants = listPlants;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const plants = await this.listPlants.execute(user);
      const mappedPlants = plants.map((plant) =>
        plantDomainMapper.toPrimitives(plant)
      );

      res.status(this.status()).json(mappedPlants);
    } catch (error) {
      next(error);
    }
  };
}
