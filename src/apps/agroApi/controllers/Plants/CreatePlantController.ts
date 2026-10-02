import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';
import { createPlantRequest } from './requestSchemas.js';

export type CreatePlantControllerDependencies = {
  createPlant: CreatePlant;
};

export class CreatePlantController extends HttpController {
  protected readonly createPlant: CreatePlant;
  constructor({ createPlant }: CreatePlantControllerDependencies) {
    super();
    this.createPlant = createPlant;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createPlantRequest);
      const user = res.locals.user as UserSessionInfo;

      const plant = await this.createPlant.execute(dto, user.username);
      const result = plantDomainMapper.toPrimitives(plant);

      setVersionETag(res, result.version);
      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
