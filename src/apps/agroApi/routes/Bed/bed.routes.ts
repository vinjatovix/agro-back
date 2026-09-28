import type { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireIfMatch } from '../../middlewares/requireIfMatch.js';
import { validateBody } from '../../middlewares/validateBody.js';
import { validateReqSchema } from '../../middlewares/validateReqSchema.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { bedApiInvoker } from './bedApiInvoker.js';
import {
  createBedReqSchema,
  deleteBedReqSchema,
  getBedByIdReqSchema,
  updateBedReqSchema
} from './reqSchemas.js';

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
    requireIfMatch,
    validateBody,
    updateBedReqSchema,
    validateReqSchema,
    bedApiInvoker('updateBed')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    deleteBedReqSchema,
    validateReqSchema,
    bedApiInvoker('deleteBed')
  );
};
