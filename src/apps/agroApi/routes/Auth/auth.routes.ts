import type { Router } from 'express';
import {
  googleAuthRequest,
  loginRequest,
  registerRequest,
  updatePasswordRequest,
  validateMailRequest
} from '../../controllers/Auth/index.js';
import { auth, authLimiter, validateRequest } from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/index.js';
import { authApiInvoker } from './authApiInvoker.js';

const prefix = API_PREFIXES.auth;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/register`,
    authLimiter,
    validateRequest(registerRequest),
    authApiInvoker('registerUser')
  );

  router.post(
    `${prefix}/login`,
    authLimiter,
    validateRequest(loginRequest),
    authApiInvoker('login')
  );

  router.post(
    `${prefix}/google`,
    authLimiter,
    validateRequest(googleAuthRequest),
    authApiInvoker('authenticateWithGoogle')
  );

  router.get(
    `${prefix}/validate/:token`,
    validateRequest(validateMailRequest),
    authApiInvoker('validateMail')
  );
  router.post(`${prefix}/refresh`, auth, authApiInvoker('refreshToken'));
  router.post(
    `${prefix}/update`,
    auth,
    validateRequest(updatePasswordRequest),
    authApiInvoker('updatePassword')
  );
};
