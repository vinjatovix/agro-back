import { MongoServerError } from 'mongodb';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../domain/errors/index.js';
import { MONGO_ERROR_CODES } from './mongoErrorCodes.js';

const DUPLICATE_OR_CONFLICT_CODES = [
  MONGO_ERROR_CODES.DUPLICATE_KEY,
  MONGO_ERROR_CODES.DUPLICATE_INDEX,
  MONGO_ERROR_CODES.INDEX_ALREADY_EXISTS,
  MONGO_ERROR_CODES.NAMESPACE_EXISTS,
  MONGO_ERROR_CODES.INDEX_OPTIONS_CONFLICT,
  MONGO_ERROR_CODES.INDEX_KEY_SPECS_CONFLICT,
  MONGO_ERROR_CODES.CANNOT_CREATE_INDEX
] as const;

const VALIDATION_CODES = [
  MONGO_ERROR_CODES.VALIDATION_ERROR,
  MONGO_ERROR_CODES.WRONG_TYPE,
  MONGO_ERROR_CODES.BAD_VALUE,
  MONGO_ERROR_CODES.IMMUTABLE_FIELD,
  MONGO_ERROR_CODES.PATH_COLLISION
] as const;

function isInArray<T extends readonly number[]>(
  arr: T,
  value: number
): boolean {
  return (arr as readonly number[]).includes(value);
}

export class MongoErrorHandler {
  static formatError(err: MongoServerError): never {
    const message = err.errmsg || err.message;
    const code = err.code as number | undefined;

    if (code === undefined) {
      throw err;
    }

    if (isInArray(DUPLICATE_OR_CONFLICT_CODES, code)) {
      if (code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
        const keyValue =
          'keyValue' in err.errorResponse
            ? JSON.stringify(err.errorResponse.keyValue)
            : '{}';

        throw new DomainConflictException(
          `Duplicate document with ${keyValue}`
        );
      }

      throw new DomainConflictException(`Index error: ${message}`);
    }

    if (isInArray(VALIDATION_CODES, code)) {
      if (code === MONGO_ERROR_CODES.VALIDATION_ERROR) {
        throw new InvalidArgumentException(
          `Document validation failed: ${message}`
        );
      }

      throw new InvalidArgumentException(message);
    }

    if (code === MONGO_ERROR_CODES.BSON_OBJECT_TOO_LARGE) {
      throw new InvalidArgumentException('Document exceeds maximum BSON size');
    }

    throw err;
  }
}
