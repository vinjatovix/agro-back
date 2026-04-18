import type { NextFunction, Request, Response } from 'express';
import { createError } from '../../../../../shared/errors/index.js';

export const validateBody = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (Object.keys(req.body).length) {
    return next();
  }

  throw createError.badRequest('Empty body is not allowed');
};
