import { type NextFunction, type Request, type Response } from 'express';

import type { ListFamilies } from '../../../../Contexts/Agro/Families/application/useCases/ListFamilies.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPage } from '../../shared/responseValidation.js';
import { listFamiliesRequest } from './requestSchemas.js';
import { familyResponseSchema } from './responseSchemas.js';

export type GetAllFamiliesControllerDependencies = {
  listFamilies: ListFamilies;
  logger: AppLogger;
};

export class GetAllFamiliesController extends HttpController {
  protected readonly listFamilies: ListFamilies;
  private readonly logger: AppLogger;

  constructor({ listFamilies, logger }: GetAllFamiliesControllerDependencies) {
    super();
    this.listFamilies = listFamilies;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, listFamiliesRequest);
      const page = await this.listFamilies.execute({ query });

      res.status(this.status()).json(
        checkPage(familyResponseSchema, page, {
          resource: 'Family',
          logger: this.logger
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
