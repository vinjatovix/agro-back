import { makeInvoker } from 'awilix-express';
import {
  ActivateAccountController,
  AuthenticateWithGoogleController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  UpdatePasswordLocalController
} from '../../controllers/Auth/index.js';

const api = ({
  registerUserLocalController,
  activateAccountController,
  loginUserLocalController,
  authenticateWithGoogleController,
  refreshTokenController,
  updatePasswordLocalController
}: {
  registerUserLocalController: RegisterUserLocalController;
  activateAccountController: ActivateAccountController;
  loginUserLocalController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  refreshTokenController: RefreshTokenController;
  updatePasswordLocalController: UpdatePasswordLocalController;
}) => {
  return {
    registerUser: registerUserLocalController.run,
    activateAccount: activateAccountController.run,
    login: loginUserLocalController.run,
    authenticateWithGoogle: authenticateWithGoogleController.run,
    refreshToken: refreshTokenController.run,
    updatePassword: updatePasswordLocalController.run
  };
};

export const authApiInvoker = makeInvoker(api);
