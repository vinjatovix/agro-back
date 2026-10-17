import {
  AuthenticateWithGoogle,
  ProviderUserResolver,
  SessionTokenIssuer
} from '../../../../../src/Contexts/Auth/application/index.js';
import {
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

describe('AuthenticateWithGoogle', () => {
  const request = { idToken: 'google-id-token' };

  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let verifier: GoogleIdTokenVerifierMock;
  let notifier: AccountNotifierMock;
  let resolver: ProviderUserResolver;
  let issuer: SessionTokenIssuer;
  let authenticateWithGoogle: AuthenticateWithGoogle;

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
    resolver = new ProviderUserResolver({
      authRepository: repository,
      accountNotifier: notifier
    });
    issuer = new SessionTokenIssuer({ encrypter });
    authenticateWithGoogle = new AuthenticateWithGoogle({
      googleIdTokenVerifier: verifier,
      providerUserResolver: resolver,
      sessionTokenIssuer: issuer
    });
  });

  it('should verify the id token, resolve the Google identity and issue a token', async () => {
    const storedUser = UserMother.activeLinkedTo('google', 'google-sub-1');
    repository.setSearchByProviderResult(storedUser);
    const resolveSpy = jest.spyOn(resolver, 'resolve');
    const issueSpy = jest.spyOn(issuer, 'issue');

    const token = await authenticateWithGoogle.run(request);

    expect(token).toEqual(expect.any(String));
    verifier.assertVerifyIdTokenHasBeenCalledWith(request.idToken);
    expect(resolveSpy).toHaveBeenCalledWith({
      provider: 'google',
      providerUserId: 'google-sub-1',
      email: 'google-user@aa.com',
      invalidAuthorizationMessage: 'Invalid Google token'
    });
    expect(issueSpy).toHaveBeenCalledWith(storedUser);
  });

  it('should throw without resolving when the Google token is invalid', async () => {
    verifier.setPayload(null);
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainUnauthorizedException
    );
    expect(resolveSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });

  it('should throw without resolving when the Google email is not verified', async () => {
    verifier.setPayload({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: false
    });
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainUnauthorizedException
    );
    expect(resolveSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });

  it('should let an unavailable Google propagate without resolving', async () => {
    verifier.setFailure(
      new DomainServiceUnavailableException(GOOGLE_UNAVAILABLE_MESSAGE)
    );
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    await expect(authenticateWithGoogle.run(request)).rejects.toThrow(
      DomainServiceUnavailableException
    );
    expect(resolveSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });
});
