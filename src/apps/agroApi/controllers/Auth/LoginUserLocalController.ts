import { type NextFunction, type Request, type Response } from 'express';
import type { LoginUserLocal } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { loginRequest } from './requestSchemas.js';

export type LoginUserLocalControllerDependencies = {
  loginUser: LoginUserLocal;
};

export class LoginUserLocalController extends HttpController {
  protected readonly loginUser: LoginUserLocal;
  constructor({ loginUser }: LoginUserLocalControllerDependencies) {
    super();
    this.loginUser = loginUser;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, loginRequest);
      const token = await this.loginUser.run(body);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
