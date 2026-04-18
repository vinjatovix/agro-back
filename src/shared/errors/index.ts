import httpStatus from 'http-status';

export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
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
  constructor(message = 'Bad Request') {
    super(httpStatus.BAD_REQUEST, message);
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
  badRequest: (message: string) => BadRequestError;
  test: (message: string) => TestError;
}

export const createError: CreateError = {
  auth: (message: string): UnauthorizedError => new UnauthorizedError(message),
  conflict: (message: string): ConflictError => new ConflictError(message),
  forbidden: (message: string): ForbiddenError => new ForbiddenError(message),
  notFound: (message: string): NotFoundError => new NotFoundError(message),
  badRequest: (message: string): BadRequestError =>
    new BadRequestError(message),
  test: (message: string): TestError => new TestError(message)
};
