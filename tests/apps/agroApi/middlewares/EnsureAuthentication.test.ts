import type { Request, Response, NextFunction } from 'express';
import { EnsureAuthentication } from '../../../../src/apps/agroApi/middlewares/EnsureAuthentication.js';
import type { EncrypterTool } from '../../../../src/Contexts/shared/plugins/EncrypterTool.js';

type MockLogger = {
  warn: jest.Mock;
  error: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
};

describe('EnsureAuthentication.run', () => {
  const logger: MockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  const encrypter: jest.Mocked<EncrypterTool> = {
    hash: jest.fn(),
    compare: jest.fn(),
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
    refreshToken: jest.fn()
  };

  const res = {
    locals: {}
  } as Response;

  const next = jest.fn() as NextFunction;

  const makeReq = (auth?: string): Request =>
    ({
      headers: {
        authorization: auth
      },
      get: jest.fn(),
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' }
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    (res.locals as Record<string, unknown>) = {};
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (res.locals as Record<string, unknown>) = {};
  });

  it('should fail when no token', async () => {
    const req = makeReq(undefined);

    await EnsureAuthentication.run({ logger, encrypter }, req, res, next);

    expect(logger.warn).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should fail when token is invalid', async () => {
    const req = makeReq('Bearer token');

    encrypter.verifyToken.mockResolvedValue(null);

    await EnsureAuthentication.run({ logger, encrypter }, req, res, next);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(encrypter.verifyToken).toHaveBeenCalledWith('token');
    expect(logger.warn).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should authenticate user and set res.locals', async () => {
    const req = makeReq('Bearer valid-token');

    encrypter.verifyToken.mockResolvedValue({
      id: 'user-1',
      roles: ['user']
    });

    await EnsureAuthentication.run({ logger, encrypter }, req, res, next);

    expect(res.locals.user).toEqual(
      expect.objectContaining({
        id: 'user-1',
        roles: ['user'],
        token: 'valid-token'
      })
    );

    expect(next).toHaveBeenCalledWith();
  });
});
