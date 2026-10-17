import {
  AuthenticateWithGoogle,
  CONCURRENT_CHANGE_MESSAGE,
  USER_NOT_CREATED_MESSAGE
} from '../../../../../src/Contexts/Auth/application/index.js';
import type { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import {
  DomainConflictException,
  DomainServiceUnavailableException,
  DomainUnauthorizedException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { GOOGLE_UNAVAILABLE_MESSAGE } from '../../../../../src/Contexts/shared/plugins/index.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock,
  EncrypterAdapterMock,
  GoogleIdTokenVerifierMock
} from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

const GOOGLE_SUB = 'google-sub-link';

describe('AuthenticateWithGoogle', () => {
  const request = { idToken: 'google-id-token' };

  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let verifier: GoogleIdTokenVerifierMock;
  let notifier: AccountNotifierMock;
  let authenticateWithGoogle: AuthenticateWithGoogle;

  /** Google answers for `user`'s email, and only the email lookup finds it. */
  const signInAs = (user: User, sub: string = GOOGLE_SUB): void => {
    verifier.setPayload({
      sub,
      email: user.email.value,
      emailVerified: true
    });
    repository.setSearchByProviderResult(null);
    repository.setSearchResult(user);
  };

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: false });
    verifier = new GoogleIdTokenVerifierMock({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: true,
      name: 'Google User'
    });
    notifier = new AccountNotifierMock();
    authenticateWithGoogle = new AuthenticateWithGoogle({
      authRepository: repository,
      encrypter,
      googleIdTokenVerifier: verifier,
      accountNotifier: notifier
    });
  });

  it('should login when user already exists by Google provider identity', async () => {
    const storedUser = UserMother.activeLinkedTo('google', 'google-sub-1');
    repository.setSearchByProviderResult(storedUser);

    const token = await authenticateWithGoogle.run(request);

    expect(token).toBeDefined();
    verifier.assertVerifyIdTokenHasBeenCalledWith(request.idToken);
    repository.assertSearchByProviderHasBeenCalledWith(
      'google',
      'google-sub-1'
    );
    repository.assertNotWritten();
    notifier.assertNothingSent();
  });

  it('should secure a pending account: validated, without password, local method or tokens', async () => {
    const storedUser = UserMother.pending();
    const before = storedUser.toPrimitives();
    signInAs(storedUser);

    const token = await authenticateWithGoogle.run(request);

    expect(token).toEqual(expect.any(String));
    const [updatedFrom, updatedTo] = repository.lastUpdate();
    expect(updatedFrom).toEqual(before);
    expect(updatedTo.emailValidated).toBe(true);
    expect(updatedTo).not.toHaveProperty('password');
    expect(updatedTo).not.toHaveProperty('emailTokens');
    expect(updatedTo.authMethods.map(({ provider }) => provider)).toEqual([
      'google'
    ]);
    expect(updatedTo.metadata.updatedBy).toBe(storedUser.username.value);
    notifier.assertNothingSent();
  });

  it('should link an active account, keep its password and notify the owner', async () => {
    const storedUser = UserMother.active();
    const before = storedUser.toPrimitives();
    signInAs(storedUser);

    await authenticateWithGoogle.run(request);

    const [, updatedTo] = repository.lastUpdate();
    expect(updatedTo.password).toBe(before.password);
    expect(updatedTo.authMethods.map(({ provider }) => provider)).toEqual([
      'local',
      'google'
    ]);
    notifier.assertProviderLinkedSentTo(storedUser.email, 'google');
  });

  it('should write and send nothing when Google is already linked with the same identity', async () => {
    signInAs(UserMother.activeLinkedTo('google', GOOGLE_SUB));

    await authenticateWithGoogle.run(request);

    repository.assertNotWritten();
    notifier.assertNothingSent();
  });

  it('should refuse an account linked to another Google identity', async () => {
    signInAs(UserMother.activeLinkedTo('google', 'another-sub'));

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainUnauthorizedException
    );
    repository.assertNotWritten();
  });

  it('should read the account again and link it once more after a stale write', async () => {
    const storedUser = UserMother.active();
    signInAs(storedUser);
    repository.setSearchResults(
      storedUser,
      UserMother.active({
        id: storedUser.id,
        email: storedUser.email,
        username: storedUser.username
      })
    );
    repository.setUpdateOutcomes('stale', 'written');

    await authenticateWithGoogle.run(request);

    expect(repository.updateCount()).toBe(2);
    notifier.assertProviderLinkedSentTo(storedUser.email, 'google');
  });

  it('should answer a conflict after two stale writes', async () => {
    const storedUser = UserMother.active();
    signInAs(storedUser);
    repository.setSearchResults(
      storedUser,
      UserMother.active({ id: storedUser.id, email: storedUser.email })
    );
    repository.setUpdateOutcomes('stale', 'stale');

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainConflictException
    );
    notifier.assertNothingSent();
  });

  describe('returning Google user', () => {
    it.each([
      ['the same email', 'google-user@aa.com'],
      ['a changed email', 'new-address@aa.com']
    ])(
      'should sign in by Google identity with %s, with no write and no email',
      async (_case, email) => {
        const storedUser = UserMother.activeLinkedTo('google', 'google-sub-1');
        repository.setSearchByProviderResult(storedUser);
        verifier.setPayload({
          sub: 'google-sub-1',
          email,
          emailVerified: true
        });
        const generateSpy = jest.spyOn(encrypter, 'generateToken');
        const searchSpy = jest.spyOn(repository, 'search');

        await authenticateWithGoogle.run(request);

        expect(generateSpy).toHaveBeenCalledWith({
          id: storedUser.id,
          email: storedUser.email.value,
          username: storedUser.username.value,
          roles: storedUser.roles.value
        });
        expect(searchSpy).not.toHaveBeenCalled();
        repository.assertNotWritten();
        notifier.assertNothingSent();
      }
    );
  });

  describe('new Google user', () => {
    beforeEach(() => {
      repository.setSearchByProviderResult(null);
      repository.setSearchResult(null);
    });

    it('should insert a validated account with Google linked, no password and the user role', async () => {
      const token = await authenticateWithGoogle.run(request);

      expect(token).toEqual(expect.any(String));
      const created = repository.createdUser();
      expect(created.email.value).toBe('google-user@aa.com');
      expect(created.emailValidated).toBe(true);
      expect(created.toPrimitives()).not.toHaveProperty('password');
      expect(created.toPrimitives()).not.toHaveProperty('emailTokens');
      expect(created.roles.value).toEqual(['user']);
      expect(
        created.authMethods.map((method) => method.toPrimitives())
      ).toEqual([
        expect.objectContaining({
          provider: 'google',
          providerUserId: 'google-sub-1'
        })
      ]);
      expect(created.username.value).toBe('googleuser');
      notifier.assertNothingSent();
    });

    it('should try another username starting with the base when it is taken', async () => {
      repository.setCreateOutcomes('usernameTaken');

      await authenticateWithGoogle.run(request);

      const [first, second] = repository
        .createdUsers()
        .map((user) => user.username.value);
      expect(first).toBe('googleuser');
      expect(second).toMatch(/^googleuser\d{4}$/);
    });

    it('should end with an 8-hex suffix after the numbered usernames are taken', async () => {
      repository.setCreateOutcomes(
        'usernameTaken',
        'usernameTaken',
        'usernameTaken',
        'usernameTaken'
      );

      await authenticateWithGoogle.run(request);

      const usernames = repository
        .createdUsers()
        .map((user) => user.username.value);
      expect(usernames).toHaveLength(5);
      expect(usernames.at(-1)).toMatch(/^googleuser[0-9a-f]{8}$/);
    });

    it('should answer a conflict without a token when every username is taken', async () => {
      repository.setCreateOutcomes(
        'usernameTaken',
        'usernameTaken',
        'usernameTaken',
        'usernameTaken',
        'usernameTaken'
      );
      const generateSpy = jest.spyOn(encrypter, 'generateToken');

      const result = authenticateWithGoogle.run(request);

      await expect(result).rejects.toThrow(DomainConflictException);
      await expect(result).rejects.toThrow(USER_NOT_CREATED_MESSAGE);
      expect(repository.createdUsers()).toHaveLength(5);
      expect(generateSpy).not.toHaveBeenCalled();
    });

    it.each(['emailTaken', 'providerTaken'] as const)(
      'should sign in to the account a concurrent request created (%s)',
      async (outcome) => {
        const winner = UserMother.activeLinkedTo('google', 'google-sub-1');
        repository.setCreateOutcomes(outcome);
        repository.setSearchByProviderResults(null, winner);
        const generateSpy = jest.spyOn(encrypter, 'generateToken');

        await authenticateWithGoogle.run(request);

        expect(repository.createdUsers()).toHaveLength(1);
        expect(generateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ id: winner.id })
        );
        expect(repository.updateCount()).toBe(0);
      }
    );

    it('should answer a conflict after losing the creation race twice', async () => {
      repository.setCreateOutcomes('emailTaken', 'emailTaken');

      const result = authenticateWithGoogle.run(request);

      await expect(result).rejects.toThrow(DomainConflictException);
      await expect(result).rejects.toThrow(CONCURRENT_CHANGE_MESSAGE);
      expect(repository.createdUsers()).toHaveLength(2);
    });
  });

  it('should let an unavailable Google propagate without touching the repository', async () => {
    verifier.setFailure(
      new DomainServiceUnavailableException(GOOGLE_UNAVAILABLE_MESSAGE)
    );
    const providerSpy = jest.spyOn(repository, 'searchByProvider');

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainServiceUnavailableException
    );
    expect(providerSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });

  it('should throw when Google token is invalid', async () => {
    verifier.setPayload(null);

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainUnauthorizedException
    );
    repository.assertNotWritten();
  });

  it('should throw when Google email is not verified', async () => {
    verifier.setPayload({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: false
    });

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainUnauthorizedException
    );
    repository.assertNotWritten();
  });
});
