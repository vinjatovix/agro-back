import type { MongoServerError } from 'mongodb';

import {
  BadRequestError,
  ConflictError
} from '../../../../../../src/shared/errors/index.js';
import { MongoErrorHandler } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoErrorHandler.js';
import { MONGO_ERROR_CODES } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/mongoErrorCodes.js';

describe('MongoErrorHandler', () => {
  describe('formatError', () => {
    it('should throw ConflictError for DUPLICATE_KEY error with keyValue', () => {
      const duplicateKeyError = {
        code: MONGO_ERROR_CODES.DUPLICATE_KEY,
        errorResponse: {
          keyValue: { email: 'test@example.com' }
        }
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(duplicateKeyError);
      }).toThrow(ConflictError);

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

    it('should rethrow unknown errors', () => {
      const unknownError = {
        code: 99999,
        message: 'Some other error'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(unknownError);
      }).toThrow(unknownError);
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
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(duplicateKeyError);
      }).toThrow(
        'Duplicate document with {"email":"test@example.com","username":"testuser"}'
      );
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
      }).toThrow('age must be a number');
    });

    it('should throw BadRequestError for DUPLICATE_INDEX error', () => {
      const duplicateIndexError = {
        code: MONGO_ERROR_CODES.DUPLICATE_INDEX,
        errmsg: 'Index with name: email_1 already exists'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(duplicateIndexError);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(duplicateIndexError);
      }).toThrow('Index error: Index with name: email_1 already exists');
    });

    it('should throw BadRequestError for BAD_VALUE error', () => {
      const badValueError = {
        code: MONGO_ERROR_CODES.BAD_VALUE,
        errmsg: 'Invalid field value'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(badValueError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(badValueError);
      }).toThrow('Invalid field value');
    });

    it('should throw ConflictError for INDEX_OPTIONS_CONFLICT error', () => {
      const error = {
        code: MONGO_ERROR_CODES.INDEX_OPTIONS_CONFLICT,
        errmsg: 'Index already exists with different options'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(error);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(error);
      }).toThrow('Index error: Index already exists with different options');
    });

    it('should throw ConflictError for INDEX_KEY_SPECS_CONFLICT error', () => {
      const error = {
        code: MONGO_ERROR_CODES.INDEX_KEY_SPECS_CONFLICT,
        errmsg: 'Index key specs conflict'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(error);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(error);
      }).toThrow('Index error: Index key specs conflict');
    });

    it('should throw ConflictError for CANNOT_CREATE_INDEX error', () => {
      const cannotCreateIndexError = {
        code: MONGO_ERROR_CODES.CANNOT_CREATE_INDEX,
        errmsg: 'Cannot create index due to schema restrictions'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(cannotCreateIndexError);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(cannotCreateIndexError);
      }).toThrow('Index error: Cannot create index due to schema restrictions');
    });

    it('should throw ConflictError for INDEX_ALREADY_EXISTS error', () => {
      const indexAlreadyExistsError = {
        code: MONGO_ERROR_CODES.INDEX_ALREADY_EXISTS,
        errmsg: 'Index already exists'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(indexAlreadyExistsError);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(indexAlreadyExistsError);
      }).toThrow('Index error: Index already exists');
    });

    it('should throw ConflictError for NAMESPACE_EXISTS error', () => {
      const namespaceExistsError = {
        code: MONGO_ERROR_CODES.NAMESPACE_EXISTS,
        errmsg: 'Namespace already exists'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(namespaceExistsError);
      }).toThrow(ConflictError);

      expect(() => {
        MongoErrorHandler.formatError(namespaceExistsError);
      }).toThrow('Index error: Namespace already exists');
    });

    it('should throw BadRequestError for BSON_OBJECT_TOO_LARGE', () => {
      const bsonObjectTooLargeError = {
        code: MONGO_ERROR_CODES.BSON_OBJECT_TOO_LARGE,
        errmsg: 'object too large'
      } as unknown as MongoServerError;

      expect(() => {
        MongoErrorHandler.formatError(bsonObjectTooLargeError);
      }).toThrow(BadRequestError);

      expect(() => {
        MongoErrorHandler.formatError(bsonObjectTooLargeError);
      }).toThrow('Document exceeds maximum BSON size');
    });
  });
});
