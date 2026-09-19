import type { Router } from 'express';
import {
  auth,
  isAdmin,
  optionalAuth,
  validateBody,
  validateReqSchema
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantApiInvoker } from './plantApiInvoker.js';
import {
  createPlantReqSchema,
  getPlantByIdReqSchema,
  updatePlantReqSchema
} from './reqSchemas.js';

const prefix = API_PREFIXES.plants;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isAdmin,
    validateBody,
    createPlantReqSchema,
    validateReqSchema,
    plantApiInvoker('createPlant')
  );

  router.get(`${prefix}/`, optionalAuth, plantApiInvoker('getAllPlants'));

  router.get(
    `${prefix}/:id`,
    optionalAuth,
    getPlantByIdReqSchema,
    validateReqSchema,
    plantApiInvoker('getPlantById')
  );
  router.patch(
    `${prefix}/:id`,
    auth,
    isAdmin,
    validateBody,
    updatePlantReqSchema,
    validateReqSchema,
    plantApiInvoker('updatePlant')
  );
  router.delete(
    `${prefix}/:id`,
    auth,
    isAdmin,
    getPlantByIdReqSchema,
    validateReqSchema,
    plantApiInvoker('deletePlant')
  );
};
