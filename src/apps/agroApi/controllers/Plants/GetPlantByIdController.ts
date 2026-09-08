import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { HttpController } from '../../shared/HttpController.js';
import { createError } from '../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';

export type GetPlantByIdControllerDependencies = {
  getPlant: GetPlant;
};

export class GetPlantByIdController extends HttpController {
  protected readonly getPlant: GetPlant;
  constructor({ getPlant }: GetPlantByIdControllerDependencies) {
    super();
    this.getPlant = getPlant;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plantId = req.params.id;
      const user = res.locals.user as UserSessionInfo;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      const plant = await this.getPlant.execute(plantId, user);
      const mappedPlant = plantDomainMapper.toPrimitives(plant);

      res.status(this.status()).json(mappedPlant);
    } catch (error) {
      next(error);
    }
  };
}
