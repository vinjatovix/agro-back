// The default export is the default profile. Cucumber adds feature paths given
// on the command line to `paths`, so the full-suite glob only applies when none
// are given (e.g. `npm run test:features -- path/to/some.feature`).
const cliFeaturePaths = process.argv
  .slice(2)
  .some((arg) => /\.feature(:\d+)*$/.test(arg));

export default {
  import: [
    'setupTests.ts',
    'tests/apps/agroApi/features/step_definitions/*.steps.ts'
  ],
  paths: cliFeaturePaths ? [] : ['tests/apps/agroApi/features/**/*.feature'],
  order: 'random'
};
