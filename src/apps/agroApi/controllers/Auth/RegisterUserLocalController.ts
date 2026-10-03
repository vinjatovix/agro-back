import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { RegisterUserLocal } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { registerRequest } from './requestSchemas.js';

export type RegisterUserLocalControllerDependencies = {
  registerUserLocal: RegisterUserLocal;
};

export class RegisterUserLocalController extends HttpController {
  protected readonly registerUserLocal: RegisterUserLocal;
  constructor({ registerUserLocal }: RegisterUserLocalControllerDependencies) {
    super();
    this.registerUserLocal = registerUserLocal;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, registerRequest);
      await this.registerUserLocal.run(body);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };

  protected status(): number {
    return httpStatus.CREATED;
  }
}
