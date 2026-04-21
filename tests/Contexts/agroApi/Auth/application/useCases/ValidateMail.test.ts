import { ValidateMail } from '../../../../../../src/Contexts/agroApi/Auth/application/useCases/ValidateMail.js';
import { UserPatch } from '../../../../../../src/Contexts/agroApi/Auth/domain/UserPatch.js';
import { CryptAdapterMock, UserRepositoryMock } from '../../__mocks__/index.js';
import { random } from '../../../../shared/fixtures/index.js';

describe('ValidateMail', () => {
  let encrypter: CryptAdapterMock;
  let repository: UserRepositoryMock;
  let service: ValidateMail;

  beforeEach(() => {
    encrypter = new CryptAdapterMock({ token: true });
    repository = new UserRepositoryMock({ find: true });
    service = new ValidateMail(repository, encrypter);
  });

  it('should validate the user', async () => {
    const token = random.word({ min: 6, max: 255 });

    await service.run({ token });

    encrypter.assertVerifyTokenHasBeenCalledWith(token);
    repository.assertSearchHasBeenCalledWith(expect.any(String));
    repository.assertUpdateHasBeenCalledWith(expect.any(UserPatch));
    encrypter.assertRefreshTokenHasBeenCalledWith(token);
  });

  it('should throw an error if the token is invalid', async () => {
    encrypter = new CryptAdapterMock({ token: false });
    service = new ValidateMail(repository, encrypter);
    const token = random.word({ min: 6, max: 255 });

    await expect(service.run({ token })).rejects.toThrow({
      name: 'UnauthorizedError',
      message: 'Invalid token'
    });
  });

  it('should throw an error if the user is not found', async () => {
    repository = new UserRepositoryMock({ find: false });
    service = new ValidateMail(repository, encrypter);
    const token = random.word({ min: 6, max: 255 });

    await expect(service.run({ token })).rejects.toThrow({
      name: 'UnauthorizedError',
      message: 'Invalid token'
    });
  });
});
