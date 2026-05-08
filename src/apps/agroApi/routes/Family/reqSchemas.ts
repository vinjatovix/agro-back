import { body, checkExact, param } from 'express-validator';

export const createFamilyReqSchema = [
  body('id').exists().isUUID(),
  body('slug').exists().isString().notEmpty(),
  body('name').exists().isString().notEmpty(),
  body('aliases').optional().isArray(),
  body('scientificName').exists().isString().notEmpty(),
  body('shortDescription').exists().isString().notEmpty(),
  body('highlights').exists().isArray(),
  body('extra').optional().isObject(),

  body('extra.order').optional().isString().notEmpty(),
  body('extra.distribution').optional().isString().notEmpty(),
  body('extra.speciesCount').optional().isInt({ min: 0 }),

  checkExact()
];

export const getFamilyBySlugReqSchema = [
  param('slug').exists().isString().notEmpty(),
  checkExact()
];
