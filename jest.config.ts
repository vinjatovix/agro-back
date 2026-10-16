import type { Config } from 'jest';

/**
 * How long a finished test file (or the whole run) may keep resources open
 * before the leak guard fails it. Read by `LeakGuardEnvironment` and the
 * `leakWatchdog` from `testEnvironmentOptions`; not configurable from the
 * environment.
 */
const LEAK_GRACE_PERIOD_MS = 10_000;

const baseProjectConfig: Config = {
  preset: 'ts-jest',
  // Fails a file that ends with timers, sockets or servers still open.
  testEnvironment: '<rootDir>/tests/support/jest/LeakGuardEnvironment.ts',
  testEnvironmentOptions: { leakGracePeriodMs: LEAK_GRACE_PERIOD_MS },

  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  // Jest runs CommonJS. `bundler` resolution, unlike the deprecated `node`
  // (node10), is accepted with CommonJS output from TypeScript 6 on.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'bundler'
        }
      }
    ],
    // Migrations are plain ESM `.js` files run by migrate-mongo.
    '^.+/migrations/.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          module: 'CommonJS',
          moduleResolution: 'bundler'
        }
      }
    ],
    // uuid >= 12 and @apidevtools/json-schema-ref-parser (used by
    // pure-openapi-assert) ship ESM only; transpile them to CommonJS for Jest.
    '^.+/node_modules/(uuid|@apidevtools/json-schema-ref-parser)/.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          module: 'CommonJS',
          moduleResolution: 'bundler'
        }
      }
    ]
  },

  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|@apidevtools/json-schema-ref-parser)/)'
  ],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  cacheDirectory: '.tmp/jestCache'
};

const config: Config = {
  // A file opens a real Mongo connection if and only if it is `*.db.test.ts`.
  projects: [
    {
      ...baseProjectConfig,
      displayName: 'no-db',
      testPathIgnorePatterns: ['/node_modules/', String.raw`\.db\.test\.ts$`],
      setupFiles: ['<rootDir>/tests/support/jest/noDbGuard.ts']
    },
    {
      ...baseProjectConfig,
      displayName: 'db',
      testMatch: ['<rootDir>/**/*.db.test.ts'],
      globalSetup: '<rootDir>/tests/support/jest/dbGlobalSetup.ts'
    }
  ],

  // Fails the run when something keeps the main process alive after it.
  globalTeardown: '<rootDir>/tests/support/jest/leakWatchdog.ts',

  collectCoverageFrom: [
    'src/**/*.ts',

    '!src/**/*.d.ts',
    '!src/index.ts',

    '!src/**/interfaces/**',
    '!src/**/types/**',
    '!src/**/dto/**',

    '!src/**/*.interface.ts',
    '!src/**/*.interfaces.ts',
    '!src/**/*.types.ts',
    '!src/**/*.dto.ts'
  ],

  coverageDirectory: 'coverage',
  coverageProvider: 'v8',

  watchPathIgnorePatterns: ['<rootDir>/test-report.json'],

  maxWorkers: '50%'
};

export default config;
