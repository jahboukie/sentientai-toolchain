#!/usr/bin/env node

import { Command } from 'commander';
import { InitCommand } from './commands/init';
import { StatusCommand } from './commands/status';
import { FileCommands } from './commands/file';
import { MemoryCommands } from './commands/memory';
import { TestCommand } from './commands/test';
import { DatabaseCommands } from './commands/database';
import { logger } from './utils/logger';
import { packageInfo } from './utils/packageInfo';

const program = new Command();

async function main(): Promise<void> {
  try {
    program
      .name('sentient')
      .description('Sentient AI Agent Platform CLI')
      .version(packageInfo.version);

    // Register commands
    InitCommand.register(program);
    StatusCommand.register(program);
    FileCommands.register(program);
    MemoryCommands.register(program);
    TestCommand.register(program);
    DatabaseCommands.register(program);

    // Parse arguments
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('CLI execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { program };