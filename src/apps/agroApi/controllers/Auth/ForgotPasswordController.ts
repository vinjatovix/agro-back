import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { ForgotPassword } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { forgotPasswordRequest } from './requestSchemas.js';

export type ForgotPasswordControllerDependencies = {
  forgotPassword: ForgotPassword;
};

export class ForgotPasswordController extends HttpController {
  protected readonly forgotPassword: ForgotPassword;

  constructor({ forgotPassword }: ForgotPasswordControllerDependencies) {
    super();
    this.forgotPassword = forgotPassword;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, forgotPasswordRequest);
      await this.forgotPassword.run(body);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };

  protected status(): number {
    return httpStatus.ACCEPTED;
  }
}
