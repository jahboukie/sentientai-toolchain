"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest setup file
const globals_1 = require("@jest/globals");
// Extend Jest timeout for integration tests
globals_1.jest.setTimeout(10000);
// Mock console methods to reduce noise in tests
const originalConsole = console;
(0, globals_1.beforeAll)(() => {
    global.console = {
        ...originalConsole,
        // Disable console.log in tests unless explicitly needed
        log: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        info: globals_1.jest.fn(),
    };
});
(0, globals_1.afterAll)(() => {
    global.console = originalConsole;
});
// Clean up environment after each test
(0, globals_1.afterEach)(() => {
    globals_1.jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map