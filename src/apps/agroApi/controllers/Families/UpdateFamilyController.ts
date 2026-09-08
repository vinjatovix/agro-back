import { type NextFunction, type Request, type Response } from 'express';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { UpdateFamily } from '../../../../Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import type {
  UpdateFamilyDto,
  UpdateFamilyInput
} from '../../../../Contexts/Agro/Families/application/useCases/interfaces/index.js';
import { familyApiMapper } from '../../../../Contexts/Agro/Families/mappers/familyApiMapper.js';
import { createError } from '../../../../shared/errors/index.js';

import { HttpController } from '../../shared/HttpController.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';

export type UpdateFamilyControllerDependencies = {
  updateFamily: UpdateFamily;
};

export class UpdateFamilyController extends HttpController {
  protected readonly updateFamily: UpdateFamily;

  constructor({ updateFamily }: UpdateFamilyControllerDependencies) {
    super();
    this.updateFamily = updateFamily;
  }
  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw createError.badRequest('Family ID is required');
      }
      const dto = req.body as UpdateFamilyDto;
      const user = res.locals.user as UserSessionInfo;

      const input: UpdateFamilyInput = { ...dto, id };
      const patch = familyApiMapper.fromUpdateInputToPrimitivesPatch(input);
      const updatedFamily = await this.updateFamily.execute(
        patch,
        user.username
      );
      const result = familyDomainMapper.toPrimitives(updatedFamily);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
