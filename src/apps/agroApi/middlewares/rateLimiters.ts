import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type Skip = (req: Request) => boolean;

/** Limiters are off in the test suite, where every scenario shares one IP. */
const skipInTests: Skip = (_req: Request) => process.env.NODE_ENV === 'test';

export const globalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests
});

/** Counts failed attempts only: login, Google sign-in, activation. */
export const createAuthLimiter = ({
  skip = skipInTests
}: { skip?: Skip } = {}): RequestHandler =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip
  });

/**
 * Counts every registration: each one answers the same success and may send
 * an email, so counting only failures would allow unlimited emails.
 */
export const createRegistrationLimiter = ({
  skip = skipInTests
}: { skip?: Skip } = {}): RequestHandler =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skip
  });

export const authLimiter = createAuthLimiter();

export const registrationLimiter = createRegistrationLimiter();

export const strictLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 30,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests
});
