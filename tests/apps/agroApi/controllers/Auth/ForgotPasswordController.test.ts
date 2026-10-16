import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { ForgotPasswordController } from '../../../../../src/apps/agroApi/controllers/Auth/ForgotPasswordController.js';
import { forgotPasswordRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { ForgotPassword } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock
} from '../../../../Contexts/Auth/__mocks__/index.js';
import { BackgroundTasksFake } from '../../../../Contexts/shared/__mocks__/BackgroundTasksFake.js';
import { OneTimeTokenToolMock } from '../../../../Contexts/shared/__mocks__/OneTimeTokenToolMock.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('ForgotPasswordController', () => {
  let forgotPassword: ForgotPassword;
  let controller: ForgotPasswordController;

  beforeEach(() => {
    forgotPassword = new ForgotPassword({
      authRepository: new AuthRepositoryMock({ find: false }),
      oneTimeToken: new OneTimeTokenToolMock(),
      accountNotifier: new AccountNotifierMock(),
      backgroundTasks: new BackgroundTasksFake()
    });
    controller = new ForgotPasswordController({ forgotPassword });
  });

  it('passes the validated body to the use case and answers 202 Accepted with no body', async () => {
    const runSpy = jest
      .spyOn(forgotPassword, 'run')
      .mockResolvedValue(undefined);
    const body = { email: 'user@example.com' };
    const req = buildRequest({ body });
    const { res, status, send } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(forgotPasswordRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith(body);
    expect(status).toHaveBeenCalledWith(httpStatus.ACCEPTED);
    expect(send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ body: { email: 'user@example.com' } }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
