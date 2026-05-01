import type { AddressInfo } from 'node:net';

import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';

const listenMock = jest.fn<Promise<void>, []>();
const stopMock = jest.fn<Promise<void>, []>();
const getHTTPServerMock = jest.fn();
const serverConstructorMock = jest.fn();

jest.mock('../../../src/apps/agroApi/server.js', () => ({
  Server: jest
    .fn()
    .mockImplementation((host: string, port: string, logger: AppLogger) => {
      serverConstructorMock(host, port, logger);

      return {
        listen: listenMock,
        stop: stopMock,
        getHTTPServer: getHTTPServerMock
      };
    })
}));

import { AgroBackApp } from '../../../src/apps/agroApi/AgroBackApp.js';

describe('AgroBackApp', () => {
  let logger: AppLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    listenMock.mockResolvedValue();
    stopMock.mockResolvedValue();
    getHTTPServerMock.mockReturnValue(undefined);

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  it('should start server with provided host and port', async () => {
    const app = new AgroBackApp({
      host: 'http://localhost',
      port: '0'
    });

    getHTTPServerMock.mockReturnValue({
      address: () => ({ port: 3456 }) satisfies Partial<AddressInfo>
    });

    await app.start(logger);

    expect(serverConstructorMock).toHaveBeenCalledWith(
      'http://localhost',
      '0',
      logger
    );
    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(app.host).toBe('http://localhost:3456');
    expect(logger.info).toHaveBeenCalledWith(
      'Server running at http://localhost:3456'
    );
  });

  it('should use the injected config values', async () => {
    const app = new AgroBackApp({
      host: 'http://agro.test',
      port: '8080'
    });

    getHTTPServerMock.mockReturnValue({
      address: () => ({ port: 9001 }) satisfies Partial<AddressInfo>
    });

    await app.start(logger);

    expect(serverConstructorMock).toHaveBeenCalledWith(
      'http://agro.test',
      '8080',
      logger
    );
    expect(app.host).toBe('http://agro.test:9001');
    expect(logger.info).toHaveBeenCalledWith(
      'Server running at http://agro.test:9001'
    );
  });

  it('should fall back to configured port when address is not an object', async () => {
    const app = new AgroBackApp({
      host: 'http://localhost',
      port: '8080'
    });

    getHTTPServerMock.mockReturnValue({
      address: () => 'pipe-address'
    });

    await app.start(logger);

    expect(app.host).toBe('http://localhost:8080');
    expect(logger.info).toHaveBeenCalledWith(
      'Server running at http://localhost:8080'
    );
  });

  it('should stop server and log when server exists', async () => {
    const app = new AgroBackApp({
      host: 'http://localhost',
      port: '0'
    });

    getHTTPServerMock.mockReturnValue({
      address: () => ({ port: 3456 }) satisfies Partial<AddressInfo>
    });

    await app.start(logger);
    await app.stop(logger);

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Server stopped');
  });

  it('should do nothing on stop when server was not started', async () => {
    const app = new AgroBackApp({
      host: 'http://localhost',
      port: '0'
    });

    await app.stop(logger);

    expect(stopMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith('Server stopped');
  });

  it('should expose the current http server through getter', async () => {
    const httpServer = {
      address: jest.fn()
    };

    const app = new AgroBackApp({
      host: 'http://localhost',
      port: '0'
    });
    getHTTPServerMock.mockReturnValue(httpServer);

    await app.start(logger);

    expect(app.httpServer).toBe(httpServer);
  });
});
