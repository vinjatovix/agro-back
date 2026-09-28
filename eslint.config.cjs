const { defineConfig, globalIgnores } = require('eslint/config');

const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const importX = require('eslint-plugin-import-x');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: false
    },

    languageOptions: {
      globals: {
        ...globals.node
      },
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },

    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import-x': importX
    },

    extends: compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'prettier'
    ),

    rules: {
      complexity: ['error', 10],
      // AGENTS.md import order: Node built-ins, npm packages, then parent
      // (distant first), then siblings; alphabetical within each group.
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'parent', ['sibling', 'index']],
          'newlines-between': 'ignore',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false
          }
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },

  globalIgnores([
    '**/dist/',
    '**/node_modules/',
    '**/coverage/',
    '**/docker/',
    'eslint.config.cjs',
    'commitlint.config.cjs',
    'cucumber.mjs'
  ])
]);
