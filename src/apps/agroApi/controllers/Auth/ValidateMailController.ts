import { type NextFunction, type Request, type Response } from 'express';
import type { ValidateMail } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { validateMailRequest } from './requestSchemas.js';

export type ValidateMailControllerDependencies = {
  validateMail: ValidateMail;
};

export class ValidateMailController extends HttpController {
  protected readonly validateMail: ValidateMail;
  constructor({ validateMail }: ValidateMailControllerDependencies) {
    super();
    this.validateMail = validateMail;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = getValidatedRequest(res, validateMailRequest).params;

      const newToken = await this.validateMail.run({ token });

      res.status(this.status()).json({ token: newToken });
    } catch (error) {
      next(error);
    }
  };
}
