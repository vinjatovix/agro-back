type TransportOptions = { silent?: boolean; filename?: string };

type FakeWinston = {
  createLogger: jest.Mock;
  format: Record<string, jest.Mock>;
  transports: { File: jest.Mock; Console: jest.Mock; MongoDB: jest.Mock };
};

type Environment = { NODE_ENV: string; TEST_LOGS: boolean };

const ENVS_MODULE =
  '../../../../src/apps/agroApi/config/plugins/envs.plugin.js';
const LOGGER_MODULE =
  '../../../../src/Contexts/shared/plugins/logger.plugin.js';

const createFakeWinston = (): FakeWinston => ({
  createLogger: jest.fn(() => ({ add: jest.fn(), transports: [] })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: { File: jest.fn(), Console: jest.fn(), MongoDB: jest.fn() }
});

const loadLoggerWith = (environment: Environment): FakeWinston => {
  const winston = createFakeWinston();

  jest.isolateModules(() => {
    jest.doMock('winston', () => ({ __esModule: true, default: winston }));
    jest.doMock('winston-mongodb', () => ({}));
    jest.doMock(ENVS_MODULE, () => ({ envs: environment }));
    jest.requireActual(LOGGER_MODULE);
  });

  return winston;
};

const consoleOptions = (winston: FakeWinston): TransportOptions[] =>
  winston.transports.Console.mock.calls.map(
    ([options]: [TransportOptions]) => options
  );

describe('logger plugin transports', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('under test', () => {
    it('should build no file transport', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: false });

      expect(winston.transports.File).not.toHaveBeenCalled();
    });

    it('should keep the console silent by default', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: false });

      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: true })
      ]);
    });

    it('should print to the console when test logs are enabled', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: true });

      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: false })
      ]);
      expect(winston.transports.File).not.toHaveBeenCalled();
    });
  });

  describe('under development', () => {
    it('should build both file transports and a printing console', () => {
      const winston = loadLoggerWith({
        NODE_ENV: 'development',
        TEST_LOGS: false
      });

      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: false })
      ]);
    });
  });

  describe('under production', () => {
    it('should build both file transports and no console', () => {
      const winston = loadLoggerWith({
        NODE_ENV: 'production',
        TEST_LOGS: false
      });

      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(winston.transports.Console).not.toHaveBeenCalled();
    });
  });
});
