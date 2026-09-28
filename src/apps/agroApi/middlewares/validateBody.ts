import type { NextFunction, Request, Response } from 'express';
import { createError } from '../../../shared/errors/index.js';

/* eslint-disable @typescript-eslint/no-unsafe-argument */

export const validateBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Express 5 leaves req.body undefined when no body parser matched.
  if (req.body && Object.keys(req.body).length) {
    return next();
  }

  throw createError.badRequest('Empty body is not allowed');
};
