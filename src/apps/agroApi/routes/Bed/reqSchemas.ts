import { body, checkExact, param } from 'express-validator';

export const createBedReqSchema = [
  body('id').exists().isUUID(),
  body('name').exists().isString().notEmpty(),
  body('width').exists().isFloat({ gt: 0 }),
  body('height').exists().isFloat({ gt: 0 }),
  body('depth').exists().isFloat({ gt: 0 }),
  body('plantInstances').optional().isArray(),

  checkExact()
];

export const updateBedReqSchema = [
  param('id').exists().isUUID(),
  body('name').optional().isString().notEmpty(),
  body('width').optional().isFloat({ gt: 0 }),
  body('height').optional().isFloat({ gt: 0 }),
  body('depth').optional().isFloat({ gt: 0 }),

  body('userId').not().exists().withMessage('User ID cannot be updated'),

  checkExact()
];

export const getBedByIdReqSchema = [
  param('id').exists().isUUID(),
  checkExact()
];

export const deleteBedReqSchema = [param('id').exists().isUUID(), checkExact()];
