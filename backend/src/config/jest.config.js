export default {
  testEnvironment: "node",

  transform: {},
  extensionsToTreatAsEsm: [".js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js",
    "**/__tests__/**/*.js",
  ],

  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/app.js",
    "!src/**/*.config.js",
    "!src/tests/**",
    "!src/generated/**",
  ],

  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],

  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  testTimeout: 30000,

  verbose: true,

  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  detectOpenHandles: true,
  forceExit: true,

  modulePaths: ["<rootDir>"],

  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
};
