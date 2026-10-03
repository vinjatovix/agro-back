import { type NextFunction, type Request, type Response } from 'express';
import type { LoginUserLocal } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { loginRequest } from './requestSchemas.js';

export type LoginUserLocalControllerDependencies = {
  loginUserLocal: LoginUserLocal;
};

export class LoginUserLocalController extends HttpController {
  protected readonly loginUserLocal: LoginUserLocal;
  constructor({ loginUserLocal }: LoginUserLocalControllerDependencies) {
    super();
    this.loginUserLocal = loginUserLocal;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, loginRequest);
      const token = await this.loginUserLocal.run(body);
      res.status(this.status()).json({ token });
    } catch (error) {
      next(error);
    }
  };
}
