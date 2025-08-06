import * as fs from 'fs-extra';
import * as path from 'path';
import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';

export class ProjectInitializer {
  private readonly sentientDir = '.sentient';
  private readonly configFile = 'config.yaml';

  async initialize(): Promise<void> {
    const projectRoot = process.cwd();
    const sentientPath = path.join(projectRoot, this.sentientDir);

    // Check if already initialized
    if (await fs.pathExists(sentientPath)) {
      throw new Error('Project already initialized with Sentient');
    }

    // Create .sentient directory
    await fs.ensureDir(sentientPath);
    logger.info(`Created ${this.sentientDir} directory`);

    // Initialize database
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    logger.info('Database initialized');

    // Create configuration file
    await this.createConfig(sentientPath);
    logger.info('Configuration created');

    // Create .gitignore entry
    await this.updateGitignore(projectRoot);
    logger.info('Updated .gitignore');
  }

  private async createConfig(sentientPath: string): Promise<void> {
    const config = {
      version: '1.0.0',
      project: {
        name: path.basename(process.cwd()),
        initialized: new Date().toISOString(),
      },
      memory: {
        retention: '6 months',
        maxEntries: 10000,
      },
      security: {
        sandboxed: true,
        allowedCommands: ['read', 'write', 'test', 'search'],
      },
    };

    const configPath = path.join(sentientPath, this.configFile);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  private async updateGitignore(projectRoot: string): Promise<void> {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const sentientIgnore = '\n# Sentient AI Agent Platform\n.sentient/\n';

    try {
      let gitignoreContent = '';
      if (await fs.pathExists(gitignorePath)) {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      }

      if (!gitignoreContent.includes('.sentient/')) {
        await fs.writeFile(gitignorePath, gitignoreContent + sentientIgnore);
      }
    } catch (error) {
      logger.warn('Could not update .gitignore:', error);
    }
  }
}