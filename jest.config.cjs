module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  transform: { '^.+[.]ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleFileExtensions: ['js', 'json', 'ts'],
};