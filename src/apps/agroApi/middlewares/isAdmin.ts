import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';
import type { AppContainer } from '../container.js';
import { EnsureAuthentication } from './EnsureAuthentication.js';

type RequestWithContainer = Request & {
  container: AppContainer;
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const container = (req as RequestWithContainer).container;

  return EnsureAuthentication.isAdministrator(
    {
      logger: container.resolve<AppLogger>('logger')
    },
    req,
    res,
    next
  );
};
