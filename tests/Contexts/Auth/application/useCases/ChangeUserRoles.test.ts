import { ChangeUserRoles } from '../../../../../src/Contexts/Auth/application/useCases/ChangeUserRoles.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { AuthRepositoryMock } from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('ChangeUserRoles', () => {
  const actor = 'acting-admin';

  let repository: AuthRepositoryMock;
  let useCase: ChangeUserRoles;

  const seedTarget = (roles: string[]) => {
    const target = UserMother.create({
      roles: new UserRoles(roles),
      emailValidated: true
    });
    repository.setSearchByIdResult(target);
    return target;
  };

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    useCase = new ChangeUserRoles({ authRepository: repository });
  });

  describe('grant', () => {
    it('resolves the target, mutates, persists and returns the resulting primitives', async () => {
      const target = seedTarget(['user']);
      repository.setUpdateRolesOutcome('written');

      const result = await useCase.execute(
        { userId: target.id, add: ['admin'], remove: [] },
        actor,
        [target.version]
      );

      repository.assertSearchByIdHasBeenCalledWith(target.id);
      expect(repository.updateRolesCount()).toBe(1);
      expect(result.roles).toEqual(expect.arrayContaining(['user', 'admin']));
      // Target started at version 0; a written role change advances it to 1.
      expect(result.version).toBe(1);
      expect(result.metadata.updatedBy).toBe(actor);
    });
  });

  describe('preconditions', () => {
    it('refuses a missing target with 404', async () => {
      repository.setSearchByIdResult(null);

      await expect(
        useCase.execute(
          { userId: 'missing', add: ['admin'], remove: [] },
          actor,
          [0]
        )
      ).rejects.toBeInstanceOf(DomainNotFoundException);
      repository.assertRolesNotUpdated();
    });

    it('refuses a stale version with 412', async () => {
      const target = seedTarget(['user']);

      await expect(
        useCase.execute(
          { userId: target.id, add: ['admin'], remove: [] },
          actor,
          [target.version + 99]
        )
      ).rejects.toBeInstanceOf(DomainStaleVersionException);
      repository.assertRolesNotUpdated();
    });
  });

  describe('last administrator', () => {
    it('refuses removing admin when only one administrator remains (409)', async () => {
      const target = seedTarget(['user', 'admin']);
      repository.setCountByRole(1);

      await expect(
        useCase.execute(
          { userId: target.id, add: [], remove: ['admin'] },
          actor,
          [target.version]
        )
      ).rejects.toBeInstanceOf(DomainConflictException);
      repository.assertRolesNotUpdated();
    });

    it('proceeds when more than one administrator remains', async () => {
      const target = seedTarget(['user', 'admin']);
      repository.setCountByRole(2);
      repository.setUpdateRolesOutcome('written');

      const result = await useCase.execute(
        { userId: target.id, add: [], remove: ['admin'] },
        actor,
        [target.version]
      );

      expect(result.roles).toEqual(['user']);
      expect(repository.updateRolesCount()).toBe(1);
    });
  });
});
