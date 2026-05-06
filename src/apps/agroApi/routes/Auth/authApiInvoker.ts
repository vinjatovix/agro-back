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
  registerUserController,
  loginUserController,
  authenticateWithGoogleController,
  validateMailController,
  refreshTokenController,
  updatePasswordController
}: {
  registerUserController: RegisterUserLocalController;
  loginUserController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  validateMailController: ValidateMailController;
  refreshTokenController: RefreshTokenController;
  updatePasswordController: UpdatePasswordLocalController;
}) => {
  return {
    registerUser: registerUserController.run,
    login: loginUserController.run,
    authenticateWithGoogle: authenticateWithGoogleController.run,
    validateMail: validateMailController.run,
    refreshToken: refreshTokenController.run,
    updatePassword: updatePasswordController.run
  };
};

export const authApiInvoker = makeInvoker(api);
