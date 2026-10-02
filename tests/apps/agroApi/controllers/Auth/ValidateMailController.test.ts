import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { validateMailRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { ValidateMailController } from '../../../../../src/apps/agroApi/controllers/Auth/ValidateMailController.js';
import { ValidateMail } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AuthRepositoryMock,
  CryptAdapterMock
} from '../../../../Contexts/Auth/__mocks__/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';

import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

const TOKEN = 'email-validation-token';

describe('ValidateMailController', () => {
  let validateMail: ValidateMail;
  let controller: ValidateMailController;

  beforeEach(() => {
    const repository = new AuthRepositoryMock({ find: true });
    repository.setSearchResult(UserMother.create({ emailValidated: false }));
    validateMail = new ValidateMail(
      repository,
      new CryptAdapterMock({ token: true })
    );
    controller = new ValidateMailController({ validateMail });
  });

  it('passes the validated token to the use case', async () => {
    const runSpy = jest.spyOn(validateMail, 'run');
    const req = buildRequest({ params: { token: TOKEN } });
    const { res, status, json } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(validateMailRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith({ token: TOKEN });
    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(json).toHaveBeenCalledWith({ token: expect.any(String) as string });
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ params: { token: TOKEN } }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
