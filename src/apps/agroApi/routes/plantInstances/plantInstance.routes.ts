import type { Router } from 'express';

import {
  deletePlantInstanceRequest,
  getPlantInstanceByIdRequest,
  listPlantInstancesRequest,
  placePlantInstanceRequest,
  updatePlantInstanceRequest
} from '../../controllers/PlantInstances/requestSchemas.js';
import {
  auth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantInstanceApiInvoker } from './plantInstanceApiInvoker.js';

const prefix = API_PREFIXES.plantInstances;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}`,
    auth,
    validateRequest(placePlantInstanceRequest),
    plantInstanceApiInvoker('placePlantInstance')
  );

  router.get(
    `${prefix}`,
    auth,
    validateRequest(listPlantInstancesRequest),
    plantInstanceApiInvoker('listPlantInstances')
  );

  router.get(
    `${prefix}/:id`,
    auth,
    validateRequest(getPlantInstanceByIdRequest),
    plantInstanceApiInvoker('getPlantInstanceById')
  );

  router.patch(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(updatePlantInstanceRequest),
    plantInstanceApiInvoker('updatePlantInstance')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(deletePlantInstanceRequest),
    plantInstanceApiInvoker('removePlantInstance')
  );
};
