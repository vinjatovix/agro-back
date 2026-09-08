import { body, checkExact, param } from 'express-validator';
import type { FamilyExtraPrimitives } from '../../../../Contexts/Agro/Families/domain/types/FamilyExtraPrimitives.js';
import { createError } from '../../../../shared/errors/index.js';

const ALLOWED_EXTRA_KEYS = [
  'order',
  'distribution',
  'speciesCount',
  'subfamilies'
];

const validateExtraFields = (
  extra: FamilyExtraPrimitives | null | undefined,
  allowNull = false
) => {
  if (extra === undefined) {
    return true;
  }

  // PATCH semantic: null = explicit deletion
  if (extra === null) {
    return allowNull;
  }

  // reject arrays / primitives
  if (typeof extra !== 'object' || Array.isArray(extra)) {
    return false;
  }

  const unknownKeys = Object.keys(extra).filter(
    (key) => !ALLOWED_EXTRA_KEYS.includes(key)
  );

  if (unknownKeys.length > 0) {
    throw createError.badRequest(
      'Unknown fields',
      Object.fromEntries(
        unknownKeys.map((key) => [key, 'This field is not allowed'])
      )
    );
  }

  return true;
};

const extraFieldsValidators = [
  body('extra').custom((value) => {
    if (value === null || value === undefined) return true;

    if (typeof value !== 'object' || Array.isArray(value)) return false;

    return true;
  }),

  body('extra.order').optional({ nullable: true }).isString().notEmpty(),

  body('extra.distribution').optional({ nullable: true }).isString().notEmpty(),

  body('extra.speciesCount').optional({ nullable: true }).isInt({ min: 1 }),

  body('extra.subfamilies').optional({ nullable: true }).isArray(),

  body('extra.subfamilies.*').isString().notEmpty()
];

const familyBaseValidators = [
  body('slug').optional().isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('aliases').optional().isArray(),
  body('scientificName').optional().isString().notEmpty(),
  body('shortDescription').optional().isString().notEmpty(),
  body('highlights').optional().isArray(),
  body('extra')
    .optional()
    .custom((extra: FamilyExtraPrimitives | null | undefined) =>
      validateExtraFields(extra, true)
    ),
  ...extraFieldsValidators
];

export const createFamilyReqSchema = [
  body('id').exists().isUUID(),
  body('slug').exists().isString().notEmpty(),
  body('name').exists().isString().notEmpty(),
  body('aliases').optional().isArray(),
  body('scientificName').exists().isString().notEmpty(),
  body('shortDescription').exists().isString().notEmpty(),
  body('highlights').exists().isArray(),
  body('extra')
    .optional()
    .custom((extra: FamilyExtraPrimitives | null | undefined) =>
      validateExtraFields(extra, false)
    ),
  ...extraFieldsValidators,
  checkExact()
];

export const getFamilyBySlugReqSchema = [
  param('idOrSlug').exists().isString().notEmpty(),
  checkExact()
];

export const updateFamilyReqSchema = [
  param('id').exists().isString().notEmpty(),
  ...familyBaseValidators,
  checkExact()
];
