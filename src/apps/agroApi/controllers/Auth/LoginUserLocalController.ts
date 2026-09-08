import { type NextFunction, type Request, type Response } from 'express';
import type {
  LoginUserLocal,
  LoginUserRequest
} from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type LoginUserLocalControllerDependencies = {
  loginUser: LoginUserLocal;
};

export class LoginUserLocalController extends HttpController {
  protected readonly loginUser: LoginUserLocal;
  constructor({ loginUser }: LoginUserLocalControllerDependencies) {
    super();
    this.loginUser = loginUser;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body as LoginUserRequest;
      const token = await this.loginUser.run(request);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
