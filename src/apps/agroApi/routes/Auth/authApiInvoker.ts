import { makeInvoker } from 'awilix-express';
import {
  AuthenticateWithGoogleController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  UpdatePasswordLocalController,
  ValidateMailController
} from '../../controllers/Auth/index.js';
import { bindRun } from '../shared/index.js';

const api = (
  registerUserController: RegisterUserLocalController,
  loginUserController: LoginUserLocalController,
  authenticateWithGoogleController: AuthenticateWithGoogleController,
  validateMailController: ValidateMailController,
  refreshTokenController: RefreshTokenController,
  updatePasswordController: UpdatePasswordLocalController
) => {
  return {
    registerUser: bindRun(registerUserController),
    login: bindRun(loginUserController),
    authenticateWithGoogle: bindRun(authenticateWithGoogleController),
    validateMail: bindRun(validateMailController),
    refreshToken: bindRun(refreshTokenController),
    updatePassword: bindRun(updatePasswordController)
  };
};

export const authApiInvoker = makeInvoker(api);
