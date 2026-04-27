import { makeInvoker } from 'awilix-express';
import type {
  AuthenticateWithGoogle,
  LoginUserLocal,
  RefreshToken,
  RegisterUserLocal,
  UpdatePasswordLocal,
  ValidateMail
} from '../../../../Contexts/Auth/application/index.js';
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
  registerUser: RegisterUserLocal,
  loginUser: LoginUserLocal,
  authenticateWithGoogle: AuthenticateWithGoogle,
  validateMail: ValidateMail,
  refreshToken: RefreshToken,
  updatePassword: UpdatePasswordLocal
) => {
  const registerUserCtrl = new RegisterUserLocalController(registerUser);
  const loginUserCtrl = new LoginUserLocalController(loginUser);
  const authenticateWithGoogleCtrl = new AuthenticateWithGoogleController(
    authenticateWithGoogle
  );
  const validateMailCtrl = new ValidateMailController(validateMail);
  const refreshTokenCtrl = new RefreshTokenController(refreshToken);
  const updatePasswordCtrl = new UpdatePasswordLocalController(updatePassword);

  return {
    registerUser: bindRun(registerUserCtrl),
    login: bindRun(loginUserCtrl),
    authenticateWithGoogle: bindRun(authenticateWithGoogleCtrl),
    validateMail: bindRun(validateMailCtrl),
    refreshToken: bindRun(refreshTokenCtrl),
    updatePassword: bindRun(updatePasswordCtrl)
  };
};

export const authApiInvoker = makeInvoker(api);
