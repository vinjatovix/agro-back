import { type NextFunction, type Request, type Response } from 'express';

import type { UpdateBed } from '../../../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateBedRequest } from './requestSchemas.js';

export type UpdateBedControllerDependencies = {
  updateBed: UpdateBed;
};

export class UpdateBedController extends HttpController {
  protected readonly updateBed: UpdateBed;
  constructor({ updateBed }: UpdateBedControllerDependencies) {
    super();
    this.updateBed = updateBed;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body: dto } = getValidatedRequest(res, updateBedRequest);
      const user = res.locals.user as UserSessionInfo;

      const result = await this.updateBed.execute(
        { ...dto, id: params.id },
        user,
        getExpectedVersions(res)
      );

      const response = bedDomainMapper.toPrimitives(result);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
