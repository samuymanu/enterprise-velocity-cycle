module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/backend/**/*.test.ts', '**/backend/**/*.test.js'],
  setupFiles: ['dotenv/config'],
  verbose: true,
};
