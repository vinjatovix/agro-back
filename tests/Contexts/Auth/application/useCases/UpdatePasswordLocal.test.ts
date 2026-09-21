import { UpdatePasswordLocal } from '../../../../../src/Contexts/Auth/application/useCases/UpdatePasswordLocal.js';
import type { UserPatch } from '../../../../../src/Contexts/Auth/domain/entities/UserPatch.js';
import {
  createUserId,
  randomUserId
} from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { PasswordHash } from '../../../../../src/Contexts/Auth/domain/value-objects/PasswordHash.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import {
  DomainNotFoundException,
  DomainUnauthorizedException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random } from '../../../shared/fixtures/index.js';
import { AuthRepositoryMock } from '../../__mocks__/AuthRepositoryMock.js';
import { CryptAdapterMock } from '../../__mocks__/CryptAdapterMock.js';

const CURRENT_USER = {
  id: randomUserId(),
  username: new Username(
    random.word({ min: Username.MIN_LENGTH, max: Username.MAX_LENGTH })
  ).value,
  email: EmailMother.random().value,
  roles: []
};

const PAYLOAD = {
  password: 'Sup3rSecretPassword%',
  repeatPassword: 'Sup3rSecretPassword%',
  oldPassword: 'OldSup3rSecretPassword.'
};

describe('UpdatePasswordLocal', () => {
  let encrypter: CryptAdapterMock;
  let repository: AuthRepositoryMock;
  let updatePassword: UpdatePasswordLocal;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: true });
    updatePassword = new UpdatePasswordLocal(repository, encrypter);
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new AuthRepositoryMock();
    updatePassword = new UpdatePasswordLocal(repository, encrypter);

    await expect(updatePassword.run(PAYLOAD, CURRENT_USER)).rejects.toThrow(
      DomainNotFoundException
    );
  });

  it('should throw an error when the password is invalid', async () => {
    encrypter = new CryptAdapterMock({ login: false });
    updatePassword = new UpdatePasswordLocal(repository, encrypter);

    await expect(updatePassword.run(PAYLOAD, CURRENT_USER)).rejects.toThrow(
      DomainUnauthorizedException
    );
  });

  it('should throw an error when the password does not match', async () => {
    const request = {
      ...PAYLOAD,
      repeatPassword: 'differentPassword'
    };

    await expect(updatePassword.run(request, CURRENT_USER)).rejects.toThrow(
      DomainUnauthorizedException
    );
  });

  it('should throw an error when the password is the same as the old one', async () => {
    const request = {
      password: PAYLOAD.oldPassword,
      repeatPassword: PAYLOAD.oldPassword,
      oldPassword: PAYLOAD.oldPassword
    };

    await expect(updatePassword.run(request, CURRENT_USER)).rejects.toThrow(
      DomainUnauthorizedException
    );
  });

  it('should patch a valid user', async () => {
    expect(await updatePassword.run(PAYLOAD, CURRENT_USER)).toBeUndefined();

    repository.assertUpdateHasBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: createUserId(CURRENT_USER.id),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: expect.any(PasswordHash)
      }) as UserPatch
    );
  });
});
