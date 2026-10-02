import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { RegisterUserLocalController } from '../../../../../src/apps/agroApi/controllers/Auth/RegisterUserLocalController.js';
import { registerRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { RegisterUserLocal } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AuthRepositoryMock,
  CryptAdapterMock
} from '../../../../Contexts/Auth/__mocks__/index.js';

import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import { buildRegisterBody } from './fixtures/authBodies.js';

describe('RegisterUserLocalController', () => {
  let registerUser: RegisterUserLocal;
  let controller: RegisterUserLocalController;

  beforeEach(() => {
    registerUser = new RegisterUserLocal(
      new AuthRepositoryMock({ find: false }),
      new CryptAdapterMock({ login: false })
    );
    controller = new RegisterUserLocalController({ registerUser });
  });

  it('passes the validated body to the use case', async () => {
    const runSpy = jest.spyOn(registerUser, 'run');
    const body = buildRegisterBody();
    const req = buildRequest({ body });
    const { res, status, send } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(registerRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith(body);
    expect(status).toHaveBeenCalledWith(httpStatus.CREATED);
    expect(send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ body: buildRegisterBody() }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
