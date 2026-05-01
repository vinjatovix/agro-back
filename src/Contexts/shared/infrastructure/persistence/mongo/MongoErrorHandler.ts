import { MongoServerError } from 'mongodb';
import { createError } from '../../../../../shared/errors/index.js';
import { MONGO_ERROR_CODES } from './mongoErrorCodes.js';

export class MongoErrorHandler {
  static formatError(err: MongoServerError): void {
    if (err.code === MONGO_ERROR_CODES.DUPLICATE_KEY) {
      const mongoError = err;
      const keys = JSON.stringify(mongoError.errorResponse.keyValue);

      throw createError.badRequest(`Duplicate document with ${keys}`);
    }

    if (err.code === MONGO_ERROR_CODES.PATH_COLLISION) {
      throw createError.badRequest(err.errmsg || err.message);
    }

    if (err.code === MONGO_ERROR_CODES.VALIDATION_ERROR) {
      throw createError.badRequest(
        `Document validation failed: ${err.errmsg || err.message}`
      );
    }

    if (err.code === MONGO_ERROR_CODES.WRONG_TYPE) {
      throw createError.badRequest(
        `Invalid data type: ${err.errmsg || err.message}`
      );
    }

    if (
      err.code === MONGO_ERROR_CODES.DUPLICATE_INDEX ||
      err.code === MONGO_ERROR_CODES.INDEX_KEY_SPECS_CONFLICT ||
      err.code === MONGO_ERROR_CODES.CANNOT_CREATE_INDEX
    ) {
      throw createError.badRequest(`Index error: ${err.errmsg || err.message}`);
    }
  }
}
