import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setupTests.ts'],
  cacheDirectory: '.tmp/jestCache',

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageReporters: ['lcov'],
  coveragePathIgnorePatterns: [
    '/interfaces/',
    '/dist/',
    '/node_modules/',
    '/test/',
    '/tests/',
    '/start.ts',
    '/server.ts'
  ],

  watchPathIgnorePatterns: ['<rootDir>/test-report.json'],
  // testResultsProcessor: 'jest-sonar-reporter', // si usas Sonar
  maxWorkers: '50%'
};

export default config;
