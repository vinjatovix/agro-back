import { LoginUserLocal } from '../../../../../src/Contexts/Auth/application/useCases/LoginUserLocal.js';
import { DomainUnauthorizedException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import {
  AuthRepositoryMock,
  EncrypterAdapterMock
} from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';
import { LoginUserRequestMother } from '../mothers/index.js';

const errorOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('LoginUserLocal', () => {
  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let loginUser: LoginUserLocal;

  const build = (emailValidationRequired = true): LoginUserLocal =>
    new LoginUserLocal({
      authRepository: repository,
      encrypter,
      emailValidationRequired
    });

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: true });
    loginUser = build();
  });

  it('should login a valid user', async () => {
    const request = LoginUserRequestMother.random();

    await expect(loginUser.run(request)).resolves.toEqual(expect.any(String));

    repository.assertSearchHasBeenCalledWith(request.email);
    encrypter.assertCompareHasBeenCalledWith(
      request.password,
      expect.any(String) as string
    );
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new AuthRepositoryMock();
    loginUser = build();
    const request = LoginUserRequestMother.random();

    await expect(loginUser.run(request)).rejects.toThrow(`Invalid credentials`);
  });

  it('should throw an error when the password is invalid', async () => {
    encrypter = new EncrypterAdapterMock({ login: false });
    loginUser = build();
    const request = LoginUserRequestMother.random();

    await expect(loginUser.run(request)).rejects.toThrow(`Invalid credentials`);
  });

  describe('unvalidated email', () => {
    const pendingRequest = () => {
      const request = LoginUserRequestMother.random();
      repository.setSearchResult(
        UserMother.pending({ email: new Email(request.email) })
      );

      return request;
    };

    it('should refuse it with the same answer as a wrong password, after checking the password', async () => {
      const request = pendingRequest();
      const compareSpy = jest.spyOn(encrypter, 'compare');

      const refused = await errorOf(loginUser.run(request));

      expect(refused).toBeInstanceOf(DomainUnauthorizedException);
      expect(compareSpy).toHaveBeenCalledTimes(1);
      encrypter = new EncrypterAdapterMock({ login: false });
      expect(refused).toEqual(await errorOf(build().run(request)));
    });

    it('should let it in when validation is not required', async () => {
      const request = pendingRequest();
      loginUser = build(false);

      await expect(loginUser.run(request)).resolves.toEqual(expect.any(String));
    });
  });
});
