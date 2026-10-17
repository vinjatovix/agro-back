import {
  MANAGEABLE_ROLES,
  UserRoles
} from '../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { InvalidArgumentException } from '../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../shared/fixtures/index.js';
import { UserRolesMother } from './mothers/UserRolesMother.js';

describe('UserRoles', () => {
  it('should create valid user roles', () => {
    const userRoles = UserRolesMother.random();
    expect(userRoles).toBeInstanceOf(UserRoles);
  });

  it('should create roles with "admin"', () => {
    const roles = new UserRoles(['admin']);
    expect(roles.value).toContain('admin');
  });

  it('should create roles with "user"', () => {
    const roles = new UserRoles(['user']);
    expect(roles.value).toContain('user');
  });

  it('should deduplicate repeated roles', () => {
    const roles = new UserRoles(['user', 'user', 'admin']);
    expect(roles.value).toHaveLength(2);
    expect(roles.value).toContain('user');
    expect(roles.value).toContain('admin');
  });

  it('should throw if any role is invalid', () => {
    const roles = [random.word()];
    expect(() => UserRolesMother.create(roles)).toThrow(
      InvalidArgumentException
    );
  });

  describe('has()', () => {
    it('should return true if the role is present', () => {
      const roles = new UserRoles(['admin']);
      expect(roles.has('admin')).toBe(true);
    });

    it('should return false if the role is not present', () => {
      const roles = new UserRoles(['user']);
      expect(roles.has('admin')).toBe(false);
    });
  });

  describe('toPrimitives()', () => {
    it('should return an array of role strings', () => {
      const roles = new UserRoles(['admin', 'user']);
      expect(roles.toPrimitives()).toEqual(['admin', 'user']);
    });

    it('should return a new array (not the internal reference)', () => {
      const roles = new UserRoles(['user']);
      expect(roles.toPrimitives()).not.toBe(roles.value);
    });
  });

  describe('add()', () => {
    it('unions a missing role in', () => {
      const result = new UserRoles(['user']).add(['admin']);
      expect(result.has('user')).toBe(true);
      expect(result.has('admin')).toBe(true);
    });

    it('is a no-op (deduplicated) for a held role', () => {
      const result = new UserRoles(['user', 'admin']).add(['admin']);
      expect(result.value).toHaveLength(2);
    });

    it('returns a new value object', () => {
      const roles = new UserRoles(['user']);
      expect(roles.add(['admin'])).not.toBe(roles);
    });
  });

  describe('remove()', () => {
    it('yields the difference for a held role', () => {
      const result = new UserRoles(['user', 'admin']).remove(['admin']);
      expect(result.has('admin')).toBe(false);
      expect(result.has('user')).toBe(true);
    });

    it('is a no-op for a role the set lacks', () => {
      const result = new UserRoles(['user']).remove(['admin']);
      expect(result.toPrimitives()).toEqual(['user']);
    });
  });

  describe('equals()', () => {
    it('is order-independent', () => {
      expect(
        new UserRoles(['user', 'admin']).equals(
          new UserRoles(['admin', 'user'])
        )
      ).toBe(true);
    });

    it('is false for different sets', () => {
      expect(new UserRoles(['user']).equals(new UserRoles(['admin']))).toBe(
        false
      );
    });
  });

  describe('isEmpty()', () => {
    it('is false when roles remain', () => {
      expect(new UserRoles(['user']).isEmpty()).toBe(false);
    });

    it('is true for an empty set', () => {
      expect(new UserRoles([]).isEmpty()).toBe(true);
    });
  });

  describe('MANAGEABLE_ROLES', () => {
    it('excludes the base role "user"', () => {
      expect(MANAGEABLE_ROLES).not.toContain('user');
    });

    it('contains the elevated role "admin"', () => {
      expect(MANAGEABLE_ROLES).toContain('admin');
    });
  });
});
