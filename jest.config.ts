export default {
  moduleNameMapper: {
    '^@searsuite/sear-browser-adapters$': '<rootDir>/packages/sear-browser-adapters/src',
    '^@searsuite/(sear-plugin-web-.*)$': '<rootDir>/packages/$1/src',
    '^@searsuite/(.*)$': '<rootDir>/../searsuite/packages/$1/src',
  },
  testEnvironment: 'jsdom',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  preset: 'ts-jest',
  setupFiles: ['jest-canvas-mock'],
};
