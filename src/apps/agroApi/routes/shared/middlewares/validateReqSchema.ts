import type { NextFunction, Request, Response } from 'express';
import {
  type FieldValidationError,
  type UnknownFieldsError,
  type ValidationError,
  validationResult
} from 'express-validator';
import { createError } from '../../../../../shared/errors/index.js';

/* eslint-disable 
@typescript-eslint/no-unsafe-assignment, 
@typescript-eslint/no-unsafe-member-access, 
@typescript-eslint/no-unsafe-argument, 
@typescript-eslint/no-unsafe-call
 */

type ValidationErrorInfo = Record<string, string>;

const HIDDEN_FIELDS = new Set(['password', 'repeatPassword']);

const extractFieldErrorInfo = (
  error: FieldValidationError
): ValidationErrorInfo => {
  const baseMessage = `${error.msg} at ${error.location}.`;
  const value = HIDDEN_FIELDS.has(error.path)
    ? baseMessage
    : `${baseMessage} Value: ${error.value}`;
  return { [error.path]: value };
};

const extractUnknownFieldsErrorInfo = (
  error: UnknownFieldsError
): ValidationErrorInfo => {
  const fields = error.fields
    .map(
      (field) =>
        `Unknown field <${field.path}> in <${field.location}> with value <${field.value}>`
    )
    .join(',');
  return { fields };
};

const extractGenericErrorInfo = (
  error: ValidationError
): ValidationErrorInfo => ({
  message: error.msg || 'Unknown error'
});

const extractErrorInfo = (error: ValidationError): ValidationErrorInfo => {
  switch (error.type) {
    case 'field':
      return extractFieldErrorInfo(error);
    case 'unknown_fields':
      return extractUnknownFieldsErrorInfo(error);
    default:
      return extractGenericErrorInfo(error);
  }
};

export const validateReqSchema = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const validationErrors = validationResult(req);
  if (validationErrors.isEmpty()) {
    return next();
  }

  const errorMessages = validationErrors
    .array()
    .reduce((acc: ValidationErrorInfo, error: ValidationError) => {
      const info = extractErrorInfo(error);
      const entry = Object.entries(info)[0];
      if (entry && !(entry[0] in acc)) acc[entry[0]] = entry[1];
      return acc;
    }, {});

  throw createError.badRequest(
    JSON.stringify(errorMessages).replaceAll('"', ' ')
  );
};
