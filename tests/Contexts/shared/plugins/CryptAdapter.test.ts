import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs', () => ({
  compareSync: jest.fn(),
  genSaltSync: jest.fn(),
  hashSync: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
    verify: jest.fn()
  }
}));

import { CryptAdapter } from '../../../../src/Contexts/shared/plugins/CryptAdapter.js';
import type { UnknownRecord } from '../../../../src/shared/domain/types/UnknownRecord.js';

describe('CryptAdapter', () => {
  const mockedGenSaltSync = genSaltSync as jest.MockedFunction<
    typeof genSaltSync
  >;
  const mockedHashSync = hashSync as jest.MockedFunction<typeof hashSync>;
  const mockedCompareSync = compareSync as jest.MockedFunction<
    typeof compareSync
  >;
  const mockedJwt = jwt as unknown as {
    sign: jest.Mock;
    verify: jest.Mock;
  };

  let adapter: CryptAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CryptAdapter();
  });

  describe('hash', () => {
    it('should hash a password using generated salt', () => {
      mockedGenSaltSync.mockReturnValue('generated-salt');
      mockedHashSync.mockReturnValue('hashed-password');

      const result = adapter.hash('plain-password');

      expect(result).toBe('hashed-password');
      expect(mockedGenSaltSync).toHaveBeenCalledWith(12);
      expect(mockedHashSync).toHaveBeenCalledWith(
        'plain-password',
        'generated-salt'
      );
    });
  });

  describe('compare', () => {
    it('should return true when bcrypt comparison succeeds', () => {
      mockedCompareSync.mockReturnValue(true);

      const result = adapter.compare('plain-password', 'hashed-password');

      expect(result).toBe(true);
      expect(mockedCompareSync).toHaveBeenCalledWith(
        'plain-password',
        'hashed-password'
      );
    });

    it('should return false when bcrypt comparison fails', () => {
      mockedCompareSync.mockReturnValue(false);

      const result = adapter.compare('plain-password', 'hashed-password');

      expect(result).toBe(false);
      expect(mockedCompareSync).toHaveBeenCalledWith(
        'plain-password',
        'hashed-password'
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
