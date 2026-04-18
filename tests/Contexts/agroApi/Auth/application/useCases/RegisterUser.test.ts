import { RegisterUser } from '../../../../../../src/Contexts/agroApi/Auth/application/index.js';
import {
  Username,
  UserRoles
} from '../../../../../../src/Contexts/agroApi/Auth/domain/index.js';

import {
  Email,
  PasswordHash,
  Uuid
} from '../../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { CryptAdapterMock, UserRepositoryMock } from '../../__mocks__/index.js';
import { RegisterUserRequestMother } from '../mothers/index.js';

describe('RegisterUser', () => {
  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let registerUser: RegisterUser;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: false });
    repository = new UserRepositoryMock({ find: false });
    registerUser = new RegisterUser(repository, encrypter);
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
    registerUser = new RegisterUser(repository, encrypter);

    expect(async () => {
      await registerUser.run(request);
    }).rejects.toThrow(`User <${request.email}> already exists`);
  });

  it('should throw an error when password confirmation does not match', async () => {
    const request = RegisterUserRequestMother.random();
    const hashSpy = jest.spyOn(encrypter, 'hash');

    expect(async () => {
      await registerUser.run({
        ...request,
        repeatPassword: 'DifferentPassword1*'
      });
    }).rejects.toThrow('Passwords do not match');

    expect(hashSpy).not.toHaveBeenCalled();
  });
});
