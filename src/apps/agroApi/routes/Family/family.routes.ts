import type { Router } from 'express';

import {
  createFamilyRequest,
  getFamilyByIdOrSlugRequest,
  updateFamilyRequest
} from '../../controllers/Families/requestSchemas.js';
import {
  auth,
  isAdmin,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { familyApiInvoker } from './familyApiInvoker.js';

const prefix = API_PREFIXES.families;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isAdmin,
    validateRequest(createFamilyRequest),
    familyApiInvoker('createFamily')
  );

  router.get(
    `${prefix}/:idOrSlug`,
    validateRequest(getFamilyByIdOrSlugRequest),
    familyApiInvoker('getFamilyBySlug')
  );

  router.get(`${prefix}/`, familyApiInvoker('getAllFamilies'));

  router.patch(
    `${prefix}/:idOrSlug`,
    auth,
    isAdmin,
    requireIfMatch,
    validateRequest(updateFamilyRequest),
    familyApiInvoker('updateFamily')
  );
};
