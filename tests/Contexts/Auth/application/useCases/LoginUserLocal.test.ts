import { LoginUserLocal } from '../../../../../src/Contexts/Auth/application/useCases/LoginUserLocal.js';
import {
  AuthRepositoryMock,
  EncrypterAdapterMock
} from '../../__mocks__/index.js';
import { LoginUserRequestMother } from '../mothers/index.js';

describe('LoginUserLocal', () => {
  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let loginUser: LoginUserLocal;

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: true });
    loginUser = new LoginUserLocal({ authRepository: repository, encrypter });
  });

  it('should login a valid user', async () => {
    const request = LoginUserRequestMother.random();

    await loginUser.run(request);

    repository.assertSearchHasBeenCalledWith(request.email);
    encrypter.assertCompareHasBeenCalledWith(
      request.password,
      expect.any(String) as string
    );
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new AuthRepositoryMock();
    loginUser = new LoginUserLocal({ authRepository: repository, encrypter });
    const request = LoginUserRequestMother.random();

    await expect(loginUser.run(request)).rejects.toThrow(`Invalid credentials`);
  });

  it('should throw an error when the password is invalid', async () => {
    encrypter = new EncrypterAdapterMock({ login: false });
    loginUser = new LoginUserLocal({ authRepository: repository, encrypter });
    const request = LoginUserRequestMother.random();

    await expect(loginUser.run(request)).rejects.toThrow(`Invalid credentials`);
  });
});
