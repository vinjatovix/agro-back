import { type NextFunction, type Request, type Response } from 'express';
import type {
  AuthenticateWithGoogle,
  AuthenticateWithGoogleRequest
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class AuthenticateWithGoogleController extends HttpController {
  constructor(
    protected readonly authenticateWithGoogle: AuthenticateWithGoogle
  ) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = req.body as AuthenticateWithGoogleRequest;
      const token = await this.authenticateWithGoogle.run(request);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  }
}
