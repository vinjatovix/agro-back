import { body, checkExact, param } from 'express-validator';
import { PollinationType } from '../../../../Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import {
  hasKeysMatching,
  hasOnlyKeys,
  rangeSchema
} from '../../middlewares/helpers/index.js';

const PROPAGATION_METHOD_KEY = /^[a-z][a-zA-Z]*$/;

// Shared by create and update: `knowledge` is validated as a whole object, so
// `checkExact()` does not reject unknown keys below it.
const knowledgeShapeValidators = [
  body('knowledge.watering')
    .optional()
    .isObject()
    .custom(hasOnlyKeys(['frequency', 'conditions'])),
  body('knowledge.propagation')
    .optional()
    .isObject()
    .custom(hasOnlyKeys(['methods'])),
  // Method names become storage paths: camelCase letters only.
  body('knowledge.propagation.methods')
    .optional()
    .isObject()
    .custom(hasKeysMatching(PROPAGATION_METHOD_KEY))
];

// =====================================================
// CREATE (FULL VALIDATION - STRICT)
// =====================================================
export const createPlantReqSchema = [
  body('id').exists().isUUID(),
  body('identity.name.primary').exists().isString(),
  body('identity.name.aliases').optional().isArray(),
  body('identity.scientificName').optional().isString(),
  body('identity.family').exists().isString(),

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
  ...knowledgeShapeValidators,

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
  body('identity.name.aliases.*').isString(),

  body('identity.scientificName').optional().isString(),
  body('identity.family').optional().isString(),

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

  body('knowledge.rootSystem').optional().isObject(),
  body('knowledge.rootSystem.type').optional().isString(),
  ...rangeSchema('knowledge.rootSystem.depthCm', { optional: true }),
  ...rangeSchema('knowledge.rootSystem.spreadCm', { optional: true }),

  ...knowledgeShapeValidators,
  body('knowledge.watering.frequency').optional().isString(),
  body('knowledge.watering.conditions').optional().isArray(),

  body('knowledge.light').optional().isObject(),
  body('knowledge.light.hoursMin').optional().isNumeric(),
  body('knowledge.light.type').optional().isString(),
  body('knowledge.light.preference').optional().isString(),

  body('knowledge.pruning').optional().isArray(),

  body('knowledge.ecology').optional().isObject(),
  body('knowledge.ecology.strategicBenefits').optional().isArray(),

  body('knowledge.resources').optional().isArray(),
  body('knowledge.notes').optional().isArray(),

  // =====================
  // FINAL SAFETY CHECK
  // =====================
  checkExact()
];
