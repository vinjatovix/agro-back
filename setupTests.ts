import { config } from 'dotenv';

config({
  path: '.env.test'
});

const {
  beforeEach: jestBeforeEach,
  describe: jestDescribe,
  expect: jestExpect,
  jest: jestGlobal
} = globalThis as {
  beforeEach?: unknown;
  describe?: unknown;
  expect?: unknown;
  jest?: unknown;
};

if (jestBeforeEach && jestDescribe && jestExpect && jestGlobal) {
  Object.assign(globalThis, {
    jest: jestGlobal,
    expect: jestExpect,
    describe: jestDescribe,
    beforeEach: jestBeforeEach
  });
}
