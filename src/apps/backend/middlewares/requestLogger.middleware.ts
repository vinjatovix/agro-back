import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../Contexts/shared/plugins/loggerPlugin.js';

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const headerIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return headerIp ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';
};

export const createRequestLoggerMiddleware =
  (logger: AppLogger) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/favicon.ico') {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const elapsedTimeMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const clientIp = getClientIp(req);
      const userAgent = req.get('user-agent') ?? 'unknown';
      const requestId = req.get('x-request-id') ?? 'none';

      logger.info(
        `[request] ${clientIp} ${res.statusCode} ${req.method} ${req.originalUrl} ${elapsedTimeMs.toFixed(
          2
        )}ms ua="${userAgent}" requestId=${requestId}`
      );
    });

    next();
  };
