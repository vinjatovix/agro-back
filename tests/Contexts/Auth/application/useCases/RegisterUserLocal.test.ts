import { RegisterUserLocal } from '../../../../../src/Contexts/Auth/application/index.js';
import { PasswordHash } from '../../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/Email.js';
import { Uuid } from '../../../../../src/Contexts/shared/domain/valueObject/Uuid.js';
import { CryptAdapterMock, UserRepositoryMock } from '../../__mocks__/index.js';
import { RegisterUserRequestMother } from '../mothers/RegisterUserRequestMother.js';

describe('RegisterUserLocal', () => {
  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let registerUser: RegisterUserLocal;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: false });
    repository = new UserRepositoryMock({ find: false });
    registerUser = new RegisterUserLocal(repository, encrypter);
  });

  it('should register a valid user', async () => {
    const request = RegisterUserRequestMother.random();

    await registerUser.run(request);

    repository.assertSearchHasBeenCalledWith(request.email);
    repository.assertSaveHasBeenCalledWith(
      expect.objectContaining({
        id: expect.any(Uuid),
        email: expect.any(Email),
        username: expect.any(Username),
        password: expect.any(PasswordHash),
        emailValidated: expect.any(Boolean),
        roles: expect.any(UserRoles)
      })
    );

    encrypter.assertHashHasBeenCalledWith(request.password);
  });

  it('should throw an error when the user already exists', async () => {
    const request = RegisterUserRequestMother.random();
    repository = new UserRepositoryMock({ find: true });
    registerUser = new RegisterUserLocal(repository, encrypter);

    await expect(async () => {
      await registerUser.run(request);
    }).rejects.toThrow(`User <${request.email}> already exists`);
  });

  it('should throw an error when password confirmation does not match', async () => {
    const request = RegisterUserRequestMother.random();
    const hashSpy = jest.spyOn(encrypter, 'hash');

    await expect(async () => {
      await registerUser.run({
        ...request,
        repeatPassword: 'DifferentPassword1*'
      });
    }).rejects.toThrow('Passwords do not match');

    expect(hashSpy).not.toHaveBeenCalled();
  });
});
