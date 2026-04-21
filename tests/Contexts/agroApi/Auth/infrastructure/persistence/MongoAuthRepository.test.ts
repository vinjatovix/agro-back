import { createAppContainer } from '../../../../../../src/apps/agroApi/container.js';
import type { UserRepository } from '../../../../../../src/Contexts/agroApi/Auth/domain/interfaces/UserRepository.js';
import { EnvironmentArranger } from '../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

const container = createAppContainer();

const repository = container.resolve<UserRepository>('authRepository');

const environmentArranger: Promise<EnvironmentArranger> = Promise.resolve(
  container.resolve<EnvironmentArranger>('environmentArranger')
);

const username = UserMother.random().username;

describe('MongoAuthRepository', () => {
  beforeEach(async () => {
    await (await environmentArranger).arrange();
  });

  afterAll(async () => {
    await (await environmentArranger).arrange();
    await (await environmentArranger).close();
  });

  describe('save', () => {
    it('should save a user', async () => {
      const user = UserMother.random();

      await repository.save(user);
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const user = UserMother.random();
      await repository.save(user);
      const userPatch = UserMother.randomPatch(user.id.value);

      await repository.update(userPatch, username);

      const updatedUser = await repository.search(user.email.value);

      expect(updatedUser).toMatchObject({
        id: userPatch.id,
        password: userPatch.password,
        emailValidated: userPatch.emailValidated,
        roles: userPatch.roles
      });
      expect(updatedUser?.authMethods).toBeDefined();
      expect(updatedUser?.authMethods[0]?.provider).toBe('local');
    });
  });

  describe('search', () => {
    it('should return an existing user', async () => {
      const user = UserMother.random();

      await repository.save(user);

      expect(await repository.search(user.email.value)).toMatchObject(user);
    });

    it('should not return a non existing user', async () => {
      expect(await repository.search(UserMother.random().email.value)).toBe(
        null
      );
    });

    it('should return an existing user by provider identity', async () => {
      const providerUserId = 'google-sub-123';
      const user = UserMother.create({
        authMethods: [UserMother.randomGoogleAuthMethod(providerUserId)]
      });

      await repository.save(user);

      const found = await repository.searchByProvider('google', providerUserId);

      expect(found).not.toBeNull();
      expect(found?.id.value).toBe(user.id.value);
      expect(found?.email.value).toBe(user.email.value);
    });

    it('should return null when provider identity does not exist', async () => {
      const found = await repository.searchByProvider('google', 'missing-sub');

      expect(found).toBeNull();
    });
  });

  describe('findByQuery', () => {
    it('should find a user by username', async () => {
      const user = UserMother.random();
      await repository.save(user);

      const results = await repository.findByQuery({
        username: user.username.value
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.username?.value).toBe(user.username.value);
    });

    it('should find a user by id', async () => {
      const user = UserMother.random();
      await repository.save(user);

      const results = await repository.findByQuery({ id: user.id.value });

      expect(results).toHaveLength(1);
      expect(results[0]?.username?.value).toBe(user.username.value);
    });

    it('should return empty array when username does not exist', async () => {
      const results = await repository.findByQuery({ username: 'nonexistent' });

      expect(results).toHaveLength(0);
    });

    it('should not include password in results', async () => {
      const user = UserMother.random();
      await repository.save(user);

      const results = await repository.findByQuery({
        username: user.username.value
      });

      expect(results[0]).not.toHaveProperty('password');
    });

    it('should find a user when id and username are provided together', async () => {
      const user = UserMother.random();
      await repository.save(user);

      const results = await repository.findByQuery({
        id: user.id.value,
        username: user.username.value
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id?.value).toBe(user.id.value);
      expect(results[0]?.username?.value).toBe(user.username.value);
    });

    it('should return all users when query is empty', async () => {
      const userA = UserMother.random();
      const userB = UserMother.random();
      await repository.save(userA);
      await repository.save(userB);

      const results = await repository.findByQuery({});

      expect(results).toHaveLength(2);
      expect(results.map((result) => result.id?.value)).toEqual(
        expect.arrayContaining([userA.id.value, userB.id.value])
      );
    });
  });
});
