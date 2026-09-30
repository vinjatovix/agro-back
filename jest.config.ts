import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'node',
          ignoreDeprecations: '6.0'
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
          moduleResolution: 'node',
          ignoreDeprecations: '6.0'
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

  cacheDirectory: '.tmp/jestCache',

  collectCoverage: true,

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
