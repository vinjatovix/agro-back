import httpStatus from 'http-status';

export type ValidationFieldError = {
  message: string;
  value?: unknown;
};

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string>
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;

    if (errors !== undefined) {
      this.errors = errors;
    }

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(httpStatus.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(httpStatus.FORBIDDEN, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found') {
    super(httpStatus.NOT_FOUND, message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', errors?: Record<string, string>) {
    super(httpStatus.BAD_REQUEST, message, errors);
  }
}

export class TestError extends HttpError {
  constructor(message = 'Test Error') {
    super(httpStatus.IM_A_TEAPOT, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(httpStatus.CONFLICT, message);
  }
}

interface CreateError {
  auth: (message: string) => UnauthorizedError;
  conflict: (message: string) => ConflictError;
  forbidden: (message: string) => ForbiddenError;
  notFound: (message: string) => NotFoundError;
  badRequest: (
    message: string,
    errors?: Record<string, string>
  ) => BadRequestError;
  test: (message: string) => TestError;
}

export const createError: CreateError = {
  auth: (message: string) => new UnauthorizedError(message),
  conflict: (message: string) => new ConflictError(message),
  forbidden: (message: string) => new ForbiddenError(message),
  notFound: (message: string) => new NotFoundError(message),
  badRequest: (message: string, errors?: Record<string, string>) =>
    new BadRequestError(message, errors),
  test: (message: string) => new TestError(message)
};
