import { User } from "../../../../src/Contexts/Auth/domain/entities/User.js";
import type { MetadataPrimitives } from "../../../../src/Contexts/shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js";
import { UserMother } from "./mothers/UserMother.js";

describe('User', () => {
  it('should create a valid user', () => {
    const user = UserMother.create();
    expect(user).toBeInstanceOf(User);
  });

  it('should expose all fields with their values', () => {
    const user = UserMother.random();

    expect(typeof user.id.value).toBe('string');
    expect(typeof user.email.value).toBe('string');
    expect(typeof user.username.value).toBe('string');
    expect(typeof user.password.value).toBe('string');
    expect(typeof user.emailValidated).toBe('boolean');
    expect(Array.isArray(user.roles.value)).toBe(true);
  });

  it('should create a user with emailValidated set to false', () => {
    const user = UserMother.create({ emailValidated: false });
    expect(user.emailValidated).toBe(false);
  });

  it('should create a user with emailValidated set to true', () => {
    const user = UserMother.create({ emailValidated: true });
    expect(user.emailValidated).toBe(true);
  });

  describe('toPrimitives', () => {
    it('should return an object with all expected primitive fields', () => {
      const user = UserMother.random();
      const primitives = user.toPrimitives();

      expect(primitives).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        username: expect.any(String),
        password: expect.any(String),
        emailValidated: expect.any(Boolean),
        roles: expect.any(Array)
      });
    });

    it('should return primitive values matching the domain field values', () => {
      const user = UserMother.random();
      const primitives = user.toPrimitives();

      expect(primitives.id).toBe(user.id.value);
      expect(primitives.email).toBe(user.email.value);
      expect(primitives.username).toBe(user.username.value);
      expect(primitives.password).toBe(user.password.value);
      expect(primitives.emailValidated).toBe(user.emailValidated);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct a User equal to the original', () => {
      const user = UserMother.random();

      const restored = User.fromPrimitives(
        user.toPrimitives() as {
          id: string;
          email: string;
          username: string;
          password: string;
          emailValidated: boolean;
          roles: string[];
          metadata: MetadataPrimitives;
        }
      );

      expect(restored).toBeInstanceOf(User);
      expect(restored).toEqual(user);
    });

    it('should preserve emailValidated through roundtrip', () => {
      const user = UserMother.create({ emailValidated: true });

      const restored = User.fromPrimitives(
        user.toPrimitives() as {
          id: string;
          email: string;
          username: string;
          password: string;
          emailValidated: boolean;
          roles: string[];
          metadata: MetadataPrimitives;
        }
      );

      expect(restored.emailValidated).toBe(true);
    });
  });
});

