import { type NextFunction, type Request, type Response } from 'express';

import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { listPlantsRequest } from './requestSchemas.js';

export type GetAllPlantsControllerDependencies = {
  listPlants: ListPlants;
};

export class GetAllPlantsController extends HttpController {
  protected readonly listPlants: ListPlants;

  constructor({ listPlants }: GetAllPlantsControllerDependencies) {
    super();
    this.listPlants = listPlants;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const { query } = getValidatedRequest(res, listPlantsRequest);
      const result = await this.listPlants.execute(user, { query });
      const data = result.data.map((plant) =>
        plantDomainMapper.toPrimitives(plant)
      );

      res.status(this.status()).json({ ...result, data });
    } catch (error) {
      next(error);
    }
  };
}
