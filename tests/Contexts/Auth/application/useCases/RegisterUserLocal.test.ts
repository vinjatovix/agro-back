import { RegisterUserLocal } from '../../../../../src/Contexts/Auth/application/index.js';
import { PasswordHash } from '../../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { AuthRepositoryMock, CryptAdapterMock } from '../../__mocks__/index.js';
import { RegisterUserRequestMother } from '../mothers/RegisterUserRequestMother.js';

describe('RegisterUserLocal', () => {
  let encrypter: CryptAdapterMock;
  let repository: AuthRepositoryMock;
  let registerUser: RegisterUserLocal;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: false });
    repository = new AuthRepositoryMock({ find: false });
    registerUser = new RegisterUserLocal(repository, encrypter);
  });

  it('should register a valid user', async () => {
    const request = RegisterUserRequestMother.random();

    await registerUser.run(request);

    repository.assertSearchHasBeenCalledWith(request.email);
    repository.assertSaveHasBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        email: expect.any(Email),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        username: expect.any(Username),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: expect.any(PasswordHash),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        emailValidated: expect.any(Boolean),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        roles: expect.any(UserRoles)
      })
    );

    encrypter.assertHashHasBeenCalledWith(request.password);
  });

  it('should throw an error when the user already exists', async () => {
    const request = RegisterUserRequestMother.random();
    repository = new AuthRepositoryMock({ find: true });
    registerUser = new RegisterUserLocal(repository, encrypter);

    await expect(registerUser.run(request)).rejects.toThrow(
      `User with id ${request.id} already exists`
    );
  });

  it('should throw an error when password confirmation does not match', async () => {
    const request = RegisterUserRequestMother.random();
    const hashSpy = jest.spyOn(encrypter, 'hash');

    await expect(
      registerUser.run({
        ...request,
        repeatPassword: 'DifferentPassword1*'
      })
    ).rejects.toThrow('Passwords do not match');

    expect(hashSpy).not.toHaveBeenCalled();
  });
});
