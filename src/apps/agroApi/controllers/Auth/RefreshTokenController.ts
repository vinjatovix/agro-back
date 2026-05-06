import { type NextFunction, type Request, type Response } from 'express';
import type { RefreshToken } from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type RefreshTokenControllerDependencies = {
  refreshToken: RefreshToken;
};

export class RefreshTokenController extends HttpController {
  protected readonly refreshToken: RefreshToken;
  constructor({ refreshToken }: RefreshTokenControllerDependencies) {
    super();
    this.refreshToken = refreshToken;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = res.locals.user as { token: string };

      const refreshedToken = await this.refreshToken.run(token);
      res.status(this.status()).json({ token: refreshedToken });
    } catch (error) {
      next(error);
    }
  };
}
