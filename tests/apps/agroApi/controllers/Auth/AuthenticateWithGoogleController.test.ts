import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { AuthenticateWithGoogleController } from '../../../../../src/apps/agroApi/controllers/Auth/AuthenticateWithGoogleController.js';
import { googleAuthRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { AuthenticateWithGoogle } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AuthRepositoryMock,
  CryptAdapterMock,
  GoogleIdTokenVerifierMock
} from '../../../../Contexts/Auth/__mocks__/index.js';

import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import { buildGoogleAuthBody } from './fixtures/authBodies.js';

describe('AuthenticateWithGoogleController', () => {
  let authenticateWithGoogle: AuthenticateWithGoogle;
  let controller: AuthenticateWithGoogleController;

  beforeEach(() => {
    authenticateWithGoogle = new AuthenticateWithGoogle(
      new AuthRepositoryMock({ find: false }),
      new CryptAdapterMock({ login: true }),
      new GoogleIdTokenVerifierMock({
        sub: 'google-sub-1',
        email: 'google-user@aa.com',
        emailVerified: true,
        name: 'Google User'
      })
    );
    controller = new AuthenticateWithGoogleController({
      authenticateWithGoogle
    });
  });

  it('passes the validated body to the use case', async () => {
    const runSpy = jest.spyOn(authenticateWithGoogle, 'run');
    const body = buildGoogleAuthBody();
    const req = buildRequest({ body });
    const { res, status, json } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(googleAuthRequest, req, res)
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
      buildRequest({ body: buildGoogleAuthBody() }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
