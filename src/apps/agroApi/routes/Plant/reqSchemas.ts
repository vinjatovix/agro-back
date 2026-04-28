import { body, checkExact, param } from 'express-validator';
import { PollinationType } from '../../../../Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { rangeSchema } from '../../middlewares/helpers/rangeSchema.js';

export const createPlantReqSchema = [
  // =====================
  // IDENTITY
  // =====================
  body('id').exists().isUUID(),
  body('identity.name.primary').exists().isString(),
  body('identity.name.aliases').optional().isArray(),
  body('identity.scientificName').optional().isString(),
  body('identity.familyId').exists().isString(),

  // =====================
  // TRAITS
  // =====================
  body('traits.lifecycle').exists().isIn(['annual', 'biennial', 'perennial']),
  ...rangeSchema('traits.size.height'),
  ...rangeSchema('traits.size.spread'),
  ...rangeSchema('traits.spacingCm'),

  // =====================
  // PHENOLOGY - SOWING
  // =====================
  body('phenology.sowing.months').exists().isArray(),
  body('phenology.sowing.seedsPerHole.min').exists().isNumeric(),
  body('phenology.sowing.seedsPerHole.max').exists().isNumeric(),
  body('phenology.sowing.germinationDays.min').exists().isNumeric(),
  body('phenology.sowing.germinationDays.max').exists().isNumeric(),

  // methods
  body('phenology.sowing.methods.direct.depthCm.min').exists().isNumeric(),
  body('phenology.sowing.methods.direct.depthCm.max').exists().isNumeric(),
  body('phenology.sowing.methods.starter.depthCm.min').optional().isNumeric(),
  body('phenology.sowing.methods.starter.depthCm.max').optional().isNumeric(),

  // =====================
  // FLOWERING
  // =====================
  body('phenology.flowering.months').exists().isArray(),
  body('phenology.flowering.pollination.type')
    .optional()
    .isIn(Object.values(PollinationType)),
  body('phenology.flowering.pollination.agents').optional().isArray(),

  // =====================
  // HARVEST
  // =====================
  body('phenology.harvest.months').exists().isArray(),
  body('phenology.harvest.description').optional().isString(),

  // =====================
  // KNOWLEDGE (OPTIONAL BIG BLOB)
  // =====================
  body('knowledge').optional().isObject(),

  // =====================
  // FINAL SAFETY CHECK
  // =====================
  checkExact()
];

export const getPlantByIdReqSchema = [
  param('id').exists().isUUID(),
  checkExact()
];
