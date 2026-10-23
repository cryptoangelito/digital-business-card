module.exports = {
  ...require('./jest.config.cjs'),
  testMatch: ['**/*.e2e-spec.ts'],
  testTimeout: 30000,
};