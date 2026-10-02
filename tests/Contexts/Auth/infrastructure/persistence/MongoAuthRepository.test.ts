import type { Binary, Collection, MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../src/apps/agroApi/container.js';
import type { AuthRepository } from '../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { EnvironmentArranger } from '../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../src/shared/infrastructure/persistence/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

let container: AppContainer;
let repository: AuthRepository;
let environmentArranger: Promise<EnvironmentArranger>;
let client: MongoClient;

// Stored users read raw, keyed by the `toMongoId` form of their id.
type RawUserDocument = { _id: Binary | string } & Record<string, unknown>;

const usersCollection = (): Collection<RawUserDocument> =>
  client.db().collection<RawUserDocument>('users');

describe('MongoAuthRepository', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      DBConfigFactory.createConfig()
    );

    const db = client.db();

    container = createAppContainer({ db, client });
    environmentArranger = Promise.resolve(
      container.resolve<EnvironmentArranger>('environmentArranger')
    );
    repository = container.resolve<AuthRepository>('authRepository');
  });

  beforeEach(async () => {
    await (await environmentArranger).arrange();
  });

  afterAll(async () => {
    await (await environmentArranger).arrange();
    await (await environmentArranger).close();
    await client.close();
  });

  describe('save', () => {
    it('should save a user', async () => {
      const user = UserMother.random();

      await repository.save(user);

      const rawDocument = await usersCollection().findOne({
        _id: toMongoId(user.id)
      });

      expect(rawDocument).not.toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const user = UserMother.random();
      await repository.save(user);
      const userPatch = UserMother.randomPatch(user);

      await repository.update(userPatch);

      const updatedUser = await repository.search(user.email.value);

      expect(updatedUser).toMatchObject({
        id: userPatch.id,
        password: userPatch.password,
        emailValidated: userPatch.emailValidated,
        roles: userPatch.roles
      });
      // Stores the patch's audit data as received and adds none of its own.
      expect(updatedUser?.metadata).toEqual(userPatch.metadata);
      expect(updatedUser?.authMethods).toBeDefined();
      expect(updatedUser?.authMethods[0]?.provider).toBe('local');

      const rawDocument = await usersCollection().findOne({
        _id: toMongoId(user.id)
      });

      expect(rawDocument).not.toHaveProperty('id');
    });
  });

  describe('update metadata', () => {
    it('should keep stored metadata fields the patch does not carry', async () => {
      const user = UserMother.random();
      await repository.save(user);
      const users = usersCollection();
      await users.updateOne(
        { _id: toMongoId(user.id) },
        { $set: { 'metadata.legacyField': 'kept' } }
      );
      const userPatch = UserMother.randomPatch(user);

      await repository.update(userPatch);

      const rawDocument = await users.findOne({ _id: toMongoId(user.id) });

      expect(rawDocument?.metadata).toEqual({
        ...userPatch.metadata.toPrimitives(),
        legacyField: 'kept'
      });
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
      expect(found?.id).toBe(user.id);
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

      const results = await repository.findByQuery({ id: user.id });

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
        id: user.id,
        username: user.username.value
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(user.id);
      expect(results[0]?.username?.value).toBe(user.username.value);
    });

    it('should return all users when query is empty', async () => {
      const userA = UserMother.random();
      const userB = UserMother.random();
      await repository.save(userA);
      await repository.save(userB);

      const results = await repository.findByQuery({});

      expect(results).toHaveLength(2);
      expect(results.map((result) => result.id)).toEqual(
        expect.arrayContaining([userA.id, userB.id])
      );
    });
  });
});
