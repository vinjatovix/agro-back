import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { DeletePlant } from '../../../../Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getExpectedVersion } from '../../middlewares/requireIfMatch.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { deletePlantRequest } from './requestSchemas.js';

export type DeletePlantControllerDependencies = {
  deletePlant: DeletePlant;
};

export class DeletePlantController extends HttpController {
  protected readonly deletePlant: DeletePlant;
  constructor({ deletePlant }: DeletePlantControllerDependencies) {
    super();
    this.deletePlant = deletePlant;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, deletePlantRequest);
      const user = res.locals.user as UserSessionInfo;
      await this.deletePlant.execute(
        params.id,
        user.username,
        getExpectedVersion(res)
      );

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  };
}
