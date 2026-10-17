import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { LookupUserController } from '../../../../../src/apps/agroApi/controllers/Users/LookupUserController.js';
import { lookupUserRequest } from '../../../../../src/apps/agroApi/controllers/Users/requestSchemas.js';
import { LookupUser } from '../../../../../src/Contexts/Auth/application/useCases/index.js';
import { AuthRepositoryMock } from '../../../../Contexts/Auth/__mocks__/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('LookupUserController', () => {
  let repository: AuthRepositoryMock;
  let controller: LookupUserController;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    controller = new LookupUserController({
      lookupUser: new LookupUser({ authRepository: repository })
    });
  });

  it('returns 200 + lookup view + ETag', async () => {
    const target = UserMother.create({ emailValidated: true });
    repository.setSearchResult(target);
    const req = buildRequest({ query: { email: target.email.value } });
    const { res, status, json, set } = buildResponse();
    const next = buildNext();

    await expect(
      runWithValidation(lookupUserRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: target.id,
        username: target.username.value,
        email: target.email.value,
        roles: target.roles.toPrimitives()
      })
    );
    expect(set).toHaveBeenCalledWith('ETag', `"${target.version}"`);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ query: { email: 'someone@example.com' } }),
      buildResponse().res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
