import { type NextFunction, type Request, type Response } from 'express';
import type { ValidateMail } from '../../../../Contexts/agroApi/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class ValidateMailController extends HttpController {
  constructor(protected readonly validateMail: ValidateMail) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  }
}
