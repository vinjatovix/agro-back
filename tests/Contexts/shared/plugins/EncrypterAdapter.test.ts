import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  }
}));

import { envs } from '../../../../src/apps/agroApi/config/plugins/envs.plugin.js';
import { EncrypterAdapter } from '../../../../src/Contexts/shared/plugins/EncrypterAdapter.js';
import type { UnknownRecord } from '../../../../src/shared/domain/types/UnknownRecord.js';

describe('EncrypterAdapter', () => {
  // Overloaded with a callback form, so MockedFunction would type them as void.
  const mockedHash = hash as unknown as jest.Mock;
  const mockedCompare = compare as unknown as jest.Mock;
  const mockedJwt = jwt as unknown as {
    sign: jest.Mock;
    verify: jest.Mock;
  };

  let adapter: EncrypterAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new EncrypterAdapter();
  });

  describe('hash', () => {
    it('should hash a password with the configured cost', async () => {
      mockedHash.mockResolvedValue('hashed-password');

      const result = await adapter.hash('plain-password');

      expect(result).toBe('hashed-password');
      expect(mockedHash).toHaveBeenCalledWith(
        'plain-password',
        envs.BCRYPT_SALT_ROUNDS
      );
    });
  });

  describe('compare', () => {
    it.each([true, false])(
      'should resolve %s as bcrypt does',
      async (matches) => {
        mockedCompare.mockResolvedValue(matches);

        const result = await adapter.compare(
          'plain-password',
          'hashed-password'
        );

        expect(result).toBe(matches);
        expect(mockedCompare).toHaveBeenCalledWith(
          'plain-password',
          'hashed-password'
        );
      }
    );
  });

  describe('simulateCompare', () => {
    it('should compare against one hash built once with the configured cost, even on concurrent first calls', async () => {
      mockedHash.mockResolvedValue('unusable-hash');
      mockedCompare.mockResolvedValue(false);

      await Promise.all([
        adapter.simulateCompare('first-password'),
        new EncrypterAdapter().simulateCompare('second-password')
      ]);

      expect(mockedHash).toHaveBeenCalledTimes(1);
      expect(mockedHash).toHaveBeenCalledWith(
        expect.any(String),
        envs.BCRYPT_SALT_ROUNDS
      );
      expect(mockedCompare).toHaveBeenCalledWith(
        'first-password',
        'unusable-hash'
      );
      expect(mockedCompare).toHaveBeenCalledWith(
        'second-password',
        'unusable-hash'
      );
    });
  });

  describe('generateToken', () => {
    it('should resolve a token when jwt sign succeeds', async () => {
      mockedJwt.sign.mockImplementation(
        (
          _payload: UnknownRecord,
          _secret: string,
          _options: object,
          callback: (err: Error | null, token?: string) => void
        ) => callback(null, 'signed-token')
      );

      const payload = { sub: 'user-id' };
      const result = await adapter.generateToken(payload, '1h');

      expect(result).toBe('signed-token');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        { expiresIn: '1h' },
        expect.any(Function)
      );
    });

    it('should resolve null when jwt sign fails', async () => {
      mockedJwt.sign.mockImplementation(
        (
          _payload: UnknownRecord,
          _secret: string,
          _options: object,
          callback: (err: Error | null, token?: string) => void
        ) => callback(new Error('sign failed'))
      );

      const result = await adapter.generateToken({ sub: 'user-id' });

      expect(result).toBeNull();
    });

    it('should use configured default duration when not provided', async () => {
      mockedJwt.sign.mockImplementation(
        (
          _payload: UnknownRecord,
          _secret: string,
          _options: object,
          callback: (err: Error | null, token?: string) => void
        ) => callback(null, 'signed-token')
      );

      const payload = { sub: 'user-id' };
      await adapter.generateToken(payload);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        { expiresIn: '2h' },
        expect.any(Function)
      );
    });
  });

  describe('verifyToken', () => {
    it('should resolve decoded payload when jwt verify succeeds', async () => {
      const decoded = { sub: 'user-id', role: 'admin' };

      mockedJwt.verify.mockImplementation(
        (
          _token: string,
          _secret: string,
          callback: (err: Error | null, decoded?: object) => void
        ) => callback(null, decoded)
      );

      const result = await adapter.verifyToken('valid-token');

      expect(result).toEqual(decoded);
      expect(mockedJwt.verify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(String),
        expect.any(Function)
      );
    });

    it('should resolve null when jwt verify fails', async () => {
      mockedJwt.verify.mockImplementation(
        (
          _token: string,
          _secret: string,
          callback: (err: Error | null, decoded?: object) => void
        ) => callback(new Error('verify failed'))
      );

      const result = await adapter.verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should resolve null when jwt verify returns a string payload', async () => {
      mockedJwt.verify.mockImplementation(
        (
          _token: string,
          _secret: string,
          callback: (err: Error | null, decoded?: string) => void
        ) => callback(null, 'decoded-as-string')
      );

      const result = await adapter.verifyToken('valid-token');

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return null when token cannot be verified', async () => {
      jest.spyOn(adapter, 'verifyToken').mockResolvedValue(null);

      const result = await adapter.refreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const now = Math.floor(Date.now() / 1000);

      jest.spyOn(adapter, 'verifyToken').mockResolvedValue({
        sub: 'user-id',
        role: 'admin',
        exp: now - 1,
        iat: now - 100
      });

      const generateTokenSpy = jest.spyOn(adapter, 'generateToken');
      const result = await adapter.refreshToken('expired-token');

      expect(result).toBeNull();
      expect(generateTokenSpy).not.toHaveBeenCalled();
    });

    it('should generate a new token when token is still valid', async () => {
      const now = Math.floor(Date.now() / 1000);

      jest.spyOn(adapter, 'verifyToken').mockResolvedValue({
        sub: 'user-id',
        role: 'admin',
        exp: now + 3600,
        iat: now - 100
      });

      const generateTokenSpy = jest
        .spyOn(adapter, 'generateToken')
        .mockResolvedValue('refreshed-token');

      const result = await adapter.refreshToken('valid-token');

      expect(result).toBe('refreshed-token');
      expect(generateTokenSpy).toHaveBeenCalledWith({
        sub: 'user-id',
        role: 'admin'
      });
    });

    it('should return null when decoded token has no numeric exp', async () => {
      jest.spyOn(adapter, 'verifyToken').mockResolvedValue({
        sub: 'user-id',
        role: 'admin'
      });

      const generateTokenSpy = jest.spyOn(adapter, 'generateToken');
      const result = await adapter.refreshToken('token-without-exp');

      expect(result).toBeNull();
      expect(generateTokenSpy).not.toHaveBeenCalled();
    });
  });
});
