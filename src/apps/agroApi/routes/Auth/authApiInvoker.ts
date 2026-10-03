import { makeInvoker } from 'awilix-express';
import {
  AuthenticateWithGoogleController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  UpdatePasswordLocalController,
  ValidateMailController
} from '../../controllers/Auth/index.js';

const api = ({
  registerUserLocalController,
  loginUserLocalController,
  authenticateWithGoogleController,
  validateMailController,
  refreshTokenController,
  updatePasswordLocalController
}: {
  registerUserLocalController: RegisterUserLocalController;
  loginUserLocalController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  validateMailController: ValidateMailController;
  refreshTokenController: RefreshTokenController;
  updatePasswordLocalController: UpdatePasswordLocalController;
}) => {
  return {
    registerUser: registerUserLocalController.run,
    login: loginUserLocalController.run,
    authenticateWithGoogle: authenticateWithGoogleController.run,
    validateMail: validateMailController.run,
    refreshToken: refreshTokenController.run,
    updatePassword: updatePasswordLocalController.run
  };
};

export const authApiInvoker = makeInvoker(api);
