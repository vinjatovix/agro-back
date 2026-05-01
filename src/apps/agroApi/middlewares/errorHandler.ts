import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';
import { HttpError } from '../../../shared/errors/index.js';
import type { ApiErrorResponse } from '../shared/interfaces/ApiErrorResponse.js';

type ErrorHandlerDeps = {
  logger: AppLogger;
};

export const errorHandler =
  ({ logger }: ErrorHandlerDeps) =>
  (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({
        message: err.message,
        ...(err.errors && { errors: err.errors })
      } satisfies ApiErrorResponse);
      return;
    }

    if (err instanceof URIError) {
      res.status(httpStatus.BAD_REQUEST).json({
        message: 'Validation error',
        errors: {
          id: 'Invalid URL encoding in request path'
        }
      } satisfies ApiErrorResponse);
      return;
    }

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(httpStatus.BAD_REQUEST).json({
        message: err.message || 'Validation error',
        errors: {
          body: 'Invalid JSON in request body'
        }
      } satisfies ApiErrorResponse);
      return;
    }

    logger.error('Unexpected error at error handler', err);

    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error'
    });
  };
