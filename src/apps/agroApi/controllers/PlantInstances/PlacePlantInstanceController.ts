import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { PlacePlantInstance } from '../../../../Contexts/Agro/PlantInstances/application/useCases/PlacePlantInstance.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { placePlantInstanceRequest } from './requestSchemas.js';

export type PlacePlantInstanceControllerDependencies = {
  placePlantInstance: PlacePlantInstance;
};

export class PlacePlantInstanceController extends HttpController {
  protected readonly placePlantInstance: PlacePlantInstance;

  constructor({
    placePlantInstance
  }: PlacePlantInstanceControllerDependencies) {
    super();
    this.placePlantInstance = placePlantInstance;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, placePlantInstanceRequest);
      const user = res.locals.user as UserSessionInfo;

      const instance = await this.placePlantInstance.execute(dto, user);
      const response = plantInstanceDomainMapper.toPrimitives(instance);

      setVersionETag(res, response.version);
      res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };
}
