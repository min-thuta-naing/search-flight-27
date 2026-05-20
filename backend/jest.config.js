/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
    '^../models/SearchStatistics$': '<rootDir>/src/__tests__/__mocks__/models.ts',
    '^../models/Airport$': '<rootDir>/src/__tests__/__mocks__/models.ts',
    '^../utils/airportCodeConverter$': '<rootDir>/src/__tests__/__mocks__/models.ts',
    '^../services/dashboardSummaryService$': '<rootDir>/src/__tests__/__mocks__/dashboardSummaryService.ts',
    '^../utils/continentMapper$': '<rootDir>/src/__tests__/__mocks__/models.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: { module: 'commonjs' },
    },
  },
};
