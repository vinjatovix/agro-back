import { type NextFunction, type Request, type Response } from 'express';

import type { DeletePlant } from '../../../../Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { HttpController } from '../../shared/HttpController.js';
import httpStatus from 'http-status';

export type DeletePlantControllerDependencies = {
  deletePlant: DeletePlant;
};

export class DeletePlantController extends HttpController {
  protected readonly deletePlant: DeletePlant;
  constructor({ deletePlant }: DeletePlantControllerDependencies) {
    super();
    this.deletePlant = deletePlant;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plantId = req.params.id;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      const user = res.locals.user as UserSessionInfo;
      await this.deletePlant.execute(plantId, user.username);

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  };
}
