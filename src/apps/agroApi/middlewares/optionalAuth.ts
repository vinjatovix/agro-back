import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';
import type { EncrypterTool } from '../../../Contexts/shared/plugins/EncrypterTool.js';
import type { AppContainer } from '../container.js';
import { createError } from '../../../shared/errors/index.js';
import { asyncHandler } from './helpers/asyncHandler.js';

type RequestWithContainer = Request & {
  container: AppContainer;
};

const getDeps = (req: Request) => {
  const container = (req as RequestWithContainer).container;
  return {
    logger: container.resolve<AppLogger>('logger'),
    encrypter: container.resolve<EncrypterTool>('encrypter')
  };
};

export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { logger, encrypter } = getDeps(req);

    try {
      const token = req.headers.authorization;

      if (!token) {
        return next();
      }

      if (!token.startsWith('Bearer ')) {
        logger.warn('[auth] invalid_bearer_optional');
        return next(createError.auth('Invalid token'));
      }

      const trimmed = token.replace('Bearer ', '');

      const userData = await encrypter.verifyToken(trimmed);
      if (!userData) {
        logger.warn('[auth] invalid_token_optional');
        return next(createError.auth('Invalid token'));
      }

      res.locals.user = {
        ...userData,
        token: trimmed
      };

      next();
    } catch (error) {
      logger.error('[auth] optional_auth_failure', error);
      next(error);
    }
  }
);
