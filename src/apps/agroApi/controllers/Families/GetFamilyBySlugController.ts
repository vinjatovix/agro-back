import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { UuidValidator } from '../../../../Contexts/shared/domain/valueObject/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';
import { getFamilyByIdOrSlugRequest } from './requestSchemas.js';

export type GetFamilyBySlugControllerDependencies = {
  getFamilyById: GetFamilyById;
  getFamilyBySlug: GetFamilyBySlug;
};

export class GetFamilyBySlugController extends HttpController {
  protected readonly getFamilyById: GetFamilyById;
  protected readonly getFamilyBySlug: GetFamilyBySlug;
  constructor({
    getFamilyById,
    getFamilyBySlug
  }: GetFamilyBySlugControllerDependencies) {
    super();
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
        params: { idOrSlug }
      } = getValidatedRequest(res, getFamilyByIdOrSlugRequest);

      const family = UuidValidator.isValid(idOrSlug)
        ? await this.getFamilyById.execute(idOrSlug)
        : await this.getFamilyBySlug.execute(idOrSlug);

      const response = familyDomainMapper.toPrimitives(family);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
