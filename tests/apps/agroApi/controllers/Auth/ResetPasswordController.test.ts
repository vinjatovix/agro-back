import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { resetPasswordRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { ResetPasswordController } from '../../../../../src/apps/agroApi/controllers/Auth/ResetPasswordController.js';
import { ResetPassword } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock,
  EncrypterAdapterMock
} from '../../../../Contexts/Auth/__mocks__/index.js';
import { OneTimeTokenToolMock } from '../../../../Contexts/shared/__mocks__/OneTimeTokenToolMock.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('ResetPasswordController', () => {
  let resetPassword: ResetPassword;
  let controller: ResetPasswordController;

  beforeEach(() => {
    resetPassword = new ResetPassword({
      authRepository: new AuthRepositoryMock({ find: false }),
      encrypter: new EncrypterAdapterMock({ login: false }),
      oneTimeToken: new OneTimeTokenToolMock(),
      accountNotifier: new AccountNotifierMock()
    });
    controller = new ResetPasswordController({ resetPassword });
  });

  it('passes the validated body to the use case and answers 204 No Content with no body', async () => {
    const runSpy = jest
      .spyOn(resetPassword, 'run')
      .mockResolvedValue(undefined);
    const body = {
      token: 'some-token',
      password: 'NewPassword1!',
      repeatPassword: 'NewPassword1!'
    };
    const req = buildRequest({ body });
    const { res, status, send } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(resetPasswordRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith(body);
    expect(status).toHaveBeenCalledWith(httpStatus.NO_CONTENT);
    expect(send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({
        body: {
          token: 'some-token',
          password: 'NewPassword1!',
          repeatPassword: 'NewPassword1!'
        }
      }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
