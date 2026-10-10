import { type NextFunction, type Request, type Response } from 'express';

import type { ListUserBeds } from '../../../../Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { toBedResponse } from './bedResponse.js';
import { listBedsRequest } from './requestSchemas.js';

export type GetUserBedsControllerDependencies = {
  listUserBeds: ListUserBeds;
};

export class GetUserBedsController extends HttpController {
  protected readonly listUserBeds: ListUserBeds;

  constructor({ listUserBeds }: GetUserBedsControllerDependencies) {
    super();
    this.listUserBeds = listUserBeds;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo;
      const { query } = getValidatedRequest(res, listBedsRequest);

      const embedCrops = query.include === 'plantInstances';
      const beds = await this.listUserBeds.execute(user.id, { embedCrops });

      const response = beds.map((bedWithCrops) => toBedResponse(bedWithCrops));

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
