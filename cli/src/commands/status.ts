import { Command } from 'commander';
import { BaseCommand } from './base';
import { SystemStatus } from '../core/systemStatus';

export class StatusCommand extends BaseCommand {
  readonly name = 'status';
  readonly description = 'Show Sentient system status';

  async execute(): Promise<void> {
    try {
      const status = new SystemStatus();
      const info = await status.getStatus();
      
      console.log('\n📊 Sentient System Status\n');
      console.log(`Project: ${info.project.initialized ? '✅' : '❌'} ${info.project.path}`);
      console.log(`Database: ${info.database.connected ? '✅' : '❌'} ${info.database.path}`);
      console.log(`Memory entries: ${info.memory.totalEntries}`);
      console.log(`CLI version: ${info.cli.version}`);
      console.log(`Uptime: ${info.system.uptime}`);
    } catch (error) {
      this.handleError(error as Error, 'Status check failed');
    }
  }

  static register(program: Command): void {
    program
      .command('status')
      .description('Show Sentient system status')
      .action(async () => {
        const command = new StatusCommand();
        await command.execute();
      });
  }
}