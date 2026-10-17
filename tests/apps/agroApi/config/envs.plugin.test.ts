const ENVS_MODULE =
  '../../../../src/apps/agroApi/config/plugins/envs.plugin.js';

/** Loads the settings from `process.env` alone (no `.env.test` file read). */
const loadEnvs = (): unknown => {
  let loaded: unknown;

  jest.isolateModules(() => {
    jest.doMock('dotenv', () => ({
      __esModule: true,
      default: { config: jest.fn() }
    }));
    loaded = jest.requireActual<{ envs: unknown }>(ENVS_MODULE).envs;
  });

  return loaded;
};

describe('envs plugin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // `.env.test` is already in `process.env`: every other setting is valid.
    jest.requireActual(ENVS_MODULE);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('should load with a Google client id', () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client.apps.googleusercontent.com';

    expect(loadEnvs()).toMatchObject({
      GOOGLE_CLIENT_ID: 'web-client.apps.googleusercontent.com'
    });
  });

  it.each([
    ['empty', ''],
    ['absent', undefined]
  ])('should refuse to load with the Google client id %s', (_case, value) => {
    if (value === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = value;
    }

    expect(loadEnvs).toThrow(/GOOGLE_CLIENT_ID/);
  });
});
