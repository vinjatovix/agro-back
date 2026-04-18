import { makeInvoker } from 'awilix-express';
import type {
  LoginUserLocal,
  RefreshToken,
  RegisterUserLocal,
  UpdatePasswordLocal,
  ValidateMail
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import {
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
  validateMail: ValidateMail,
  refreshToken: RefreshToken,
  updatePassword: UpdatePasswordLocal
) => {
  const registerUserCtrl = new RegisterUserLocalController(registerUser);
  const loginUserCtrl = new LoginUserLocalController(loginUser);
  const validateMailCtrl = new ValidateMailController(validateMail);
  const refreshTokenCtrl = new RefreshTokenController(refreshToken);
  const updatePasswordCtrl = new UpdatePasswordLocalController(updatePassword);

  return {
    registerUser: bindRun(registerUserCtrl),
    login: bindRun(loginUserCtrl),
    validateMail: bindRun(validateMailCtrl),
    refreshToken: bindRun(refreshTokenCtrl),
    updatePassword: bindRun(updatePasswordCtrl)
  };
};

export const authApiInvoker = makeInvoker(api);
