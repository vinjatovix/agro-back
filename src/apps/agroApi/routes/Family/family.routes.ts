import type { Router } from 'express';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { auth } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validateBody.js';
import { validateReqSchema } from '../../middlewares/validateReqSchema.js';
import { familyApiInvoker } from './familyApiInvoker.js';
import { createFamilyReqSchema } from './reqSchemas.js';
import { isAdmin } from '../../middlewares/isAdmin.js';

const prefix = API_PREFIXES.families;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isAdmin,
    validateBody,
    createFamilyReqSchema,
    validateReqSchema,
    familyApiInvoker('createFamily')
  );
};
