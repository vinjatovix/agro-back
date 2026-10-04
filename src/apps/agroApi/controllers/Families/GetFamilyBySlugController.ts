import { type NextFunction, type Request, type Response } from 'express';
import type { GetFamilyById } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import type { GetFamilyBySlug } from '../../../../Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { UuidValidator } from '../../../../Contexts/shared/domain/valueObject/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import {
  isFullRepresentation,
  setVersionETag
} from '../../shared/versionTags.js';
import { getFamilyByIdOrSlugRequest } from './requestSchemas.js';
import {
  familyFieldsetResponseSchema,
  familyResponseSchema
} from './responseSchemas.js';

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
        params: { idOrSlug },
        query
      } = getValidatedRequest(res, getFamilyByIdOrSlugRequest);

      const family = UuidValidator.isValid(idOrSlug)
        ? await this.getFamilyById.execute(idOrSlug, query)
        : await this.getFamilyBySlug.execute(idOrSlug, query);
      const context = {
        resource: 'Family' as const,
        id: family.id,
        logger: this.logger
      };

      // A tailored body is not the representation the version names: no ETag.
      if (!isFullRepresentation(query)) {
        res
          .status(this.status())
          .json(
            checkResponse(
              familyFieldsetResponseSchema(query.fields),
              family,
              context
            )
          );
        return;
      }

      const body = checkResponse(familyResponseSchema, family, context);

      setVersionETag(res, body.version);
      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
