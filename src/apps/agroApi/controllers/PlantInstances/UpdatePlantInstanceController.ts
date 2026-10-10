import { type NextFunction, type Request, type Response } from 'express';

import type { UpdatePlantInstance } from '../../../../Contexts/Agro/PlantInstances/application/useCases/UpdatePlantInstance.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updatePlantInstanceRequest } from './requestSchemas.js';

export type UpdatePlantInstanceControllerDependencies = {
  updatePlantInstance: UpdatePlantInstance;
};

export class UpdatePlantInstanceController extends HttpController {
  protected readonly updatePlantInstance: UpdatePlantInstance;

  constructor({
    updatePlantInstance
  }: UpdatePlantInstanceControllerDependencies) {
    super();
    this.updatePlantInstance = updatePlantInstance;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body: dto } = getValidatedRequest(
        res,
        updatePlantInstanceRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const instance = await this.updatePlantInstance.execute(
        { ...dto, id: params.id },
        user,
        getExpectedVersions(res)
      );
      const response = plantInstanceDomainMapper.toPrimitives(instance);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
