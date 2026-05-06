import { type NextFunction, type Request, type Response } from 'express';
import type { ValidateMail } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type ValidateMailControllerDependencies = {
  validateMail: ValidateMail;
};

export class ValidateMailController extends HttpController {
  protected readonly validateMail: ValidateMail;
  constructor({ validateMail }: ValidateMailControllerDependencies) {
    super();
    this.validateMail = validateMail;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      if (!token) {
        throw createError.badRequest('Token is required');
      }

      const newToken = await this.validateMail.run({ token });

      res.status(this.status()).json({ token: newToken });
    } catch (error) {
      next(error);
    }
  };
}
