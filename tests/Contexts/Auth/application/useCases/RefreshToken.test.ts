import { RefreshToken } from '../../../../../src/Contexts/Auth/application/useCases/RefreshToken.js';
import { DomainUnauthorizedException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../shared/fixtures/index.js';
import { AuthRepositoryMock } from '../../__mocks__/AuthRepositoryMock.js';
import { EncrypterAdapterMock } from '../../__mocks__/EncrypterAdapterMock.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

const errorOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error
  );

describe('RefreshToken', () => {
  let repository: AuthRepositoryMock;
  let encrypter: EncrypterAdapterMock;
  const token = random.word({ min: 6, max: 255 });

  const build = (): RefreshToken =>
    new RefreshToken({ authRepository: repository, encrypter });

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    encrypter = new EncrypterAdapterMock({ refresh: true });
  });

  it('should return a new token for an active account', async () => {
    const user = UserMother.active();
    repository.setSearchByIdResult(user);

    const newToken = await build().run({ token, userId: user.id });

    expect(newToken).toEqual(expect.any(String));
    repository.assertSearchByIdHasBeenCalledWith(user.id);
    encrypter.assertRefreshTokenHasBeenCalledWith(token);
  });

  it('should throw an auth error when token cannot be refreshed', async () => {
    encrypter = new EncrypterAdapterMock({ refresh: false });
    const user = UserMother.active();
    repository.setSearchByIdResult(user);

    await expect(build().run({ token, userId: user.id })).rejects.toThrow(
      DomainUnauthorizedException
    );
  });

  it.each([
    ['the account no longer exists', () => null],
    ['the email is not validated', () => UserMother.pending()]
  ])('should refuse like a bad token when %s', async (_case, found) => {
    repository.setSearchByIdResult(found());

    const refused = await errorOf(
      build().run({ token, userId: random.uuid() })
    );

    expect(refused).toBeInstanceOf(DomainUnauthorizedException);
    encrypter = new EncrypterAdapterMock({ refresh: false });
    repository.setSearchByIdResult(UserMother.active());
    expect(refused).toEqual(
      await errorOf(build().run({ token, userId: random.uuid() }))
    );
  });
});
