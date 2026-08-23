import type { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';

import { errorHandler } from '../../../../src/apps/agroApi/middlewares/errorHandler.js';
import type { AppLogger } from '../../../../src/Contexts/shared/plugins/logger.plugin.js';
import {
  DomainException,
  DomainConflictException,
  DomainForbiddenException,
  DomainNotFoundException,
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../../src/Contexts/shared/domain/errors/index.js';
import { HttpError } from '../../../../src/shared/errors/index.js';

class MockAppLogger implements AppLogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
}

interface RequestBodyError extends SyntaxError {
  body?: string;
}

describe('errorHandler middleware', () => {
  let mockLogger: MockAppLogger;
  let mockRes: { status: jest.Mock; json: jest.Mock };
  let req: Request;
  let next: NextFunction;
  let res: Response;

  beforeEach(() => {
    mockLogger = new MockAppLogger();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    req = {} as Request;
    next = jest.fn() as NextFunction;
    res = mockRes as unknown as Response;
  });

  it('should handle HttpError and return its status and errors', () => {
    const httpError = new HttpError(
      httpStatus.BAD_REQUEST,
      'Bad request error',
      { field: 'is invalid' }
    );

    errorHandler({ logger: mockLogger })(httpError, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Bad request error',
      errors: { field: 'is invalid' }
    });
  });

  it('should handle HttpError without errors dictionary', () => {
    const httpError = new HttpError(httpStatus.UNAUTHORIZED, 'Unauthorized');

    errorHandler({ logger: mockLogger })(httpError, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.UNAUTHORIZED);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Unauthorized'
    });
  });

  it('should map InvalidArgumentException to 400 Bad Request', () => {
    const error = new InvalidArgumentException('InvalidArgument error message');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'InvalidArgument error message'
    });
  });

  it('should map DomainNotFoundException to 404 Not Found', () => {
    const error = new DomainNotFoundException('Resource not found');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.NOT_FOUND);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Resource not found'
    });
  });

  it('should map DomainConflictException to 409 Conflict', () => {
    const error = new DomainConflictException('Conflict occurred');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.CONFLICT);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Conflict occurred'
    });
  });

  it('should map DomainUnauthorizedException to 401 Unauthorized', () => {
    const error = new DomainUnauthorizedException('Unauthorized action');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.UNAUTHORIZED);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Unauthorized action'
    });
  });

  it('should map DomainForbiddenException to 403 Forbidden', () => {
    const error = new DomainForbiddenException('Access denied');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.FORBIDDEN);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Access denied'
    });
  });

  it('should handle URIError and return 400 with deterministic response', () => {
    const error = new URIError('Malformed URI');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Validation error',
      errors: {
        id: 'Invalid URL encoding in request path'
      }
    });
  });

  it('should handle SyntaxError with body property and return 400', () => {
    const error: RequestBodyError = new SyntaxError('Unexpected token }');
    error.body = 'some malformed body';

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Unexpected token }',
      errors: {
        body: 'Invalid JSON in request body'
      }
    });
  });

  it('should handle SyntaxError with body property and missing message', () => {
    const error: RequestBodyError = new SyntaxError();
    error.body = 'some malformed body';

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockRes.status).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Validation error',
      errors: {
        body: 'Invalid JSON in request body'
      }
    });
  });

  it('should handle unexpected generic Errors by logging and returning 500', () => {
    const error = new Error('Unexpected database failure');

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error at error handler',
      error
    );
    expect(mockRes.status).toHaveBeenCalledWith(
      httpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Internal server error'
    });
  });

  it('should handle unmapped DomainException by falling through to the general error handler (logging as error and returning 500)', () => {
    class CustomUnmappedException extends DomainException {
      constructor() {
        super('Very sensitive internal business error message');
      }
    }
    const error = new CustomUnmappedException();

    errorHandler({ logger: mockLogger })(error, req, res, next);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error at error handler',
      error
    );
    expect(mockRes.status).toHaveBeenCalledWith(
      httpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Internal server error'
    });
  });
});
