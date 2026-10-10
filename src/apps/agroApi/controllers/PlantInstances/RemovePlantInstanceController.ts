import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { RemovePlantInstance } from '../../../../Contexts/Agro/PlantInstances/application/useCases/RemovePlantInstance.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deletePlantInstanceRequest } from './requestSchemas.js';

export type RemovePlantInstanceControllerDependencies = {
  removePlantInstance: RemovePlantInstance;
};

export class RemovePlantInstanceController extends HttpController {
  protected readonly removePlantInstance: RemovePlantInstance;

  constructor({
    removePlantInstance
  }: RemovePlantInstanceControllerDependencies) {
    super();
    this.removePlantInstance = removePlantInstance;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, deletePlantInstanceRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.removePlantInstance.execute(
        params.id,
        user,
        getExpectedVersions(res)
      );

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
