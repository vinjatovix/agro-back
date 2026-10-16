import { AuthenticateWithGoogle } from '../../../../../src/Contexts/Auth/application/index.js';
import type { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import {
  DomainConflictException,
  DomainUnauthorizedException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
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

  it('should create a new user when user does not exist', async () => {
    repository.setSearchByProviderResult(null);
    repository.setSearchResult(null);

    await authenticateWithGoogle.run(request);

    repository.assertSaveHasBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({
          value: 'google-user@aa.com'
        }) as jest.AsymmetricMatcher,
        password: undefined,
        emailValidated: true,
        authMethods: expect.arrayContaining([
          expect.objectContaining({
            provider: 'google',
            providerUserId: 'google-sub-1'
          }) as jest.AsymmetricMatcher
        ]) as jest.AsymmetricMatcher
      })
    );
    notifier.assertNothingSent();
  });

  it('should throw when Google token is invalid', async () => {
    verifier.setPayload(null);

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      'Invalid Google token'
    );
  });

  it('should throw when Google email is not verified', async () => {
    verifier.setPayload({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: false
    });

    await expect(async () => {
      await authenticateWithGoogle.run(request);
    }).rejects.toThrow('Invalid Google token');
  });
});
