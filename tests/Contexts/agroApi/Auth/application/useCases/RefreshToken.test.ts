import { RefreshToken } from '../../../../../../src/Contexts/agroApi/Auth/application/useCases/RefreshToken.js';
import { CryptAdapterMock } from '../../__mocks__/CryptAdapterMock.js';
import { random } from '../../fixtures/shared/index.js';

describe('RefreshToken', () => {
  it('should return a new token when current token is refreshable', async () => {
    const encrypter = new CryptAdapterMock({ refresh: true });
    const refreshToken = new RefreshToken(encrypter);
    const token = random.word({ min: 6, max: 255 });

    const newToken = await refreshToken.run(token);

    expect(newToken).toEqual(expect.any(String));
    encrypter.assertRefreshTokenHasBeenCalledWith(token);
  });

  it('should throw an auth error when token cannot be refreshed', async () => {
    const encrypter = new CryptAdapterMock({ refresh: false });
    const refreshToken = new RefreshToken(encrypter);
    const token = random.word({ min: 6, max: 255 });

    await expect(refreshToken.run(token)).rejects.toThrow(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: 'Invalid token'
      })
    );
    encrypter.assertRefreshTokenHasBeenCalledWith(token);
  });
});
