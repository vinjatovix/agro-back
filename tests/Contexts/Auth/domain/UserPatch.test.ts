import { UserPatch } from '../../../../src/Contexts/Auth/domain/entities/UserPatch.js';
import { Uuid } from '../../../../src/Contexts/shared/domain/valueObject/index.js';
import { UserRoles } from '../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { UuidMother } from '../../shared/fixtures/UuidMother.js';
import { PasswordHash } from '../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';

const VALID_ID = UuidMother.random().value;
const VALID_PASSWORD_HASH = `$2b$10$${'a'.repeat(53)}`;
const VALID_ROLES = ['user'];

describe('UserPatch', () => {
  describe('constructor', () => {
    it('should create a patch with only id', () => {
      const patch = new UserPatch({ id: new Uuid(VALID_ID) });
      expect(patch.id.value).toBe(VALID_ID);
      expect(patch.password).toBeUndefined();
      expect(patch.emailValidated).toBeUndefined();
      expect(patch.roles).toBeUndefined();
    });

    it('should create a patch with password', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        password: new PasswordHash(VALID_PASSWORD_HASH)
      });
      expect(patch.password?.value).toBe(VALID_PASSWORD_HASH);
    });

    it('should create a patch with emailValidated', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        emailValidated: true
      });
      expect(patch.emailValidated).toBe(true);
    });

    it('should create a patch with emailValidated set to false', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        emailValidated: false
      });
      expect(patch.emailValidated).toBe(false);
    });

    it('should create a patch with roles', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        roles: new UserRoles(VALID_ROLES)
      });
      expect(patch.roles?.value).toEqual(VALID_ROLES);
    });
  });

  describe('toPrimitives', () => {
    it('should include only id when no optional fields are set', () => {
      const patch = new UserPatch({ id: new Uuid(VALID_ID) });
      expect(patch.toPrimitives()).toEqual({ id: VALID_ID });
    });

    it('should include password when set', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        password: new PasswordHash(VALID_PASSWORD_HASH)
      });
      expect(patch.toPrimitives()).toMatchObject({
        password: VALID_PASSWORD_HASH
      });
    });

    it('should include emailValidated: true when set', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        emailValidated: true
      });
      expect(patch.toPrimitives()).toMatchObject({ emailValidated: true });
    });

    it('should include emailValidated: false when set', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        emailValidated: false
      });
      expect(patch.toPrimitives()).toMatchObject({ emailValidated: false });
    });

    it('should include roles when set', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        roles: new UserRoles(VALID_ROLES)
      });
      expect(patch.toPrimitives()).toMatchObject({ roles: VALID_ROLES });
    });

    it('should include all fields when all are set', () => {
      const patch = new UserPatch({
        id: new Uuid(VALID_ID),
        password: new PasswordHash(VALID_PASSWORD_HASH),
        emailValidated: true,
        roles: new UserRoles(VALID_ROLES)
      });
      expect(patch.toPrimitives()).toEqual({
        id: VALID_ID,
        password: VALID_PASSWORD_HASH,
        emailValidated: true,
        roles: VALID_ROLES
      });
    });
  });

  describe('fromPrimitives', () => {
    it('should create a patch with only id', () => {
      const patch = UserPatch.fromPrimitives({ id: VALID_ID });
      expect(patch.id.value).toBe(VALID_ID);
      expect(patch.password).toBeUndefined();
      expect(patch.emailValidated).toBeUndefined();
      expect(patch.roles).toBeUndefined();
    });

    it('should create a patch with password', () => {
      const patch = UserPatch.fromPrimitives({
        id: VALID_ID,
        password: VALID_PASSWORD_HASH
      });
      expect(patch.password?.value).toBe(VALID_PASSWORD_HASH);
    });

    it('should create a patch with emailValidated: false', () => {
      const patch = UserPatch.fromPrimitives({
        id: VALID_ID,
        emailValidated: false
      });
      expect(patch.emailValidated).toBe(false);
    });

    it('should create a patch with roles', () => {
      const patch = UserPatch.fromPrimitives({
        id: VALID_ID,
        roles: VALID_ROLES
      });
      expect(patch.roles?.value).toEqual(VALID_ROLES);
    });

    it('should throw if roles are invalid', () => {
      expect(() =>
        UserPatch.fromPrimitives({ id: VALID_ID, roles: ['invalidRole'] })
      ).toThrow('<UserRoles> does not allow the value <invalidRole>');
    });

    it('should roundtrip through toPrimitives', () => {
      const original = UserPatch.fromPrimitives({
        id: VALID_ID,
        password: VALID_PASSWORD_HASH,
        emailValidated: true,
        roles: VALID_ROLES
      });
      expect(original.toPrimitives()).toEqual({
        id: VALID_ID,
        password: VALID_PASSWORD_HASH,
        emailValidated: true,
        roles: VALID_ROLES
      });
    });
  });
});
