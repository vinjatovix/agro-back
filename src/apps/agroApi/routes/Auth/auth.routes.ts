import type { Router } from 'express';
import {
  googleAuthReqSchema,
  loginReqSchema,
  registerReqSchema,
  updatePasswordReqSchema,
  validateMailReqSchema
} from './reqSchemas.js';
import { authApiInvoker } from './authApiInvoker.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/index.js';
import { authLimiter } from '../../middlewares/index.js';
import {
  auth,
  validateBody,
  validateReqSchema
} from '../shared/middlewares/index.js';

const prefix = API_PREFIXES.auth;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/register`,
    authLimiter,
    validateBody,
    registerReqSchema,
    validateReqSchema,
    authApiInvoker('registerUser')
  );

  router.post(
    `${prefix}/login`,
    authLimiter,
    validateBody,
    loginReqSchema,
    validateReqSchema,
    authApiInvoker('login')
  );

  router.post(
    `${prefix}/google`,
    authLimiter,
    validateBody,
    googleAuthReqSchema,
    validateReqSchema,
    authApiInvoker('authenticateWithGoogle')
  );

  router.get(
    `${prefix}/validate/:token`,
    validateMailReqSchema,
    validateReqSchema,
    authApiInvoker('validateMail')
  );
  router.post(`${prefix}/refresh`, auth, authApiInvoker('refreshToken'));
  router.post(
    `${prefix}/update`,
    auth,
    validateBody,
    updatePasswordReqSchema,
    validateReqSchema,
    authApiInvoker('updatePassword')
  );
};
