import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { getPlantByIdRequest } from './requestSchemas.js';
import { plantResponseSchema } from './responseSchemas.js';

export type GetPlantByIdControllerDependencies = {
  getPlant: GetPlant;
  logger: AppLogger;
};

export class GetPlantByIdController extends HttpController {
  protected readonly getPlant: GetPlant;
  private readonly logger: AppLogger;

  constructor({ getPlant, logger }: GetPlantByIdControllerDependencies) {
    super();
    this.getPlant = getPlant;
    this.logger = logger;
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
      const body = checkResponse(plantResponseSchema, plant, {
        resource: 'Plant',
        id: plant.id,
        logger: this.logger
      });

      setVersionETag(res, body.version);
      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
