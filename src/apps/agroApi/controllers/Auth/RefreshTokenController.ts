import { type NextFunction, type Request, type Response } from 'express';
import type { RefreshToken } from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type RefreshTokenControllerDependencies = {
  refreshToken: RefreshToken;
};

/** Session set by the auth middleware: the verified token and its payload. */
type SessionLocals = { token: string; id?: unknown };

export class RefreshTokenController extends HttpController {
  protected readonly refreshToken: RefreshToken;
  constructor({ refreshToken }: RefreshTokenControllerDependencies) {
    super();
    this.refreshToken = refreshToken;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token, id } = res.locals.user as SessionLocals;

      const refreshedToken = await this.refreshToken.run({
        token,
        userId: typeof id === 'string' ? id : ''
      });
      res.status(this.status()).json({ token: refreshedToken });
    } catch (error) {
      next(error);
    }
  };
}
