import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';
import type { EncrypterTool } from '../../../Contexts/shared/plugins/EncrypterTool.js';
import type { AppContainer } from '../container.js';
import { EnsureAuthentication } from './EnsureAuthentication.js';
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

export const auth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await EnsureAuthentication.run(getDeps(req), req, res, next);
  }
);
