import { type NextFunction, type Request, type Response } from 'express';
import type { AuthenticateWithGithub } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { githubAuthRequest } from './requestSchemas.js';

export type AuthenticateWithGithubControllerDependencies = {
  authenticateWithGithub: AuthenticateWithGithub;
};

export class AuthenticateWithGithubController extends HttpController {
  protected readonly authenticateWithGithub: AuthenticateWithGithub;
  constructor({
    authenticateWithGithub
  }: AuthenticateWithGithubControllerDependencies) {
    super();
    this.authenticateWithGithub = authenticateWithGithub;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, githubAuthRequest);
      const token = await this.authenticateWithGithub.run(body);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
