import {
  AuthenticateWithGithub,
  ProviderUserResolver,
  SessionTokenIssuer
} from '../../../../../src/Contexts/Auth/application/index.js';
import {
  DomainServiceUnavailableException,
  DomainUnauthorizedException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { GITHUB_UNAVAILABLE_MESSAGE } from '../../../../../src/Contexts/shared/plugins/index.js';
import {
  AccountNotifierMock,
  AuthRepositoryMock,
  EncrypterAdapterMock,
  GithubIdentityProviderMock
} from '../../__mocks__/index.js';

const IDENTITY = { userId: '1234567', email: 'github.new@aa.com' };

describe('AuthenticateWithGithub', () => {
  const request = { code: 'github-code', codeVerifier: 'pkce-verifier' };

  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let provider: GithubIdentityProviderMock;
  let notifier: AccountNotifierMock;
  let resolver: ProviderUserResolver;
  let issuer: SessionTokenIssuer;
  let authenticateWithGithub: AuthenticateWithGithub;

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: false });
    provider = new GithubIdentityProviderMock(IDENTITY);
    notifier = new AccountNotifierMock();
    resolver = new ProviderUserResolver({
      authRepository: repository,
      accountNotifier: notifier
    });
    issuer = new SessionTokenIssuer({ encrypter });
    authenticateWithGithub = new AuthenticateWithGithub({
      githubIdentityProvider: provider,
      providerUserResolver: resolver,
      sessionTokenIssuer: issuer
    });
  });

  it('should fetch the identity, create the account through the resolver and issue a token', async () => {
    repository.setSearchByProviderResult(null);
    repository.setSearchResult(null);
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    const token = await authenticateWithGithub.run(request);

    expect(token).toEqual(expect.any(String));
    provider.assertFetchIdentityHasBeenCalledWith(
      request.code,
      request.codeVerifier
    );
    expect(resolveSpy).toHaveBeenCalledWith({
      provider: 'github',
      providerUserId: IDENTITY.userId,
      email: IDENTITY.email,
      invalidAuthorizationMessage: 'Invalid GitHub authorization'
    });
    const created = repository.createdUser();
    expect(created.email.value).toBe(IDENTITY.email);
    expect(created.emailValidated).toBe(true);
    expect(created.toPrimitives()).not.toHaveProperty('password');
    expect(created.authMethods.map((method) => method.toPrimitives())).toEqual([
      expect.objectContaining({
        provider: 'github',
        providerUserId: IDENTITY.userId
      })
    ]);
    notifier.assertNothingSent();
  });

  it('should map a null identity to a 401 without writing', async () => {
    provider.setIdentity(null);
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    const result = authenticateWithGithub.run(request);

    await expect(result).rejects.toThrow(DomainUnauthorizedException);
    await expect(result).rejects.toThrow('Invalid GitHub authorization');
    expect(resolveSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });

  it('should let an unavailable GitHub bubble as a 503 without writing', async () => {
    provider.setFailure(
      new DomainServiceUnavailableException(GITHUB_UNAVAILABLE_MESSAGE)
    );
    const resolveSpy = jest.spyOn(resolver, 'resolve');

    await expect(authenticateWithGithub.run(request)).rejects.toThrow(
      DomainServiceUnavailableException
    );
    expect(resolveSpy).not.toHaveBeenCalled();
    repository.assertNotWritten();
  });
});
