import type { NextFunction, Request, Response } from 'express';
import {
  type FieldValidationError,
  type UnknownFieldsError,
  type ValidationError,
  validationResult
} from 'express-validator';
import { createError } from '../../../shared/errors/index.js';

type ValidationErrorInfo = Record<string, string>;

const HIDDEN_FIELDS = new Set(['password', 'repeatPassword']);

const formatValue = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

const extractFieldErrorInfo = (
  error: FieldValidationError
): ValidationErrorInfo => {
  const baseMessage = `${String(error.msg)} at ${error.location}.`;

  const valuePart = HIDDEN_FIELDS.has(error.path)
    ? ''
    : ` Value: ${formatValue(error.value)}`;

  return {
    [error.path]: `${baseMessage}${valuePart}`
  };
};

const extractUnknownFieldsErrorInfo = (
  error: UnknownFieldsError
): ValidationErrorInfo => {
  const fields = error.fields
    .map(
      (field) =>
        `Unknown field <${field.path}> in <${field.location}> with value <${formatValue(field.value)}>`
    )
    .join(', ');

  return { fields };
};

const extractGenericErrorInfo = (
  error: ValidationError
): ValidationErrorInfo => {
  return {
    message: String(error.msg ?? 'Unknown error')
  };
};

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
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errorMessages = result
    .array()
    .reduce<ValidationErrorInfo>((acc, error) => {
      const info = extractErrorInfo(error);

      for (const [key, value] of Object.entries(info)) {
        if (!(key in acc)) {
          acc[key] = value;
        }
      }

      return acc;
    }, {});

  throw createError.badRequest('Validation error', errorMessages);
};
