import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { Uuid } from '../../../../Contexts/shared/domain/valueObject/Uuid.js';
import { HttpController } from '../../shared/HttpController.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';

type GetFamilyBySlugParams = {
  slug: string;
};

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
    req: Request<GetFamilyBySlugParams>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { slug } = req.params;

      const family = Uuid.isValid(slug)
        ? await this.getFamilyById.execute(slug)
        : await this.getFamilyBySlug.execute(slug);

      const response = familyDomainMapper.toPrimitives(family);

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
