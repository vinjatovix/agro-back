import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { ChangeUserRolesController } from '../../../../../src/apps/agroApi/controllers/Users/ChangeUserRolesController.js';
import { changeUserRolesRequest } from '../../../../../src/apps/agroApi/controllers/Users/requestSchemas.js';
import type { UserRolesView } from '../../../../../src/apps/agroApi/controllers/Users/userResponse.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { ChangeUserRoles } from '../../../../../src/Contexts/Auth/application/useCases/index.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { AuthRepositoryMock } from '../../../../Contexts/Auth/__mocks__/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('ChangeUserRolesController', () => {
  const admin: UserSessionInfo = {
    id: 'admin-id',
    username: 'acting-admin',
    email: 'admin@example.com',
    roles: ['admin']
  };

  let repository: AuthRepositoryMock;
  let controller: ChangeUserRolesController;

  const seedTarget = () => {
    const target = UserMother.create({
      roles: new UserRoles(['user']),
      emailValidated: true
    });
    repository.setSearchByIdResult(target);
    repository.setUpdateRolesOutcome('written');
    return target;
  };

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    controller = new ChangeUserRolesController({
      changeUserRoles: new ChangeUserRoles({ authRepository: repository })
    });
  });

  it('maps the validated request to the use case and returns 200 + view + ETag', async () => {
    const target = seedTarget();
    const req = buildRequest({
      params: { userId: target.id },
      body: { add: ['admin'] }
    });
    const { res, status, json, set } = buildResponse({
      user: admin,
      expectedVersions: [target.version]
    });
    const next = buildNext();

    await expect(
      runWithValidation(changeUserRolesRequest, req, res)
    ).resolves.toBeUndefined();
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    const calls = json.mock.calls as UserRolesView[][];
    const body = calls[0]?.[0];
    expect(body?.id).toBe(target.id);
    expect(body?.roles).toEqual(['user', 'admin']);
    expect(body?.metadata.updatedBy).toBe(admin.username);
    // Target started at version 0; a written role change advances it to 1.
    expect(set).toHaveBeenCalledWith('ETag', '"1"');
    expect(next).not.toHaveBeenCalled();
  });

  it('fails with an internal error when the route has no validation step', async () => {
    const target = seedTarget();
    const next = buildNext();

    await controller.run(
      buildRequest({ params: { userId: target.id }, body: { add: ['admin'] } }),
      buildResponse({ user: admin, expectedVersions: [target.version] }).res,
      next as NextFunction
    );

    expectInternalErrorPassedTo(next);
  });
});
