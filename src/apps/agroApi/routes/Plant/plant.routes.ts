import type { Router } from 'express';

import {
  createPlantRequest,
  deletePlantRequest,
  getPlantByIdRequest,
  listPlantsRequest,
  updatePlantRequest
} from '../../controllers/Plants/requestSchemas.js';
import {
  auth,
  isAdmin,
  optionalAuth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantApiInvoker } from './plantApiInvoker.js';

const prefix = API_PREFIXES.plants;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isAdmin,
    validateRequest(createPlantRequest),
    plantApiInvoker('createPlant')
  );

  router.get(
    `${prefix}/`,
    optionalAuth,
    validateRequest(listPlantsRequest),
    plantApiInvoker('getAllPlants')
  );

  router.get(
    `${prefix}/:id`,
    optionalAuth,
    validateRequest(getPlantByIdRequest),
    plantApiInvoker('getPlantById')
  );
  router.patch(
    `${prefix}/:id`,
    auth,
    isAdmin,
    requireIfMatch,
    validateRequest(updatePlantRequest),
    plantApiInvoker('updatePlant')
  );
  router.delete(
    `${prefix}/:id`,
    auth,
    isAdmin,
    requireIfMatch,
    validateRequest(deletePlantRequest),
    plantApiInvoker('deletePlant')
  );
};
