import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS', moduleResolution: 'node', ignoreDeprecations: '6.0' } }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  cacheDirectory: '.tmp/jestCache',

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/jest',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageReporters: ['lcov'],
  coveragePathIgnorePatterns: [
    '/interfaces/',
    '/routes/',
    '/controllers/',
    '/dist/',
    '/node_modules/',
    '/test/',
    '/tests/',
    '/index.ts',
    '/server.ts'
  ],

  watchPathIgnorePatterns: ['<rootDir>/test-report.json'],
  // testResultsProcessor: 'jest-sonar-reporter', // si usas Sonar
  maxWorkers: '50%'
};

export default config;
