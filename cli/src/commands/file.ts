import { Command } from 'commander';
import { BaseCommand } from './base';
import { FileOperations } from '../core/fileOperations';

export class FileCommands extends BaseCommand {
  readonly name = 'file';
  readonly description = 'File operation commands';

  async execute(): Promise<void> {
    // This is handled by individual subcommands
  }

  static register(program: Command): void {
    const fileCmd = program
      .command('file')
      .description('File operations');

    fileCmd
      .command('read <path>')
      .description('Read file content')
      .action(async (path: string) => {
        try {
          const fileOps = new FileOperations();
          const content = await fileOps.readFile(path);
          console.log(content);
        } catch (error) {
          console.error('Failed to read file:', error);
          process.exit(1);
        }
      });

    fileCmd
      .command('write <path>')
      .description('Write file content')
      .option('-c, --content <content>', 'File content to write')
      .action(async (path: string, options: { content?: string }) => {
        try {
          const fileOps = new FileOperations();
          const content = options.content || '';
          await fileOps.writeFile(path, content);
          console.log(`✅ File written: ${path}`);
        } catch (error) {
          console.error('Failed to write file:', error);
          process.exit(1);
        }
      });

    fileCmd
      .command('search <query>')
      .description('Search codebase')
      .option('-p, --pattern <pattern>', 'File pattern filter')
      .action(async (query: string, options: { pattern?: string }) => {
        try {
          const fileOps = new FileOperations();
          const results = await fileOps.searchCodebase(query, options.pattern);
          console.log(JSON.stringify(results, null, 2));
        } catch (error) {
          console.error('Search failed:', error);
          process.exit(1);
        }
      });
  }
}