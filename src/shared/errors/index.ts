import { HttpError } from './http-error.js';
import httpStatus from 'http-status';

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
