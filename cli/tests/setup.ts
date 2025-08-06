// Jest setup file
import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Disable console.log in tests unless explicitly needed
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  } as any;
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up environment after each test
afterEach(() => {
  jest.clearAllMocks();
});