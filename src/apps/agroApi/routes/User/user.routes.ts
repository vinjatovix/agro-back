import type { Router } from 'express';

import {
  changeUserRolesRequest,
  lookupUserRequest
} from '../../controllers/Users/requestSchemas.js';
import {
  auth,
  isAdmin,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { userApiInvoker } from './userApiInvoker.js';

const prefix = API_PREFIXES.users;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  // Registered before `/:userId/roles` so `lookup` is never captured as a id.
  router.get(
    `${prefix}/lookup`,
    auth,
    isAdmin,
    validateRequest(lookupUserRequest),
    userApiInvoker('lookupUser')
  );

  router.patch(
    `${prefix}/:userId/roles`,
    auth,
    isAdmin,
    requireIfMatch,
    validateRequest(changeUserRolesRequest),
    userApiInvoker('changeUserRoles')
  );
};
