import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

type GetPlantByIdParams = {
  id: string;
};

export type GetPlantByIdControllerDependencies = {
  getPlant: GetPlant;
};

export class GetPlantByIdController extends HttpController {
  protected readonly getPlant: GetPlant;
  constructor({ getPlant }: GetPlantByIdControllerDependencies) {
    super();
    this.getPlant = getPlant;
  }

  run = async (
    req: Request<GetPlantByIdParams>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const plantId = req.params.id;
      const user = res.locals.user as UserSessionInfo | undefined;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      const plant = await this.getPlant.execute(plantId, user);
      const mappedPlant = plantDomainMapper.toPrimitives(plant);

      setVersionETag(res, mappedPlant.version);
      res.status(this.status()).json(mappedPlant);
    } catch (error) {
      next(error);
    }
  };
}
