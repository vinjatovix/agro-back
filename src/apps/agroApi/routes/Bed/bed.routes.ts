import type { Router } from 'express';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { auth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  createBedReqSchema,
  deleteBedReqSchema,
  getBedByIdReqSchema,
  updateBedReqSchema
} from './reqSchemas.js';
import { validateReqSchema } from '../../middlewares/validateReqSchema.js';
import { bedApiInvoker } from './bedApiInvoker.js';

const prefix = API_PREFIXES.beds;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    validateBody,
    createBedReqSchema,
    validateReqSchema,
    bedApiInvoker('createBed')
  );

  router.get(`${prefix}`, auth, bedApiInvoker('listUserBeds'));

  router.get(
    `${prefix}/:id`,
    auth,
    getBedByIdReqSchema,
    validateReqSchema,
    bedApiInvoker('getBedById')
  );

  router.patch(
    `${prefix}/:id`,
    auth,
    validateBody,
    updateBedReqSchema,
    validateReqSchema,
    bedApiInvoker('updateBed')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    deleteBedReqSchema,
    validateReqSchema,
    bedApiInvoker('deleteBed')
  );
};
