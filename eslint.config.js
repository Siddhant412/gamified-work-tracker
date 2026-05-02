const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', 'dist-e2e/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '.expo/**'],
  },
];
