import { type NextFunction, type Request, type Response } from 'express';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { UpdateFamily } from '../../../../Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { Uuid } from '../../../../Contexts/shared/domain/valueObject/Uuid.js';
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
  getFamilyById: GetFamilyById;
  getFamilyBySlug: GetFamilyBySlug;
};

export class UpdateFamilyController extends HttpController {
  protected readonly updateFamily: UpdateFamily;
  protected readonly getFamilyById: GetFamilyById;
  protected readonly getFamilyBySlug: GetFamilyBySlug;

  constructor({
    updateFamily,
    getFamilyById,
    getFamilyBySlug
  }: UpdateFamilyControllerDependencies) {
    super();
    this.updateFamily = updateFamily;
    this.getFamilyById = getFamilyById;
    this.getFamilyBySlug = getFamilyBySlug;
  }
  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        throw createError.badRequest('Family ID or slug is required');
      }

      const family = Uuid.isValid(idOrSlug)
        ? await this.getFamilyById.execute(idOrSlug)
        : await this.getFamilyBySlug.execute(idOrSlug);

      const id = family.idValue;

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
