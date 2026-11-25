module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  testTimeout: 20000,
  globalSetup: '<rootDir>/scripts/test-setup.js',
  globalTeardown: '<rootDir>/scripts/test-teardown.js',
};
