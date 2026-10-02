import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { DeleteBed } from '../../../../Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deleteBedRequest } from './requestSchemas.js';

export type DeleteBedControllerDependencies = {
  deleteBed: DeleteBed;
};

export class DeleteBedController extends HttpController {
  protected readonly deleteBed: DeleteBed;
  constructor({ deleteBed }: DeleteBedControllerDependencies) {
    super();
    this.deleteBed = deleteBed;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, deleteBedRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.deleteBed.execute(params.id, user, getExpectedVersions(res));

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  };
}
