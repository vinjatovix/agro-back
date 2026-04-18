import type { NextFunction, Request, Response } from 'express';
import type { AppLogger, EncrypterTool } from '../../../../../Contexts/shared/plugins/index.js';
import { HttpError, createError } from '../../../../../shared/errors/index.js';

type AuthDeps = {
  logger: AppLogger;
  encrypter: EncrypterTool;
};

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const headerIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return headerIp ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';
};

const getRequestContext = (req: Request): string => {
  const requestId = req.get('x-request-id') ?? 'none';

  return `ip=${getClientIp(req)} method=${req.method} path=${req.originalUrl} requestId=${requestId}`;
};

const getAdminDenyReason = (user: unknown): string | null => {
  if (!user || !Array.isArray((user as { roles?: unknown }).roles)) return 'missing_roles';
  if (!(user as { roles: string[] }).roles.includes('admin')) return 'insufficient_role';
  
  return null;
};

export class EnsureAuthentication {
  static async run(
    { logger, encrypter }: AuthDeps,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token: string = req.headers.authorization ?? '';
      if (!token.startsWith('Bearer ')) {
        logger.warn(
          `[auth] missing_bearer ${getRequestContext(req)}`
        );
        throw createError.auth('Invalid token');
      }

      const trimmedToken = token.replace('Bearer ', '');

      const userData = await encrypter.verifyToken(trimmedToken);
      if (!userData) {
        logger.warn(`[auth] invalid_token ${getRequestContext(req)}`);
        throw createError.auth('Invalid token');
      }

      res.locals.user = { ...userData, token: trimmedToken };
      next();
    } catch (error) {
      if (!(error instanceof HttpError)) {
        logger.error(`[auth] auth_middleware_failure ${getRequestContext(req)}`, error);
      }
      next(error);
    }
  }

  static isAdministrator(
    { logger }: Pick<AuthDeps, 'logger'>,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const user = res.locals.user;
    const denyReason = getAdminDenyReason(user);

    if (denyReason) {
      logger.warn(`[auth] ${denyReason} ${getRequestContext(req)}`);
      throw createError.auth('Insufficient permissions');
    }

    return next();
  }
}
