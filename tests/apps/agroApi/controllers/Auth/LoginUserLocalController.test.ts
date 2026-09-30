import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { LoginUserLocalController } from '../../../../../src/apps/agroApi/controllers/Auth/LoginUserLocalController.js';
import { loginRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { LoginUserLocal } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AuthRepositoryMock,
  CryptAdapterMock
} from '../../../../Contexts/Auth/__mocks__/index.js';

import { buildLoginBody } from './fixtures/authBodies.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from './fixtures/httpFakes.js';

describe('LoginUserLocalController', () => {
  let loginUser: LoginUserLocal;
  let controller: LoginUserLocalController;

  beforeEach(() => {
    loginUser = new LoginUserLocal(
      new AuthRepositoryMock({ find: true }),
      new CryptAdapterMock({ login: true })
    );
    controller = new LoginUserLocalController({ loginUser });
  });

  it('passes the validated body to the use case', async () => {
    const runSpy = jest.spyOn(loginUser, 'run');
    const body = buildLoginBody();
    const req = buildRequest({ body });
    const { res, status, json } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(loginRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith(body);
    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(json).toHaveBeenCalledWith({ token: expect.any(String) as string });
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ body: buildLoginBody() }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
