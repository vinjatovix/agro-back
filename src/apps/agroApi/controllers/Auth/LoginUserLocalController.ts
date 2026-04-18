import { type NextFunction, type Request, type Response } from 'express';
import type {
  LoginUserLocal,
  LoginUserRequest
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class LoginUserLocalController extends HttpController {
  constructor(protected readonly loginUser: LoginUserLocal) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = req.body as LoginUserRequest;
      const token = await this.loginUser.run(request);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  }
}
