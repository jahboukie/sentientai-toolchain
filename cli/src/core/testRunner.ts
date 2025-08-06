import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../utils/logger';

export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  duration: number;
  output: string;
  success: boolean;
}

export class TestRunner {
  async runTests(testPath?: string): Promise<TestResults> {
    const startTime = Date.now();
    
    try {
      const testCommand = await this.detectTestCommand();
      const args = this.buildTestArgs(testCommand, testPath);
      
      logger.info(`Running tests with command: ${testCommand.command} ${args.join(' ')}`);
      
      const output = await this.executeCommand(testCommand.command, args);
      const results = this.parseTestResults(output, testCommand.type);
      
      results.duration = Date.now() - startTime;
      results.output = output;
      
      logger.info(`Tests completed: ${results.passed}/${results.total} passed`);
      return results;
    } catch (error) {
      logger.error('Test execution failed', error);
      return {
        passed: 0,
        failed: 1,
        total: 1,
        duration: Date.now() - startTime,
        output: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }

  private async detectTestCommand(): Promise<{ command: string; type: string }> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    // Check if package.json exists and has test script
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const scripts = packageJson.scripts || {};
      
      if (scripts.test) {
        return { command: 'npm', type: 'npm' };
      }
      
      // Check for specific test runners
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.jest) {
        return { command: 'npx', type: 'jest' };
      }
      if (deps.mocha) {
        return { command: 'npx', type: 'mocha' };
      }
      if (deps['@jest/core']) {
        return { command: 'npx', type: 'jest' };
      }
    }

    // Check for Python tests
    if (await this.hasFiles('**/*.py', ['test_*.py', '*_test.py'])) {
      return { command: 'python', type: 'pytest' };
    }

    // Check for Java tests
    if (await this.hasFiles('**/*.java', ['*Test.java', '*Tests.java'])) {
      return { command: 'mvn', type: 'maven' };
    }

    // Default to npm test
    return { command: 'npm', type: 'npm' };
  }

  private async hasFiles(pattern: string, testPatterns: string[]): Promise<boolean> {
    try {
      const { glob } = await import('glob');
      for (const testPattern of testPatterns) {
        const files = await glob(testPattern);
        if (files.length > 0) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private buildTestArgs(testCommand: { command: string; type: string }, testPath?: string): string[] {
    const { command, type } = testCommand;
    
    switch (type) {
      case 'npm':
        const args = ['test'];
        if (testPath) args.push('--', testPath);
        return args;
        
      case 'jest':
        const jestArgs = ['jest'];
        if (testPath) jestArgs.push(testPath);
        return jestArgs;
        
      case 'mocha':
        const mochaArgs = ['mocha'];
        if (testPath) mochaArgs.push(testPath);
        return mochaArgs;
        
      case 'pytest':
        const pytestArgs = ['-m', 'pytest'];
        if (testPath) pytestArgs.push(testPath);
        return pytestArgs;
        
      case 'maven':
        return ['test'];
        
      default:
        return ['test'];
    }
  }

  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        const output = stdout + stderr;
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Test command failed with code ${code}:\n${output}`));
        }
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private parseTestResults(output: string, testType: string): TestResults {
    let passed = 0;
    let failed = 0;
    let total = 0;

    switch (testType) {
      case 'jest':
        // Parse Jest output
        const jestMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
        if (jestMatch) {
          failed = parseInt(jestMatch[1]);
          passed = parseInt(jestMatch[2]);
          total = parseInt(jestMatch[3]);
        } else {
          // Alternative Jest format
          const altMatch = output.match(/(\d+)\s+passing/);
          if (altMatch) {
            passed = parseInt(altMatch[1]);
            total = passed;
          }
        }
        break;
        
      case 'mocha':
        // Parse Mocha output
        const mochaMatch = output.match(/(\d+)\s+passing/);
        const failingMatch = output.match(/(\d+)\s+failing/);
        if (mochaMatch) passed = parseInt(mochaMatch[1]);
        if (failingMatch) failed = parseInt(failingMatch[1]);
        total = passed + failed;
        break;
        
      case 'pytest':
        // Parse pytest output
        const pytestMatch = output.match(/(\d+)\s+passed/);
        const pytestFailedMatch = output.match(/(\d+)\s+failed/);
        if (pytestMatch) passed = parseInt(pytestMatch[1]);
        if (pytestFailedMatch) failed = parseInt(pytestFailedMatch[1]);
        total = passed + failed;
        break;

      default:
        // Generic parsing - look for common patterns
        const passedMatch = output.match(/(\d+)\s+(?:passed|passing)/i);
        const failedMatch = output.match(/(\d+)\s+(?:failed|failing)/i);
        if (passedMatch) passed = parseInt(passedMatch[1]);
        if (failedMatch) failed = parseInt(failedMatch[1]);
        total = passed + failed;
    }

    return {
      passed,
      failed,
      total,
      duration: 0, // Will be set by caller
      output,
      success: failed === 0 && total > 0,
    };
  }
}