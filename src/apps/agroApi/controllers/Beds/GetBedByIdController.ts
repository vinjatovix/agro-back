import { type NextFunction, type Request, type Response } from 'express';

import type { GetBedById } from '../../../../Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { getBedByIdRequest } from './requestSchemas.js';

export type GetBedByIdControllerDependencies = {
  getBedById: GetBedById;
};

export class GetBedByIdController extends HttpController {
  protected readonly getBedById: GetBedById;
  constructor({ getBedById }: GetBedByIdControllerDependencies) {
    super();
    this.getBedById = getBedById;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, getBedByIdRequest);
      const user = res.locals.user as UserSessionInfo;

      const bed = await this.getBedById.execute(params.id, user);

      const response = bedDomainMapper.toPrimitives(bed);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
