import { type NextFunction, type Request, type Response } from 'express';

import type { ListPlantInstances } from '../../../../Contexts/Agro/PlantInstances/application/useCases/ListPlantInstances.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { listPlantInstancesRequest } from './requestSchemas.js';

export type ListPlantInstancesControllerDependencies = {
  listPlantInstances: ListPlantInstances;
};

export class ListPlantInstancesController extends HttpController {
  protected readonly listPlantInstances: ListPlantInstances;

  constructor({
    listPlantInstances
  }: ListPlantInstancesControllerDependencies) {
    super();
    this.listPlantInstances = listPlantInstances;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, listPlantInstancesRequest);
      const user = res.locals.user as UserSessionInfo;

      const result = await this.listPlantInstances.execute(query, user);

      const response = {
        data: result.data.map((c) => plantInstanceDomainMapper.toPrimitives(c)),
        pagination: result.pagination
      };

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
