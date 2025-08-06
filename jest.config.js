module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'CLI',
      testMatch: ['<rootDir>/cli/tests/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'cli/src/**/*.ts',
        '!cli/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'Extension',
      testMatch: ['<rootDir>/extension/tests/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'extension/src/**/*.ts',
        '!extension/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'Shared',
      testMatch: ['<rootDir>/shared/tests/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'shared/src/**/*.ts',
        '!shared/src/**/*.d.ts',
      ],
    },
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};