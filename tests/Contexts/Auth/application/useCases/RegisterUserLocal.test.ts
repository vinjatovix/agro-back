import {
  PASSWORDS_DO_NOT_MATCH_MESSAGE,
  RegisterUserLocal
} from '../../../../../src/Contexts/Auth/application/index.js';
import type { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import { ACTIVATION_TOKEN_TTL_MS } from '../../../../../src/Contexts/Auth/domain/value-objects/EmailToken.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { OneTimeTokenToolMock } from '../../../shared/__mocks__/OneTimeTokenToolMock.js';
import { UnitOfWorkMock } from '../../../shared/__mocks__/UnitOfWorkMock.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock,
  EncrypterAdapterMock
} from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';
import { RegisterUserRequestMother } from '../mothers/RegisterUserRequestMother.js';

describe('RegisterUserLocal', () => {
  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let oneTimeToken: OneTimeTokenToolMock;
  let notifier: AccountNotifierMock;
  let unitOfWork: UnitOfWorkMock;
  let registerUser: RegisterUserLocal;

  const build = (): RegisterUserLocal =>
    new RegisterUserLocal({
      authRepository: repository,
      encrypter,
      oneTimeToken,
      accountNotifier: notifier,
      unitOfWork
    });

  /** The stored account for the request's email, as `search` returns it. */
  const storedFor = (
    request: { email: string },
    make: (email: Email) => User
  ): User => {
    const user = make(new Email(request.email));
    repository.setSearchResult(user);

    return user;
  };

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: false });
    repository = new AuthRepositoryMock({ find: false });
    oneTimeToken = new OneTimeTokenToolMock();
    notifier = new AccountNotifierMock();
    unitOfWork = new UnitOfWorkMock();
    registerUser = build();
  });

  describe('request rules', () => {
    it('should reject a weak password before hashing or any lookup', async () => {
      const lookupSpy = jest.spyOn(repository, 'findByQuery');
      const hashSpy = jest.spyOn(encrypter, 'hash');

      await expect(
        registerUser.run({
          ...RegisterUserRequestMother.random(),
          password: 'weak',
          repeatPassword: 'weak'
        })
      ).rejects.toThrow(InvalidArgumentException);

      expect(hashSpy).not.toHaveBeenCalled();
      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it('should reject a mismatched confirmation before hashing', async () => {
      const hashSpy = jest.spyOn(encrypter, 'hash');

      await expect(
        registerUser.run({
          ...RegisterUserRequestMother.random(),
          repeatPassword: 'DifferentPassword1*'
        })
      ).rejects.toThrow(PASSWORDS_DO_NOT_MATCH_MESSAGE);

      expect(hashSpy).not.toHaveBeenCalled();
    });

    it('should reject an invalid username before any lookup, whatever the email', async () => {
      const request = RegisterUserRequestMother.random();
      storedFor(request, (email) => UserMother.active({ email }));
      const lookupSpy = jest.spyOn(repository, 'findByQuery');

      await expect(
        registerUser.run({ ...request, username: 'ab' })
      ).rejects.toThrow(InvalidArgumentException);

      expect(lookupSpy).not.toHaveBeenCalled();
    });

    it('should hash the password before any lookup', async () => {
      const order: string[] = [];
      jest.spyOn(encrypter, 'hash').mockImplementation(() => {
        order.push('hash');
        return UserMother.randomPasswordHash().value;
      });
      jest.spyOn(repository, 'findByQuery').mockImplementation(() => {
        order.push('lookup');
        return Promise.resolve([]);
      });

      await registerUser.run(RegisterUserRequestMother.random());

      expect(order[0]).toBe('hash');
    });
  });

  describe('id and username', () => {
    it('should refuse a taken id', async () => {
      const request = RegisterUserRequestMother.random();
      repository.setIsFindable(true);

      const result = registerUser.run(request);

      await expect(result).rejects.toThrow(DomainConflictException);
      await expect(result).rejects.toThrow(
        `User with id ${request.id} already exists`
      );
      notifier.assertNothingSent();
    });

    it('should refuse a taken id the same way when the email has an account', async () => {
      const request = RegisterUserRequestMother.random();
      repository.addToStorage(UserMother.random(request.id));
      storedFor(request, (email) => UserMother.active({ email }));

      await expect(registerUser.run(request)).rejects.toThrow(
        `User with id ${request.id} already exists`
      );
      notifier.assertNothingSent();
    });

    it.each([
      ['a new email', () => null],
      [
        'the email of an active account',
        (email: Email) => UserMother.active({ email })
      ]
    ])('should refuse a taken username with %s', async (_case, make) => {
      const owner = UserMother.active();
      const request = {
        ...RegisterUserRequestMother.random(),
        username: owner.username.value
      };
      repository.addToStorage(owner);
      repository.setSearchResult(make(new Email(request.email)));

      await expect(registerUser.run(request)).rejects.toThrow(
        DomainConflictException
      );
      repository.assertNotWritten();
      notifier.assertNothingSent();
    });
  });

  describe('new email', () => {
    it('should store a pending account holding only the token hash, valid 24 hours', async () => {
      const request = RegisterUserRequestMother.random();

      await registerUser.run(request);

      const user = repository.createdUser().toPrimitives();
      const { token, tokenHash } = oneTimeToken.lastGenerated();
      const [stored] = user.emailTokens ?? [];
      expect(user.emailValidated).toBe(false);
      expect(user.email).toBe(request.email.toLowerCase());
      expect(user.emailTokens).toHaveLength(1);
      expect(stored?.purpose).toBe('activation');
      expect(stored?.tokenHash).toBe(tokenHash);
      expect(JSON.stringify(user)).not.toContain(token);
      expect(
        (stored?.expiresAt.getTime() ?? 0) - user.metadata.createdAt.getTime()
      ).toBe(ACTIVATION_TOKEN_TTL_MS);
    });

    it('should send the plain token once to the new address', async () => {
      const request = RegisterUserRequestMother.random();

      await expect(registerUser.run(request)).resolves.toBeUndefined();

      notifier.assertActivationSentTo(
        new Email(request.email),
        oneTimeToken.lastGenerated().token
      );
      expect(notifier.registrationAttempt).not.toHaveBeenCalled();
    });

    it('should store the password hash', async () => {
      const request = RegisterUserRequestMother.random();

      await registerUser.run(request);

      encrypter.assertHashHasBeenCalledWith(request.password);
      expect(repository.createdUser().password?.value).toBe(
        encrypter.hash(request.password)
      );
    });

    it('should answer the same and send nothing when it loses a duplicate-email race', async () => {
      repository.setCreateOutcome('emailTaken');

      await expect(
        registerUser.run(RegisterUserRequestMother.random())
      ).resolves.toBeUndefined();

      notifier.assertNothingSent();
    });
  });

  describe('email of an existing account', () => {
    it('should notify the owner of an active account and write nothing', async () => {
      const request = RegisterUserRequestMother.random();
      const owner = storedFor(request, (email) => UserMother.active({ email }));
      const hashSpy = jest.spyOn(encrypter, 'hash');

      await expect(registerUser.run(request)).resolves.toBeUndefined();

      repository.assertNotWritten();
      notifier.assertRegistrationAttemptSentTo(owner.email);
      expect(notifier.activation).not.toHaveBeenCalled();
      expect(hashSpy).toHaveBeenCalledTimes(1);
    });

    it('should leave a pending account with a valid token alone', async () => {
      const request = RegisterUserRequestMother.random();
      storedFor(request, (email) => UserMother.pending({ email }));
      const hashSpy = jest.spyOn(encrypter, 'hash');

      await expect(registerUser.run(request)).resolves.toBeUndefined();

      repository.assertNotWritten();
      notifier.assertNothingSent();
      expect(hashSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('replacing an expired pending account', () => {
    it.each([
      [
        'with an expired token',
        (email: Email) => UserMother.pendingExpired(new Date(), { email })
      ],
      [
        'without token',
        (email: Email) => UserMother.pendingWithoutToken({ email })
      ]
    ])(
      'should delete the pending account %s and create the new one in one unit',
      async (_case, make) => {
        const request = RegisterUserRequestMother.random();
        const old = storedFor(request, make);
        const deleteSpy = jest
          .spyOn(repository, 'deleteIfReplaceable')
          .mockImplementation(
            unitOfWork.trace('delete', () => Promise.resolve(true))
          );
        jest
          .spyOn(repository, 'create')
          .mockImplementation(
            unitOfWork.trace('create', () =>
              Promise.resolve('created' as const)
            )
          );

        await expect(registerUser.run(request)).resolves.toBeUndefined();

        expect(unitOfWork.tracedCalls).toEqual([
          { name: 'delete', insideUnit: true, unit: 1 },
          { name: 'create', insideUnit: true, unit: 1 }
        ]);
        expect(deleteSpy).toHaveBeenCalledWith(old, expect.any(Date));
        notifier.assertActivationSentTo(
          new Email(request.email),
          oneTimeToken.lastGenerated().token
        );
      }
    );

    it('should write and send nothing when the account changed before the delete', async () => {
      const request = RegisterUserRequestMother.random();
      storedFor(request, (email) =>
        UserMother.pendingExpired(new Date(), { email })
      );
      repository.setDeleteIfReplaceableResult(false);

      await expect(registerUser.run(request)).resolves.toBeUndefined();

      repository.assertNotCreated();
      notifier.assertNothingSent();
    });

    it('should abort the unit and answer the same when the email is taken again', async () => {
      const request = RegisterUserRequestMother.random();
      storedFor(request, (email) =>
        UserMother.pendingExpired(new Date(), { email })
      );
      repository.setCreateOutcome('emailTaken');
      const unitSpy = jest.spyOn(unitOfWork, 'run');

      await expect(registerUser.run(request)).resolves.toBeUndefined();

      await expect(unitSpy.mock.results[0]?.value).rejects.toBeDefined();
      notifier.assertNothingSent();
    });

    it("should refuse to reuse the expired account's own username", async () => {
      const request = RegisterUserRequestMother.random();
      const old = storedFor(request, (email) =>
        UserMother.pendingExpired(new Date(), { email })
      );
      repository.addToStorage(old);

      await expect(
        registerUser.run({ ...request, username: old.username.value })
      ).rejects.toThrow(DomainConflictException);

      repository.assertNotDeleted();
      notifier.assertNothingSent();
    });
  });
});
