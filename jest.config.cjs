module.exports = {
  testEnvironment: 'node',
  testRegex: '.*\.spec\.ts$',
  transform: {'^.+\.(t|j)s$': ['ts-jest', {tsconfig: 'tsconfig.json'}]},
  moduleFileExtensions: ['js', 'json', 'ts'],
};
