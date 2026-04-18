import type { MongoServerError } from 'mongodb';

import { BadRequestError } from '../../../../../../src/shared/errors/index.js';
import { MongoErrorHandler } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoErrorHandler.js';
import { MONGO_ERROR_CODES } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/mongoErrorCodes.js';

describe('MongoErrorHandler', () => {
  describe('formatError', () => {
    it('should throw BadRequestError for DUPLICATE_KEY error with keyValue', () => {
      const duplicateKeyError = {
        code: MONGO_ERROR_CODES.DUPLICATE_KEY,
        errorResponse: {
          keyValue: { email: 'test@example.com' }
        }
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(duplicateKeyError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(duplicateKeyError);
      }).toThrow('Duplicate document with {"email":"test@example.com"}');
    });

    it('should throw BadRequestError for PATH_COLLISION error with errmsg', () => {
      const pathCollisionError = {
        code: MONGO_ERROR_CODES.PATH_COLLISION,
        errmsg: 'Cannot create index with path collision',
        message: 'fallback message'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(pathCollisionError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(pathCollisionError);
      }).toThrow('Cannot create index with path collision');
    });

    it('should fallback to message property when errmsg is not available for PATH_COLLISION', () => {
      const pathCollisionError = {
        code: MONGO_ERROR_CODES.PATH_COLLISION,
        message: 'fallback error message'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(pathCollisionError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(pathCollisionError);
      }).toThrow('fallback error message');
    });

    it('should not throw for unknown error codes', () => {
      const unknownError = {
        code: 99999,
        message: 'Some other error'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(unknownError);
      }).not.toThrow();
    });

    it('should handle multiple duplicate keys', () => {
      const duplicateKeyError = {
        code: MONGO_ERROR_CODES.DUPLICATE_KEY,
        errorResponse: {
          keyValue: {
            email: 'test@example.com',
            username: 'testuser'
          }
        }
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(duplicateKeyError);
      }).toThrow('Duplicate document with {"email":"test@example.com","username":"testuser"}');
    });

    it('should throw BadRequestError for VALIDATION_ERROR', () => {
      const validationError = {
        code: MONGO_ERROR_CODES.VALIDATION_ERROR,
        errmsg: 'User validation failed',
        message: 'fallback message'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(validationError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(validationError);
      }).toThrow('Document validation failed: User validation failed');
    });

    it('should throw BadRequestError for WRONG_TYPE error', () => {
      const wrongTypeError = {
        code: MONGO_ERROR_CODES.WRONG_TYPE,
        errmsg: 'age must be a number',
        message: 'Type mismatch'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(wrongTypeError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(wrongTypeError);
      }).toThrow('Invalid data type: age must be a number');
    });

    it('should throw BadRequestError for DUPLICATE_INDEX error', () => {
      const duplicateIndexError = {
        code: MONGO_ERROR_CODES.DUPLICATE_INDEX,
        errmsg: 'Index with name: email_1 already exists'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(duplicateIndexError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(duplicateIndexError);
      }).toThrow('Index error: Index with name: email_1 already exists');
    });

    it('should throw BadRequestError for INDEX_KEY_SPECS_CONFLICT error', () => {
      const indexConflictError = {
        code: MONGO_ERROR_CODES.INDEX_KEY_SPECS_CONFLICT,
        errmsg: 'Index key specs conflict'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(indexConflictError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(indexConflictError);
      }).toThrow('Index error: Index key specs conflict');
    });

    it('should throw BadRequestError for CANNOT_CREATE_INDEX error', () => {
      const cannotCreateIndexError = {
        code: MONGO_ERROR_CODES.CANNOT_CREATE_INDEX,
        errmsg: 'Cannot create index due to schema restrictions'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(cannotCreateIndexError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(cannotCreateIndexError);
      }).toThrow('Index error: Cannot create index due to schema restrictions');
    });
  });
});
