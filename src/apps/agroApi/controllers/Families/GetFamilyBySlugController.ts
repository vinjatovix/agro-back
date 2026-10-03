import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { UuidValidator } from '../../../../Contexts/shared/domain/valueObject/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { getFamilyByIdOrSlugRequest } from './requestSchemas.js';
import { familyResponseSchema } from './responseSchemas.js';

export type GetFamilyBySlugControllerDependencies = {
  getFamilyById: GetFamilyById;
  getFamilyBySlug: GetFamilyBySlug;
  logger: AppLogger;
};

export class GetFamilyBySlugController extends HttpController {
  protected readonly getFamilyById: GetFamilyById;
  protected readonly getFamilyBySlug: GetFamilyBySlug;
  private readonly logger: AppLogger;

  constructor({
    getFamilyById,
    getFamilyBySlug,
    logger
  }: GetFamilyBySlugControllerDependencies) {
    super();
    this.getFamilyById = getFamilyById;
    this.getFamilyBySlug = getFamilyBySlug;
    this.logger = logger;
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

      const body = checkResponse(familyResponseSchema, family, {
        resource: 'Family',
        id: family.id,
        logger: this.logger
      });

      setVersionETag(res, body.version);
      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
