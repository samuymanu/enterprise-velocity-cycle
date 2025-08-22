/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.integration.ts'],
  setupFiles: ['dotenv/config'],
  verbose: true,
};
