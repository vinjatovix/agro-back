import type { Router } from 'express';
import {
  activateRequest,
  forgotPasswordRequest,
  googleAuthRequest,
  loginRequest,
  registerRequest,
  resetPasswordRequest,
  updatePasswordRequest
} from '../../controllers/Auth/index.js';
import {
  auth,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/index.js';
import { authApiInvoker } from './authApiInvoker.js';

const prefix = API_PREFIXES.auth;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/register`,
    registrationLimiter,
    validateRequest(registerRequest),
    authApiInvoker('registerUser')
  );

  router.post(
    `${prefix}/activate`,
    authLimiter,
    validateRequest(activateRequest),
    authApiInvoker('activateAccount')
  );

  router.post(
    `${prefix}/password/forgot`,
    passwordResetLimiter,
    validateRequest(forgotPasswordRequest),
    authApiInvoker('forgotPassword')
  );

  router.post(
    `${prefix}/password/reset`,
    authLimiter,
    validateRequest(resetPasswordRequest),
    authApiInvoker('resetPassword')
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

  router.post(`${prefix}/refresh`, auth, authApiInvoker('refreshToken'));
  router.post(
    `${prefix}/update`,
    auth,
    validateRequest(updatePasswordRequest),
    authApiInvoker('updatePassword')
  );
};
