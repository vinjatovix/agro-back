import { UpdatePasswordLocal } from '../../../../../src/Contexts/Auth/application/useCases/UpdatePasswordLocal.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import { PasswordHash } from '../../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';
import { Uuid } from '../../../../../src/Contexts/shared/domain/valueObject/Uuid.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { CryptAdapterMock } from '../../__mocks__/CryptAdapterMock.js';
import { UserRepositoryMock } from '../../__mocks__/UserRepositoryMock.js';
import { random, UuidMother } from '../../../shared/fixtures/index.js';

const CURRENT_USER = {
  id: UuidMother.random().value,
  username: new Username(
    random.word({ min: Username.MIN_LENGTH, max: Username.MAX_LENGTH })
  ).value,
  email: EmailMother.random().value
};

const PAYLOAD = {
  password: 'Sup3rSecretPassword%',
  repeatPassword: 'Sup3rSecretPassword%',
  oldPassword: 'OldSup3rSecretPassword.'
};

describe('UpdatePasswordLocal', () => {
  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let updatePassword: UpdatePasswordLocal;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: true });
    repository = new UserRepositoryMock({ find: true });
    updatePassword = new UpdatePasswordLocal(repository, encrypter);
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new UserRepositoryMock();
    updatePassword = new UpdatePasswordLocal(repository, encrypter);

    expect(async () => {
      await updatePassword.run(PAYLOAD, CURRENT_USER);
    }).rejects.toThrow(expect.objectContaining({ name: 'NotFoundError' }));
  });

  it('should throw an error when the password is invalid', () => {
    encrypter = new CryptAdapterMock({ login: false });
    updatePassword = new UpdatePasswordLocal(repository, encrypter);

    expect(async () => {
      await updatePassword.run(PAYLOAD, CURRENT_USER);
    }).rejects.toThrow(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: 'Invalid credentials'
      })
    );
  });

  it('should throw an error when the password does not match', () => {
    const request = {
      ...PAYLOAD,
      repeatPassword: 'differentPassword'
    };

    expect(async () => {
      await updatePassword.run(request, CURRENT_USER);
    }).rejects.toThrow(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: 'Passwords do not match'
      })
    );
  });

  it('should throw an error when the password is the same as the old one', () => {
    const request = {
      password: PAYLOAD.oldPassword,
      repeatPassword: PAYLOAD.oldPassword,
      oldPassword: PAYLOAD.oldPassword
    };

    expect(async () => {
      await updatePassword.run(request, CURRENT_USER);
    }).rejects.toThrow(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: 'New password must be different from old password'
      })
    );
  });

  it('should patch a valid user', async () => {
    expect(await updatePassword.run(PAYLOAD, CURRENT_USER)).toBeUndefined();

    repository.assertUpdateHasBeenCalledWith(
      expect.objectContaining({
        id: new Uuid(CURRENT_USER.id),
        password: expect.any(PasswordHash)
      })
    );
  });
});
