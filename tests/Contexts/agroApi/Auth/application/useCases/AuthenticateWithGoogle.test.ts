import { AuthenticateWithGoogle } from '../../../../../../src/Contexts/agroApi/Auth/application/useCases/AuthenticateWithGoogle.js';
import {
  CryptAdapterMock,
  GoogleIdTokenVerifierMock,
  UserRepositoryMock
} from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('AuthenticateWithGoogle', () => {
  const request = { idToken: 'google-id-token' };

  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let verifier: GoogleIdTokenVerifierMock;
  let authenticateWithGoogle: AuthenticateWithGoogle;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: true });
    repository = new UserRepositoryMock({ find: false });
    verifier = new GoogleIdTokenVerifierMock({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: true,
      name: 'Google User'
    });
    authenticateWithGoogle = new AuthenticateWithGoogle(
      repository,
      encrypter,
      verifier
    );
  });

  it('should login when user already exists by Google provider identity', async () => {
    const storedUser = UserMother.create({
      authMethods: [UserMother.randomGoogleAuthMethod('google-sub-1')]
    });
    repository.setSearchByProviderResult(storedUser);

    const token = await authenticateWithGoogle.run(request);

    expect(token).toBeDefined();
    verifier.assertVerifyIdTokenHasBeenCalledWith(request.idToken);
    repository.assertSearchByProviderHasBeenCalledWith('google', 'google-sub-1');
  });

  it('should link Google auth method when user exists by email', async () => {
    const storedUser = UserMother.create({
      email: UserMother.random().email,
      emailValidated: false
    });
    verifier.setPayload({
      sub: 'google-sub-link',
      email: storedUser.email.value,
      emailVerified: true
    });
    repository.setSearchByProviderResult(null);
    repository.setSearchResult(storedUser);

    await authenticateWithGoogle.run(request);

    repository.assertUpdateHasBeenCalledWith(
      expect.objectContaining({
        id: storedUser.id,
        emailValidated: true,
        authMethods: expect.arrayContaining([
          expect.objectContaining({
            provider: 'google',
            providerUserId: 'google-sub-link'
          })
        ])
      })
    );
    repository.assertUpdateHasBeenCalledWithUsername(storedUser.username);
  });

  it('should create a new user when user does not exist', async () => {
    repository.setSearchByProviderResult(null);
    repository.setSearchResult(null);

    await authenticateWithGoogle.run(request);

    repository.assertSaveHasBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({ value: 'google-user@aa.com' }),
        password: undefined,
        emailValidated: true,
        authMethods: expect.arrayContaining([
          expect.objectContaining({
            provider: 'google',
            providerUserId: 'google-sub-1'
          })
        ])
      })
    );
  });

  it('should throw when Google token is invalid', async () => {
    verifier.setPayload(null);

    expect(async () => {
      await authenticateWithGoogle.run(request);
    }).rejects.toThrow('Invalid Google token');
  });

  it('should throw when Google email is not verified', async () => {
    verifier.setPayload({
      sub: 'google-sub-1',
      email: 'google-user@aa.com',
      emailVerified: false
    });

    expect(async () => {
      await authenticateWithGoogle.run(request);
    }).rejects.toThrow('Invalid Google token');
  });
});