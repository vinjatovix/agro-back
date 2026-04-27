import { UserRoles } from '../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
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
      `<UserRoles> does not allow the value <${roles}>`
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
});
