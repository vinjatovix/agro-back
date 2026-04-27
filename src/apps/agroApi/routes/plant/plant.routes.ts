import type { Router } from 'express';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantApiInvoker } from './plantApiInvoker.js';
import { auth } from '../shared/middlewares/auth.js';
import { validateBody } from '../shared/middlewares/validateBody.js';
import { validateReqSchema } from '../shared/middlewares/validateReqSchema.js';
import { createPlantReqSchema } from './reqSchemas.js';
import { isAdmin } from '../shared/middlewares/isAdmin.js';

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
};
