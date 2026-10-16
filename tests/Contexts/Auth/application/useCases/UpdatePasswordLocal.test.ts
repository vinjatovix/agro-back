import { UpdatePasswordLocal } from '../../../../../src/Contexts/Auth/application/useCases/UpdatePasswordLocal.js';
import { randomUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { Username } from '../../../../../src/Contexts/Auth/domain/value-objects/Username.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainUnauthorizedException,
  InvalidArgumentException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Email } from '../../../../../src/Contexts/shared/domain/valueObject/index.js';
import { EmailMother } from '../../../shared/domain/mothers/EmailMother.js';
import { random } from '../../../shared/fixtures/index.js';
import { AuthRepositoryMock } from '../../__mocks__/AuthRepositoryMock.js';
import { EncrypterAdapterMock } from '../../__mocks__/EncrypterAdapterMock.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

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
  let encrypter: EncrypterAdapterMock;
  let repository: AuthRepositoryMock;
  let updatePassword: UpdatePasswordLocal;

  beforeEach(() => {
    encrypter = new EncrypterAdapterMock({ login: true });
    repository = new AuthRepositoryMock({ find: true });
    updatePassword = new UpdatePasswordLocal({
      authRepository: repository,
      encrypter
    });
  });

  it('should throw an error when the user does not exist', async () => {
    repository = new AuthRepositoryMock();
    updatePassword = new UpdatePasswordLocal({
      authRepository: repository,
      encrypter
    });

    await expect(updatePassword.run(PAYLOAD, CURRENT_USER)).rejects.toThrow(
      DomainNotFoundException
    );

    await expect(updatePassword.run(PAYLOAD, CURRENT_USER)).rejects.toThrow(
      `User not found with email: ${CURRENT_USER.email}`
    );
  });

  it('should reject a weak new password before looking up the user', async () => {
    repository = new AuthRepositoryMock();
    updatePassword = new UpdatePasswordLocal({
      authRepository: repository,
      encrypter
    });
    const searchSpy = jest.spyOn(repository, 'search');

    await expect(
      updatePassword.run(
        { ...PAYLOAD, password: 'weak', repeatPassword: 'weak' },
        CURRENT_USER
      )
    ).rejects.toThrow(InvalidArgumentException);

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should throw an error when the password is invalid', async () => {
    encrypter = new EncrypterAdapterMock({ login: false });
    updatePassword = new UpdatePasswordLocal({
      authRepository: repository,
      encrypter
    });

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
      InvalidArgumentException
    );
  });

  it('should throw an error when the password is the same as the old one', async () => {
    const request = {
      password: PAYLOAD.oldPassword,
      repeatPassword: PAYLOAD.oldPassword,
      oldPassword: PAYLOAD.oldPassword
    };

    await expect(updatePassword.run(request, CURRENT_USER)).rejects.toThrow(
      InvalidArgumentException
    );
  });

  it('should change the password of the stored user', async () => {
    const storedUser = UserMother.active({
      email: new Email(CURRENT_USER.email)
    });
    const before = storedUser.toPrimitives();
    repository.setSearchResult(storedUser);

    expect(await updatePassword.run(PAYLOAD, CURRENT_USER)).toBeUndefined();

    const [updatedFrom, updatedTo] = repository.lastUpdate();
    expect(updatedFrom).toEqual(before);
    expect(updatedTo.password).not.toBe(before.password);
    expect(updatedTo.authMethods).toEqual([
      { ...before.authMethods[0], password: updatedTo.password }
    ]);
    expect(updatedTo.metadata).toEqual(
      expect.objectContaining({
        createdAt: before.metadata.createdAt,
        createdBy: before.metadata.createdBy,
        updatedBy: storedUser.username.value
      })
    );
    encrypter.assertHashHasBeenCalledWith(PAYLOAD.password);
  });

  it('should answer a conflict when the account changed meanwhile', async () => {
    repository.setSearchResult(
      UserMother.active({ email: new Email(CURRENT_USER.email) })
    );
    repository.setUpdateOutcomes('stale');

    await expect(updatePassword.run(PAYLOAD, CURRENT_USER)).rejects.toThrow(
      DomainConflictException
    );
  });
});
