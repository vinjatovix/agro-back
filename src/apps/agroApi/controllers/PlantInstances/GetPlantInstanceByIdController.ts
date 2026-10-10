import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlantInstanceById } from '../../../../Contexts/Agro/PlantInstances/application/useCases/GetPlantInstanceById.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { getPlantInstanceByIdRequest } from './requestSchemas.js';

export type GetPlantInstanceByIdControllerDependencies = {
  getPlantInstanceById: GetPlantInstanceById;
};

export class GetPlantInstanceByIdController extends HttpController {
  protected readonly getPlantInstanceById: GetPlantInstanceById;

  constructor({
    getPlantInstanceById
  }: GetPlantInstanceByIdControllerDependencies) {
    super();
    this.getPlantInstanceById = getPlantInstanceById;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, getPlantInstanceByIdRequest);
      const user = res.locals.user as UserSessionInfo;

      const instance = await this.getPlantInstanceById.execute(params.id, user);
      const response = plantInstanceDomainMapper.toPrimitives(instance);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
