import { type NextFunction, type Request, type Response } from 'express';
import type { AuthenticateWithGoogle } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { googleAuthRequest } from './requestSchemas.js';

export type AuthenticateWithGoogleControllerDependencies = {
  authenticateWithGoogle: AuthenticateWithGoogle;
};

export class AuthenticateWithGoogleController extends HttpController {
  protected readonly authenticateWithGoogle: AuthenticateWithGoogle;
  constructor({
    authenticateWithGoogle
  }: AuthenticateWithGoogleControllerDependencies) {
    super();
    this.authenticateWithGoogle = authenticateWithGoogle;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, googleAuthRequest);
      const token = await this.authenticateWithGoogle.run(body);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
