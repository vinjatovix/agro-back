import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { updatePasswordRequest } from '../../../../../src/apps/agroApi/controllers/Auth/requestSchemas.js';
import { UpdatePasswordLocalController } from '../../../../../src/apps/agroApi/controllers/Auth/UpdatePasswordLocalController.js';
import {
  UpdatePasswordLocal,
  type UserSessionInfo
} from '../../../../../src/Contexts/Auth/application/index.js';
import {
  AuthRepositoryMock,
  EncrypterAdapterMock
} from '../../../../Contexts/Auth/__mocks__/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';

import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import { buildUpdatePasswordBody } from './fixtures/authBodies.js';

describe('UpdatePasswordLocalController', () => {
  let updatePasswordLocal: UpdatePasswordLocal;
  let controller: UpdatePasswordLocalController;
  let user: UserSessionInfo;

  beforeEach(() => {
    const storedUser = UserMother.create();
    const repository = new AuthRepositoryMock({ find: true });
    repository.setSearchResult(storedUser);
    user = {
      id: storedUser.id,
      username: storedUser.username.value,
      email: storedUser.email.value,
      roles: []
    };
    updatePasswordLocal = new UpdatePasswordLocal({
      authRepository: repository,
      encrypter: new EncrypterAdapterMock({ login: true })
    });
    controller = new UpdatePasswordLocalController({ updatePasswordLocal });
  });

  it('passes the validated body and the session user to the use case', async () => {
    const runSpy = jest.spyOn(updatePasswordLocal, 'run');
    const body = buildUpdatePasswordBody();
    const req = buildRequest({ body });
    const { res, status } = buildResponse({ user });
    const next = buildNext();

    await expect(
      runWithValidation(updatePasswordRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(runSpy).toHaveBeenCalledWith(body, user);
    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const next = buildNext();

    await controller.run(
      buildRequest({ body: buildUpdatePasswordBody() }),
      buildResponse({ user }).res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
