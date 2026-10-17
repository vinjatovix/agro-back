import { type NextFunction, type Request, type Response } from 'express';

import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { ChangeUserRoles } from '../../../../Contexts/Auth/application/useCases/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { changeUserRolesRequest } from './requestSchemas.js';
import { toUserRolesView } from './userResponse.js';

export type ChangeUserRolesControllerDependencies = {
  changeUserRoles: ChangeUserRoles;
};

export class ChangeUserRolesController extends HttpController {
  private readonly changeUserRoles: ChangeUserRoles;

  constructor({ changeUserRoles }: ChangeUserRolesControllerDependencies) {
    super();
    this.changeUserRoles = changeUserRoles;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body } = getValidatedRequest(res, changeUserRolesRequest);
      const actor = (res.locals.user as UserSessionInfo).username;

      const result = await this.changeUserRoles.execute(
        {
          userId: params.userId,
          add: body.add ?? [],
          remove: body.remove ?? []
        },
        actor,
        getExpectedVersions(res)
      );

      setVersionETag(res, result.version ?? 0);
      res.status(this.status()).json(toUserRolesView(result));
    } catch (error) {
      next(error);
    }
  };
}
