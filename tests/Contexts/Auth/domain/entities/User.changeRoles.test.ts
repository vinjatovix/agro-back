import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { UserMother } from '../mothers/UserMother.js';

describe('User.changeRoles', () => {
  const actor = 'acting-admin';
  const at = new Date('2026-10-17T10:00:00.000Z');

  const userWith = (roles: string[]) =>
    UserMother.create({
      roles: new UserRoles(roles),
      emailValidated: true
    });

  describe('grant', () => {
    it('unions a missing role and records the acting admin and time', () => {
      const user = userWith(['user']);

      user.changeRoles(['admin'], [], actor, at);

      expect(user.roles.has('user')).toBe(true);
      expect(user.roles.has('admin')).toBe(true);
      expect(user.metadata.updatedBy).toBe(actor);
      expect(user.metadata.updatedAt).toEqual(at);
    });

    it('is an idempotent no-op when the role is already held', () => {
      const user = userWith(['user', 'admin']);
      const before = user.metadata.updatedBy;

      user.changeRoles(['admin'], [], actor, at);

      expect(user.roles.toPrimitives()).toEqual(
        expect.arrayContaining(['user', 'admin'])
      );
      expect(user.roles.value).toHaveLength(2);
      expect(user.metadata.updatedBy).toBe(before);
    });
  });

  describe('revoke', () => {
    it('yields the difference and updates audit for a held role', () => {
      const user = userWith(['user', 'admin']);

      user.changeRoles([], ['admin'], actor, at);

      expect(user.roles.has('admin')).toBe(false);
      expect(user.roles.has('user')).toBe(true);
      expect(user.metadata.updatedBy).toBe(actor);
      expect(user.metadata.updatedAt).toEqual(at);
    });

    it('is an idempotent no-op for a role the account lacks', () => {
      const user = userWith(['user']);
      const before = user.metadata.updatedBy;

      user.changeRoles([], ['admin'], actor, at);

      expect(user.roles.toPrimitives()).toEqual(['user']);
      expect(user.metadata.updatedBy).toBe(before);
    });
  });

  describe('base role permanence', () => {
    it('always retains the base role "user" after any revoke', () => {
      const user = userWith(['user', 'admin']);

      user.changeRoles([], ['admin'], actor, at);

      expect(user.roles.has('user')).toBe(true);
    });
  });
});
