import { asClass } from 'awilix';
import {
  type Binary,
  Collection,
  type Db,
  type Filter,
  type MongoClient
} from 'mongodb';
import { up as createAccountIndexes } from '../../../../../migrations/scripts/20261003130000-account-family-unique-indexes.js';
import { up as createEmailTokenIndex } from '../../../../../migrations/scripts/20261016120000-create-users-email-token-index.js';
import type { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import type { AuthRepository } from '../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { MongoAuthRepository } from '../../../../../src/Contexts/Auth/infrastructure/persistence/MongoAuthRepository.js';
import type { UnitOfWork } from '../../../../../src/Contexts/shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { EmailTokenMother } from '../../domain/mothers/EmailTokenMother.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

let context: DbTestContext;
let repository: AuthRepository;
let unitOfWork: UnitOfWork;
let client: MongoClient;
let db: Db;

// Stored users read raw, keyed by the `toMongoId` form of their id.
type RawUserDocument = { _id: Binary | string } & Record<string, unknown>;

class AbortUnit extends Error {}

const usersCollection = (): Collection<RawUserDocument> =>
  client.db().collection<RawUserDocument>('users');

const rawUser = (user: User) =>
  usersCollection().findOne({ _id: toMongoId(user.id) });

/** The filter the repository itself sent to `findOne` while running `read`. */
const filterSentBy = async (
  read: () => Promise<unknown>
): Promise<Filter<RawUserDocument>> => {
  const findOneSpy = jest.spyOn(Collection.prototype, 'findOne');

  try {
    await read();
    const [filter] = findOneSpy.mock.calls.at(-1) ?? [];
    if (filter === undefined) throw new TypeError('No findOne was sent');

    return filter as Filter<RawUserDocument>;
  } finally {
    findOneSpy.mockRestore();
  }
};

type PlanNode = { stage?: unknown; indexName?: unknown };

/** Every `{ stage, indexName }` of a query plan, depth first. */
const planStages = (node: unknown): PlanNode[] => {
  if (!node || typeof node !== 'object') return [];
  const plan = node as Record<string, unknown>;
  const children = [
    plan.inputStage,
    ...(Array.isArray(plan.inputStages) ? (plan.inputStages as unknown[]) : [])
  ];

  return [
    { stage: plan.stage, indexName: plan.indexName },
    ...children.flatMap(planStages)
  ];
};

describe('MongoAuthRepository', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      authRepository: asClass(MongoAuthRepository).singleton()
    });
    client = context.client;
    db = context.db;

    await createAccountIndexes(db);
    await createEmailTokenIndex(db);

    repository = context.container.resolve<AuthRepository>('authRepository');
    unitOfWork = context.container.resolve<UnitOfWork>('unitOfWork');
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('save', () => {
    it('should save a user without an `id` field', async () => {
      const user = UserMother.random();

      await repository.save(user);

      expect(await rawUser(user)).not.toHaveProperty('id');
    });
  });

  describe('create', () => {
    it('should store a pending user with its token hash and dates', async () => {
      const user = UserMother.pending();

      expect(await repository.create(user)).toBe('created');

      const stored = await rawUser(user);
      expect(stored).not.toHaveProperty('id');
      expect(stored?.emailTokens).toEqual(user.toPrimitives().emailTokens);
      expect(await repository.search(user.email.value)).toEqual(user);
    });

    it('should answer emailTaken when the email is already stored', async () => {
      const stored = UserMother.active();
      await repository.create(stored);

      const outcome = await repository.create(
        UserMother.pending({ email: stored.email })
      );

      expect(outcome).toBe('emailTaken');
    });

    it('should refuse a taken username without echoing it', async () => {
      const stored = UserMother.active();
      await repository.create(stored);

      const result = repository.create(
        UserMother.pending({ username: stored.username })
      );

      await expect(result).rejects.toThrow(DomainConflictException);
      await expect(result).rejects.not.toThrow(stored.username.value);
    });

    it('should refuse a taken id', async () => {
      const stored = UserMother.active();
      await repository.create(stored);

      const result = repository.create(UserMother.pending({ id: stored.id }));

      await expect(result).rejects.toThrow(DomainConflictException);
      await expect(result).rejects.toThrow(/User with id .* already exists/);
    });

    it('should refuse two users with the same token hash', async () => {
      const token = EmailTokenMother.activation();
      await repository.create(UserMother.pending({ token }));

      const result = repository.create(UserMother.pending({ token }));

      await expect(result).rejects.toThrow(DomainConflictException);
    });
  });

  describe('update', () => {
    it('should unset, never null, the fields a provider link removes', async () => {
      const user = UserMother.pending();
      await repository.create(user);
      const before = user.toPrimitives();
      user.linkProvider(UserMother.randomGoogleAuthMethod(), new Date());

      const outcome = await repository.update(before, user.toPrimitives());

      expect(outcome).toBe('written');
      const stored = await rawUser(user);
      expect(stored).not.toHaveProperty('password');
      expect(stored).not.toHaveProperty('emailTokens');
      expect(stored?.emailValidated).toBe(true);
      expect(await repository.search(user.email.value)).toEqual(user);
    });

    it('should write only one of two activations read from the same state', async () => {
      const token = EmailTokenMother.activation();
      const user = UserMother.pending({ token });
      await repository.create(user);
      const before = user.toPrimitives();
      user.activate(token.tokenHash, new Date());
      const after = user.toPrimitives();

      const first = await repository.update(before, after);
      const second = await repository.update(before, after);

      expect([first, second]).toEqual(['written', 'stale']);
    });

    it('should answer unchanged when nothing changed', async () => {
      const user = UserMother.active();
      await repository.create(user);

      const outcome = await repository.update(
        user.toPrimitives(),
        user.toPrimitives()
      );

      expect(outcome).toBe('unchanged');
    });

    it('should store the metadata as given and keep other stored metadata', async () => {
      const user = UserMother.active();
      await repository.create(user);
      await usersCollection().updateOne(
        { _id: toMongoId(user.id) },
        { $set: { 'metadata.legacyField': 'kept' } }
      );
      const before = user.toPrimitives();
      user.changePassword(UserMother.otherPasswordHash(), new Date());

      await repository.update(before, user.toPrimitives());

      const stored = await rawUser(user);
      expect(stored?.metadata).toEqual({
        ...user.metadata.toPrimitives(),
        legacyField: 'kept'
      });
    });
  });

  describe('deleteIfReplaceable', () => {
    it.each([
      [
        'a pending user with an expired token',
        () => UserMother.pendingExpired()
      ],
      ['a pending user without token', () => UserMother.pendingWithoutToken()]
    ])('should delete %s', async (_case, build) => {
      const user = build();
      await repository.create(user);

      expect(await repository.deleteIfReplaceable(user, new Date())).toBe(true);
      expect(await rawUser(user)).toBeNull();
    });

    it.each([
      ['a validated user', () => UserMother.active()],
      ['a pending user with a valid token', () => UserMother.pending()]
    ])('should keep %s', async (_case, build) => {
      const user = build();
      await repository.create(user);

      expect(await repository.deleteIfReplaceable(user, new Date())).toBe(
        false
      );
      expect(await rawUser(user)).not.toBeNull();
    });

    it('should undo the delete when the replacement loses a duplicate-email race', async () => {
      const expired = UserMother.pendingExpired();
      const other = UserMother.active();
      await repository.create(expired);
      await repository.create(other);
      const outcomes: unknown[] = [];

      const unit = unitOfWork.run(async () => {
        outcomes.push(
          await repository.deleteIfReplaceable(expired, new Date())
        );
        outcomes.push(
          await repository.create(UserMother.pending({ email: other.email }))
        );
        throw new AbortUnit();
      });

      await expect(unit).rejects.toThrow(AbortUnit);
      expect(outcomes).toEqual([true, 'emailTaken']);
      expect(await rawUser(expired)).not.toBeNull();
    });
  });

  describe('search', () => {
    it('should return an existing user', async () => {
      const user = UserMother.random();

      await repository.save(user);

      expect(await repository.search(user.email.value)).toMatchObject(user);
    });

    it('should not return a non existing user', async () => {
      expect(
        await repository.search(UserMother.random().email.value)
      ).toBeNull();
    });

    it('should find a user by id', async () => {
      const user = UserMother.active();
      await repository.create(user);

      expect(await repository.searchById(user.id)).toEqual(user);
      expect(await repository.searchById(UserMother.random().id)).toBeNull();
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

  describe('searchByEmailToken', () => {
    it('should find the user by token hash and purpose', async () => {
      const token = EmailTokenMother.activation();
      const user = UserMother.pending({ token });
      await repository.create(user);

      expect(
        await repository.searchByEmailToken('activation', token.tokenHash)
      ).toEqual(user);
    });

    it('should not find it with another purpose or hash', async () => {
      const token = EmailTokenMother.activation();
      await repository.create(UserMother.pending({ token }));

      expect(
        await repository.searchByEmailToken('passwordReset', token.tokenHash)
      ).toBeNull();
      expect(
        await repository.searchByEmailToken(
          'activation',
          EmailTokenMother.randomHash()
        )
      ).toBeNull();
    });

    it('should use the token hash index, never a collection scan', async () => {
      const token = EmailTokenMother.activation();
      await repository.create(UserMother.pending({ token }));
      await repository.create(UserMother.active());
      const filter = await filterSentBy(() =>
        repository.searchByEmailToken('activation', token.tokenHash)
      );

      const explain = await usersCollection()
        .find(filter)
        .explain('executionStats');

      const stages = planStages(
        (explain.executionStats as Record<string, unknown>).executionStages
      );
      expect(stages.map(({ stage }) => stage)).not.toContain('COLLSCAN');
      expect(stages).toContainEqual({
        stage: 'IXSCAN',
        indexName: 'users_email_token_hash_unique'
      });
    });

    it('should leave the token hash index unchanged when its migration runs again', async () => {
      const before = await usersCollection().indexes();

      await createEmailTokenIndex(db);

      expect(await usersCollection().indexes()).toEqual(before);
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
      expect(results[0]?.id).toBe(user.id);
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
