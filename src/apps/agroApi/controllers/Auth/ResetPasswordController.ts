import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { ResetPassword } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { resetPasswordRequest } from './requestSchemas.js';

export type ResetPasswordControllerDependencies = {
  resetPassword: ResetPassword;
};

export class ResetPasswordController extends HttpController {
  protected readonly resetPassword: ResetPassword;

  constructor({ resetPassword }: ResetPasswordControllerDependencies) {
    super();
    this.resetPassword = resetPassword;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, resetPasswordRequest);
      await this.resetPassword.run(body);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };

  protected status(): number {
    return httpStatus.NO_CONTENT;
  }
}
