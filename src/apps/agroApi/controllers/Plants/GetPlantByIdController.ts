import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';
import { getPlantByIdRequest } from './requestSchemas.js';

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
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, getPlantByIdRequest);
      const user = res.locals.user as UserSessionInfo | undefined;

      const plant = await this.getPlant.execute(params.id, user);
      const mappedPlant = plantDomainMapper.toPrimitives(plant);

      setVersionETag(res, mappedPlant.version);
      res.status(this.status()).json(mappedPlant);
    } catch (error) {
      next(error);
    }
  };
}
