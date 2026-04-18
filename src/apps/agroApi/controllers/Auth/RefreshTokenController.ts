import { type NextFunction, type Request, type Response } from 'express';
import type { RefreshToken } from '../../../../Contexts/agroApi/Auth/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class RefreshTokenController extends HttpController {
  constructor(protected readonly refreshToken: RefreshToken) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = res.locals.user as { token: string };

      const refreshedToken = await this.refreshToken.run(token);
      res.status(this.status()).json({ token: refreshedToken });
    } catch (error) {
      next(error);
    }
  }
}
