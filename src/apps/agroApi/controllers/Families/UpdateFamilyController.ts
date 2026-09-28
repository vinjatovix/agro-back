import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import type {
  UpdateFamilyDto,
  UpdateFamilyInput
} from '../../../../Contexts/Agro/Families/application/useCases/interfaces/index.js';
import type { UpdateFamily } from '../../../../Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { UuidValidator } from '../../../../Contexts/shared/domain/valueObject/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { getExpectedVersion } from '../../middlewares/requireIfMatch.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

type UpdateFamilyParams = {
  idOrSlug: string;
};

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
  run = async (
    req: Request<UpdateFamilyParams>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        throw createError.badRequest('Family ID or slug is required');
      }

      const family = UuidValidator.isValid(idOrSlug)
        ? await this.getFamilyById.execute(idOrSlug)
        : await this.getFamilyBySlug.execute(idOrSlug);

      const id = family.idValue;

      const dto = req.body as UpdateFamilyDto;
      const user = res.locals.user as UserSessionInfo;

      const input: UpdateFamilyInput = { ...dto, id };
      const updatedFamily = await this.updateFamily.execute(
        input,
        user.username,
        getExpectedVersion(res)
      );
      const result = familyDomainMapper.toPrimitives(updatedFamily);

      setVersionETag(res, result.version);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
