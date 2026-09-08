import { type NextFunction, type Request, type Response } from 'express';
import type {
  AuthenticateWithGoogle,
  AuthenticateWithGoogleRequest
} from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

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

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body as AuthenticateWithGoogleRequest;
      const token = await this.authenticateWithGoogle.run(request);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
