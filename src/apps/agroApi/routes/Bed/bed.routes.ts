import type { Router } from 'express';

import {
  createBedRequest,
  deleteBedRequest,
  getBedByIdRequest,
  listBedsRequest,
  updateBedRequest
} from '../../controllers/Beds/requestSchemas.js';
import {
  auth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { bedApiInvoker } from './bedApiInvoker.js';

const prefix = API_PREFIXES.beds;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    validateRequest(createBedRequest),
    bedApiInvoker('createBed')
  );

  router.get(
    `${prefix}`,
    auth,
    validateRequest(listBedsRequest),
    bedApiInvoker('listUserBeds')
  );

  router.get(
    `${prefix}/:id`,
    auth,
    validateRequest(getBedByIdRequest),
    bedApiInvoker('getBedById')
  );

  router.patch(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(updateBedRequest),
    bedApiInvoker('updateBed')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(deleteBedRequest),
    bedApiInvoker('deleteBed')
  );
};
