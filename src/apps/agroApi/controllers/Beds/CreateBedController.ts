import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { CreateBed } from '../../../../Contexts/Agro/Beds/application/useCases/CreateBed.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { toBedResponse } from './bedResponse.js';
import { createBedRequest } from './requestSchemas.js';

export type CreateBedControllerDependencies = {
  createBed: CreateBed;
};

export class CreateBedController extends HttpController {
  protected readonly createBed: CreateBed;
  constructor({ createBed }: CreateBedControllerDependencies) {
    super();
    this.createBed = createBed;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createBedRequest);
      const user = res.locals.user as UserSessionInfo;

      const bed = await this.createBed.execute(
        { ...dto, userId: user.id },
        user.username
      );

      const response = toBedResponse({ bed, cropIds: [] });

      setVersionETag(res, response.version);
      res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };
}
