import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../dist/cli.js');
const TEST_DIR = path.join(__dirname, '../.test-data/integration');

describe('CLI Integration Tests', () => {
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    await fs.ensureDir(TEST_DIR);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.remove(TEST_DIR);
  });

  const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: 'pipe',
        cwd: TEST_DIR
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  };

  describe('Basic CLI functionality', () => {
    it('should show version', async () => {
      const result = await runCLI(['--version']);
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should show help', async () => {
      const result = await runCLI(['--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
    });

    it('should show memory help', async () => {
      const result = await runCLI(['memory', '--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Knowledge base operations');
    });

    it('should show database help', async () => {
      const result = await runCLI(['database', '--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Database management operations');
    });
  });

  describe('Initialization', () => {
    it('should initialize project', async () => {
      const result = await runCLI(['init', '--force']);
      // Should complete successfully (exit code 0 or 1 for already initialized)
      expect([0, 1]).toContain(result.code);
      // If there's output, it should be about initialization
      if (result.stdout.trim()) {
        expect(result.stdout.toLowerCase()).toMatch(/initialized|already|created/);
      }
    });
  });

  describe('Memory operations', () => {
    beforeAll(async () => {
      // Ensure project is initialized
      await runCLI(['init', '--force']);
    });

    it('should store memory', async () => {
      const result = await runCLI([
        'memory', 'store',
        '--prompt', 'Test CLI integration',
        '--reasoning', 'Testing CLI memory storage'
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('stored');
    });

    it('should search memory', async () => {
      const result = await runCLI(['memory', 'search', 'integration']);
      expect(result.code).toBe(0);
      // Should contain search results (may include log messages)
      expect(result.stdout).toContain('[');
    });

    it('should show memory stats', async () => {
      const result = await runCLI(['memory', 'stats']);
      expect(result.code).toBe(0);
      // Should contain stats information
      expect(result.stdout).toContain('totalExecutions');
    });

    it('should store enhanced memory', async () => {
      const result = await runCLI([
        'memory', 'store-enhanced',
        '--prompt', 'Enhanced CLI test',
        '--reasoning', 'Testing enhanced memory storage',
        '--success',
        '--tags', 'cli,test,integration',
        '--priority', 'high',
        '--category', 'testing'
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Enhanced context stored');
    });

    it('should show analytics', async () => {
      const result = await runCLI(['memory', 'analytics']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Memory Analytics Dashboard');
      expect(result.stdout).toContain('Overview:');
      expect(result.stdout).toContain('Total Executions:');
    });

    it('should show relevance weights', async () => {
      const result = await runCLI(['memory', 'weights']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Relevance Scoring Weights');
      expect(result.stdout).toContain('ftsScore');
      expect(result.stdout).toContain('semanticScore');
    });
  });

  describe('Database operations', () => {
    beforeAll(async () => {
      // Ensure project is initialized
      await runCLI(['init', '--force']);
    });

    it('should show database stats', async () => {
      const result = await runCLI(['database', 'stats']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Database Statistics');
      expect(result.stdout).toContain('Database Size:');
    });

    it('should create backup', async () => {
      const result = await runCLI([
        'database', 'backup',
        '--description', 'CI test backup'
      ]);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Database backup created');
    });

    it('should list backups', async () => {
      const result = await runCLI(['database', 'list-backups']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Available Backups');
    });

    it('should check database integrity', async () => {
      const result = await runCLI(['database', 'check']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Database Integrity Report');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid commands gracefully', async () => {
      const result = await runCLI(['invalid-command']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should handle missing arguments', async () => {
      const result = await runCLI(['memory', 'search']);
      expect(result.code).toBe(1);
    });
  });

  describe('Performance', () => {
    beforeAll(async () => {
      await runCLI(['init', '--force']);
    });

    it('should handle multiple memory operations efficiently', async () => {
      const startTime = Date.now();
      
      // Store multiple memories
      for (let i = 0; i < 5; i++) {
        await runCLI([
          'memory', 'store',
          '--prompt', `Performance test ${i}`,
          '--reasoning', 'Testing performance'
        ]);
      }
      
      // Search memories
      await runCLI(['memory', 'search', 'performance']);
      
      // Get analytics
      await runCLI(['memory', 'analytics']);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);
  });
});
