import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type {
  RegisterUser,
  RegisterUserRequest
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class RegisterUserController extends HttpController {
  constructor(protected readonly registerUser: RegisterUser) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = req.body as RegisterUserRequest;
      await this.registerUser.run(request);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  }

  protected status(): number {
    return httpStatus.CREATED;
  }
}
