import { type NextFunction, type Request, type Response } from 'express';

import type { LookupUser } from '../../../../Contexts/Auth/application/useCases/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { lookupUserRequest } from './requestSchemas.js';
import { toUserLookupView } from './userResponse.js';

export type LookupUserControllerDependencies = {
  lookupUser: LookupUser;
};

export class LookupUserController extends HttpController {
  private readonly lookupUser: LookupUser;

  constructor({ lookupUser }: LookupUserControllerDependencies) {
    super();
    this.lookupUser = lookupUser;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, lookupUserRequest);

      const result = await this.lookupUser.execute({
        ...(query.email !== undefined && { email: query.email }),
        ...(query.username !== undefined && { username: query.username })
      });

      setVersionETag(res, result.version ?? 0);
      res.status(this.status()).json(toUserLookupView(result));
    } catch (error) {
      next(error);
    }
  };
}
