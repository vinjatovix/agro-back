import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { ActivateAccount } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { activateRequest } from './requestSchemas.js';

export type ActivateAccountControllerDependencies = {
  activateAccount: ActivateAccount;
};

export class ActivateAccountController extends HttpController {
  protected readonly activateAccount: ActivateAccount;
  constructor({ activateAccount }: ActivateAccountControllerDependencies) {
    super();
    this.activateAccount = activateAccount;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = getValidatedRequest(res, activateRequest).body;
      await this.activateAccount.run({ token });
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };

  protected status(): number {
    return httpStatus.NO_CONTENT;
  }
}
