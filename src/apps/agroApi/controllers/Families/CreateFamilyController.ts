import { type NextFunction, type Request, type Response } from 'express';

import httpStatus from 'http-status';
import type { CreateFamily } from '../../../../Contexts/Agro/Families/application/useCases/CreateFamily.js';
import type { CreateFamilyDto } from '../../../../Contexts/Agro/Families/application/useCases/interfaces/CreateFamilyDto.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

export type CreateFamilyControllerDependencies = {
  createFamily: CreateFamily;
};

export class CreateFamilyController extends HttpController {
  protected readonly createFamily: CreateFamily;
  constructor({ createFamily }: CreateFamilyControllerDependencies) {
    super();
    this.createFamily = createFamily;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreateFamilyDto;
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
