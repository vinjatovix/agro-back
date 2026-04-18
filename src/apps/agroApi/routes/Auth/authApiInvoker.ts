import { makeInvoker } from 'awilix-express';
import type {
  LoginUser,
  RefreshToken,
  RegisterUser,
  UpdatePassword,
  ValidateMail
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import {
  LoginUserController,
  RefreshTokenController,
  RegisterUserController,
  UpdatePasswordController,
  ValidateMailController
} from '../../controllers/Auth/index.js';
import { bindRun } from '../shared/index.js';

const api = (
  registerUser: RegisterUser,
  loginUser: LoginUser,
  validateMail: ValidateMail,
  refreshToken: RefreshToken,
  updatePassword: UpdatePassword
) => {
  const registerUserCtrl = new RegisterUserController(registerUser);
  const loginUserCtrl = new LoginUserController(loginUser);
  const validateMailCtrl = new ValidateMailController(validateMail);
  const refreshTokenCtrl = new RefreshTokenController(refreshToken);
  const updatePasswordCtrl = new UpdatePasswordController(updatePassword);

  return {
    registerUser: bindRun(registerUserCtrl),
    login: bindRun(loginUserCtrl),
    validateMail: bindRun(validateMailCtrl),
    refreshToken: bindRun(refreshTokenCtrl),
    updatePassword: bindRun(updatePasswordCtrl)
  };
};

export const authApiInvoker = makeInvoker(api);
