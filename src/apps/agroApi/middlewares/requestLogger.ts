import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../../../Contexts/shared/plugins/logger.plugin.js';

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_QUERY_PARAMS = new Set(['token']);

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const headerIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim();

  return headerIp ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';
};

const getRoutePath = (req: Request): string => {
  const routePath = (req.route as { path?: string } | undefined)?.path;

  if (typeof routePath === 'string') {
    return `${req.baseUrl}${routePath}` || req.path;
  }

  return req.path;
};

const getSanitizedQueryString = (req: Request): string => {
  const originalUrl = req.originalUrl;
  const queryIndex = originalUrl.indexOf('?');

  if (queryIndex === -1) {
    return '';
  }

  const searchParams = new URLSearchParams(originalUrl.slice(queryIndex + 1));

  for (const key of searchParams.keys()) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
      searchParams.set(key, REDACTED_VALUE);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
};

const getLoggableUrl = (req: Request): string => {
  return `${getRoutePath(req)}${getSanitizedQueryString(req)}`;
};

const getRequestSource = (req: Request): string => {
  const parts = [
    req.get('origin') && `origin="${req.get('origin')}"`,
    req.get('referer') && `referer="${req.get('referer')}"`
  ].filter(Boolean);

  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
};

const buildLogMessage = (
  req: Request,
  res: Response,
  elapsedMs: number
): string => {
  const clientIp = getClientIp(req);
  const userAgent = req.get('user-agent') ?? 'unknown';
  const requestId = req.get('x-request-id') ?? 'none';
  const url = getLoggableUrl(req);
  const source = getRequestSource(req);

  return `[request] ${clientIp} ${res.statusCode} ${req.method} ${url} ${elapsedMs.toFixed(2)}ms ua="${userAgent}" requestId=${requestId}${source}`;
};

export const createRequestLoggerMiddleware =
  (logger: AppLogger) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/favicon.ico') {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    let logged = false;

    const logRequest = (aborted: boolean): void => {
      if (logged) {
        return;
      }

      logged = true;

      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const message = buildLogMessage(req, res, elapsedMs);

      if (aborted) {
        logger.warn(`${message} aborted=true`);
        return;
      }

      logger.info(message);
    };

    res.once('finish', () => {
      logRequest(false);
    });

    res.once('close', () => {
      if (!res.writableEnded) {
        logRequest(true);
      }
    });

    next();
  };
