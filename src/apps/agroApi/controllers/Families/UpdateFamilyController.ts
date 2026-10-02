import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import type { UpdateFamilyInput } from '../../../../Contexts/Agro/Families/application/useCases/interfaces/index.js';
import type { UpdateFamily } from '../../../../Contexts/Agro/Families/application/useCases/UpdateFamily.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { UuidValidator } from '../../../../Contexts/shared/domain/valueObject/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateFamilyRequest } from './requestSchemas.js';

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
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { idOrSlug },
        body: dto
      } = getValidatedRequest(res, updateFamilyRequest);

      const family = UuidValidator.isValid(idOrSlug)
        ? await this.getFamilyById.execute(idOrSlug)
        : await this.getFamilyBySlug.execute(idOrSlug);

      const id = family.idValue;

      const user = res.locals.user as UserSessionInfo;

      const input: UpdateFamilyInput = { ...dto, id };
      const updatedFamily = await this.updateFamily.execute(
        input,
        user.username,
        getExpectedVersions(res)
      );
      const result = familyDomainMapper.toPrimitives(updatedFamily);

      setVersionETag(res, result.version);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
