import { type NextFunction, type Request, type Response } from 'express';

import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPage } from '../../shared/responseValidation.js';
import { listPlantsRequest } from './requestSchemas.js';
import { plantResponseSchema } from './responseSchemas.js';

export type GetAllPlantsControllerDependencies = {
  listPlants: ListPlants;
  logger: AppLogger;
};

export class GetAllPlantsController extends HttpController {
  protected readonly listPlants: ListPlants;
  private readonly logger: AppLogger;

  constructor({ listPlants, logger }: GetAllPlantsControllerDependencies) {
    super();
    this.listPlants = listPlants;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const { query } = getValidatedRequest(res, listPlantsRequest);
      const page = await this.listPlants.execute(user, { query });

      res.status(this.status()).json(
        checkPage(plantResponseSchema, page, {
          resource: 'Plant',
          logger: this.logger
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
