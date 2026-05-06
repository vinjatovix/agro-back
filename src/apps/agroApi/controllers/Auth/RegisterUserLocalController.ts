import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type {
  RegisterUserLocal,
  RegisterUserRequest
} from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type RegisterUserLocalControllerDependencies = {
  registerUser: RegisterUserLocal;
};

export class RegisterUserLocalController extends HttpController {
  protected readonly registerUser: RegisterUserLocal;
  constructor({ registerUser }: RegisterUserLocalControllerDependencies) {
    super();
    this.registerUser = registerUser;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body as RegisterUserRequest;
      await this.registerUser.run(request);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };

  protected status(): number {
    return httpStatus.CREATED;
  }
}
