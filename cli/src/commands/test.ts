import { Command } from 'commander';
import { BaseCommand } from './base';
import { TestRunner } from '../core/testRunner';

export class TestCommand extends BaseCommand {
  readonly name = 'test';
  readonly description = 'Run tests';

  async execute(testPath?: string): Promise<void> {
    try {
      this.logger.info('Running tests...');
      const runner = new TestRunner();
      const results = await runner.runTests(testPath);
      
      console.log(`\n🧪 Test Results:`);
      console.log(`Passed: ${results.passed}`);
      console.log(`Failed: ${results.failed}`);
      console.log(`Total: ${results.total}`);
      
      if (results.failed > 0) {
        console.log('\n❌ Some tests failed');
        process.exit(1);
      } else {
        console.log('\n✅ All tests passed');
      }
    } catch (error) {
      this.handleError(error as Error, 'Test execution failed');
    }
  }

  static register(program: Command): void {
    program
      .command('test')
      .description('Run project tests')
      .argument('[path]', 'Test path or pattern')
      .action(async (testPath?: string) => {
        const command = new TestCommand();
        await command.execute(testPath);
      });
  }
}