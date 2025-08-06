import { Command } from 'commander';
import { BaseCommand } from './base';
import { ProjectInitializer } from '../core/projectInitializer';

export class InitCommand extends BaseCommand {
  readonly name = 'init';
  readonly description = 'Initialize Sentient in current project';

  async execute(): Promise<void> {
    try {
      this.logger.info('Initializing Sentient project...');
      const initializer = new ProjectInitializer();
      await initializer.initialize();
      this.logger.info('✅ Sentient project initialized successfully');
    } catch (error) {
      this.handleError(error as Error, 'Project initialization failed');
    }
  }

  static register(program: Command): void {
    program
      .command('init')
      .description('Initialize Sentient in current project')
      .action(async () => {
        const command = new InitCommand();
        await command.execute();
      });
  }
}