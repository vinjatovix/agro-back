import { type NextFunction, type Request, type Response } from 'express';

import httpStatus from 'http-status';
import type { CreateFamily } from '../../../../Contexts/Agro/Families/application/useCases/CreateFamily.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { createFamilyRequest } from './requestSchemas.js';

export type CreateFamilyControllerDependencies = {
  createFamily: CreateFamily;
};

export class CreateFamilyController extends HttpController {
  protected readonly createFamily: CreateFamily;
  constructor({ createFamily }: CreateFamilyControllerDependencies) {
    super();
    this.createFamily = createFamily;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createFamilyRequest);
      const user = res.locals.user as UserSessionInfo;

      const family = await this.createFamily.execute(dto, user.username);
      const result = familyDomainMapper.toPrimitives(family);

      setVersionETag(res, result.version);
      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
