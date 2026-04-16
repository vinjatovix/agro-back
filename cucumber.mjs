export default {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'setupTests.ts',
      'tests/apps/agroApi/features/step_definitions/*.steps.ts'
    ],
    paths: ['tests/apps/agroApi/features/**/*.feature'],
    publishQuiet: true
  }
};