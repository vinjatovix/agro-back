import { LoginUserLocal } from '../../../../../src/Contexts/Auth/application/useCases/LoginUserLocal.js';
import { CryptAdapterMock, UserRepositoryMock } from '../../__mocks__/index.js';
import { LoginUserRequestMother } from '../mothers/index.js';

describe('LoginUserLocal', () => {
  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let loginUser: LoginUserLocal;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: true });
    repository = new UserRepositoryMock({ find: true });
    loginUser = new LoginUserLocal(repository, encrypter);
  });

  it('should login a valid user', async () => {
    const request = LoginUserRequestMother.random();

    await loginUser.run(request);

    repository.assertSearchHasBeenCalledWith(request.email);
    encrypter.assertCompareHasBeenCalledWith(
      request.password,
      expect.any(String)
    );
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new UserRepositoryMock();
    loginUser = new LoginUserLocal(repository, encrypter);
    const request = LoginUserRequestMother.random();

    expect(async () => {
      await loginUser.run(request);
    }).rejects.toThrow(`Invalid credentials`);
  });

  it('should throw an error when the password is invalid', async () => {
    encrypter = new CryptAdapterMock({ login: false });
    loginUser = new LoginUserLocal(repository, encrypter);
    const request = LoginUserRequestMother.random();

    expect(async () => {
      await loginUser.run(request);
    }).rejects.toThrow(`Invalid credentials`);
  });
});
