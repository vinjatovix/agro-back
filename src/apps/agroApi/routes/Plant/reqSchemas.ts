import { body, checkExact, param } from 'express-validator';
import { PollinationType } from '../../../../Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { rangeSchema } from '../../middlewares/helpers/rangeSchema.js';

// =====================================================
// CREATE (FULL VALIDATION - STRICT)
// =====================================================
export const createPlantReqSchema = [
  body('id').exists().isUUID(),
  body('identity.name.primary').exists().isString(),
  body('identity.name.aliases').optional().isArray(),
  body('identity.scientificName').optional().isString(),
  body('identity.familyId').exists().isString(),

  body('traits.lifecycle').exists().isIn(['annual', 'biennial', 'perennial']),
  ...rangeSchema('traits.size.height'),
  ...rangeSchema('traits.size.spread'),
  ...rangeSchema('traits.spacingCm'),

  body('phenology.sowing.months').exists().isArray(),
  body('phenology.sowing.seedsPerHole.min').exists().isNumeric(),
  body('phenology.sowing.seedsPerHole.max').exists().isNumeric(),
  body('phenology.sowing.germinationDays.min').exists().isNumeric(),
  body('phenology.sowing.germinationDays.max').exists().isNumeric(),

  body('phenology.sowing.methods.direct.depthCm.min').exists().isNumeric(),
  body('phenology.sowing.methods.direct.depthCm.max').exists().isNumeric(),
  body('phenology.sowing.methods.starter.depthCm.min').optional().isNumeric(),
  body('phenology.sowing.methods.starter.depthCm.max').optional().isNumeric(),

  body('phenology.flowering.months').exists().isArray(),
  body('phenology.flowering.pollination.type')
    .optional()
    .isIn(Object.values(PollinationType)),
  body('phenology.flowering.pollination.agents').optional().isArray(),

  body('phenology.harvest.months').exists().isArray(),
  body('phenology.harvest.description').optional().isString(),

  body('knowledge').optional().isObject(),

  checkExact()
];

// =====================================================
// GET BY ID
// =====================================================
export const getPlantByIdReqSchema = [
  param('id').exists().isUUID(),
  checkExact()
];

// =====================================================
// UPDATE (PATCH SAFE - ONLY LEAVES)
// =====================================================
export const updatePlantReqSchema = [
  // =====================
  // PARAMS
  // =====================
  param('id').exists().isUUID(),

  // =====================
  // BODY ID (MANDATORY IN DTO)
  // =====================
  body('id').exists().isUUID(),

  // =====================
  // IDENTITY
  // =====================
  body('identity').optional().isObject(),

  body('identity.name').optional().isObject(),
  body('identity.name.primary').optional().isString(),
  body('identity.name.aliases').optional().isArray(),

  body('identity.scientificName').optional().isString(),
  body('identity.familyId').optional().isString(),

  // =====================
  // TRAITS
  // =====================
  body('traits').optional().isObject(),

  body('traits.lifecycle').optional().isIn(['annual', 'biennial', 'perennial']),

  body('traits.size').optional().isObject(),
  ...rangeSchema('traits.size.height', { optional: true }),
  ...rangeSchema('traits.size.spread', { optional: true }),
  ...rangeSchema('traits.spacingCm', { optional: true }),

  // =====================
  // PHENOLOGY
  // =====================
  body('phenology').optional().isObject(),

  body('phenology.sowing').optional().isObject(),
  body('phenology.sowing.months').optional().isArray(),

  ...rangeSchema('phenology.sowing.seedsPerHole', { optional: true }),
  ...rangeSchema('phenology.sowing.germinationDays', { optional: true }),

  body('phenology.sowing.methods').optional().isObject(),
  body('phenology.sowing.methods.direct').optional().isObject(),
  ...rangeSchema('phenology.sowing.methods.direct.depthCm', {
    optional: true
  }),

  body('phenology.sowing.methods.starter').optional().isObject(),
  ...rangeSchema('phenology.sowing.methods.starter.depthCm', {
    optional: true
  }),

  // =====================
  // FLOWERING
  // =====================
  body('phenology.flowering').optional().isObject(),
  body('phenology.flowering.months').optional().isArray(),

  body('phenology.flowering.pollination').optional().isObject(),
  body('phenology.flowering.pollination.type')
    .optional()
    .isIn(Object.values(PollinationType)),
  body('phenology.flowering.pollination.agents').optional().isArray(),

  // =====================
  // HARVEST
  // =====================
  body('phenology.harvest').optional().isObject(),
  body('phenology.harvest.months').optional().isArray(),
  body('phenology.harvest.description').optional().isString(),

  // =====================
  // KNOWLEDGE
  // =====================
  body('knowledge').optional().isObject(),

  body('knowledge.soil').optional().isObject(),
  ...rangeSchema('knowledge.soil.ph', { optional: true }),
  ...rangeSchema('knowledge.soil.availableDepthCm', { optional: true }),

  body('knowledge.rootSystem').optional(),

  body('knowledge.watering').optional().isObject(),
  body('knowledge.watering.frequency').optional().isString(),
  body('knowledge.watering.amountMm').optional().isNumeric(),
  body('knowledge.watering.conditions').optional().isArray(),

  body('knowledge.light').optional().isObject(),
  body('knowledge.light.hoursMin').optional().isNumeric(),
  body('knowledge.light.type').optional().isString(),
  body('knowledge.light.preference').optional().isString(),

  body('knowledge.pruning').optional().isArray(),
  body('knowledge.propagation').optional().isObject(),

  body('knowledge.ecology').optional().isObject(),
  body('knowledge.ecology.strategicBenefits').optional().isArray(),

  body('knowledge.resources').optional().isArray(),
  body('knowledge.notes').optional().isArray(),

  // =====================
  // FINAL SAFETY CHECK
  // =====================
  checkExact()
];
