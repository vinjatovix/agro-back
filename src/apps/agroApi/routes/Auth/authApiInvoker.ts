import { makeInvoker } from 'awilix-express';
import {
  ActivateAccountController,
  AuthenticateWithGithubController,
  AuthenticateWithGoogleController,
  ForgotPasswordController,
  LoginUserLocalController,
  RefreshTokenController,
  RegisterUserLocalController,
  ResetPasswordController,
  UpdatePasswordLocalController
} from '../../controllers/Auth/index.js';

const api = ({
  registerUserLocalController,
  activateAccountController,
  forgotPasswordController,
  resetPasswordController,
  loginUserLocalController,
  authenticateWithGoogleController,
  authenticateWithGithubController,
  refreshTokenController,
  updatePasswordLocalController
}: {
  registerUserLocalController: RegisterUserLocalController;
  activateAccountController: ActivateAccountController;
  forgotPasswordController: ForgotPasswordController;
  resetPasswordController: ResetPasswordController;
  loginUserLocalController: LoginUserLocalController;
  authenticateWithGoogleController: AuthenticateWithGoogleController;
  authenticateWithGithubController: AuthenticateWithGithubController;
  refreshTokenController: RefreshTokenController;
  updatePasswordLocalController: UpdatePasswordLocalController;
}) => {
  return {
    registerUser: registerUserLocalController.run,
    activateAccount: activateAccountController.run,
    forgotPassword: forgotPasswordController.run,
    resetPassword: resetPasswordController.run,
    login: loginUserLocalController.run,
    authenticateWithGoogle: authenticateWithGoogleController.run,
    authenticateWithGithub: authenticateWithGithubController.run,
    refreshToken: refreshTokenController.run,
    updatePassword: updatePasswordLocalController.run
  };
};

export const authApiInvoker = makeInvoker(api);
