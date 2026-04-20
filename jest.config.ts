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
    ]
  },

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  cacheDirectory: '.tmp/jestCache',

  collectCoverage: false,

  watchPathIgnorePatterns: ['<rootDir>/test-report.json'],

  maxWorkers: '50%'
};

export default config;
