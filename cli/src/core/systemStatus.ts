import * as fs from 'fs-extra';
import * as path from 'path';
import { DatabaseManager } from '../database/databaseManager';
import { MemoryManager } from '../memory/memoryManager';
import { packageInfo } from '../utils/packageInfo';

export interface SystemStatusInfo {
  project: {
    initialized: boolean;
    path: string;
    name?: string;
  };
  database: {
    connected: boolean;
    path: string;
    size?: number;
  };
  memory: {
    totalEntries: number;
    lastQuery?: string;
  };
  cli: {
    version: string;
  };
  system: {
    uptime: string;
    memory: string;
  };
}

export class SystemStatus {
  private readonly sentientDir = '.sentient';
  private readonly configFile = 'config.yaml';
  private startTime = process.uptime();

  async getStatus(): Promise<SystemStatusInfo> {
    const projectRoot = process.cwd();
    const sentientPath = path.join(projectRoot, this.sentientDir);
    const configPath = path.join(sentientPath, this.configFile);

    // Check project initialization
    const projectInitialized = await fs.pathExists(sentientPath);
    let projectName: string | undefined;

    if (projectInitialized) {
      try {
        const config = await fs.readJSON(configPath);
        projectName = config.project?.name;
      } catch {
        // Config file might not exist or be corrupted
      }
    }

    // Database status
    let dbConnected = false;
    let dbSize: number | undefined;
    const dbPath = path.join(sentientPath, 'knowledge.db');

    if (projectInitialized) {
      try {
        const dbManager = new DatabaseManager();
        await dbManager.initialize();
        dbConnected = true;
        const dbStats = await fs.stat(dbPath);
        dbSize = dbStats.size;
      } catch {
        // Database might not be accessible
      }
    }

    // Memory statistics
    let totalEntries = 0;
    if (dbConnected) {
      try {
        const memory = new MemoryManager();
        const stats = await memory.getStats();
        totalEntries = stats.totalExecutions;
      } catch {
        // Memory manager might not be accessible
      }
    }

    return {
      project: {
        initialized: projectInitialized,
        path: projectRoot,
        name: projectName,
      },
      database: {
        connected: dbConnected,
        path: dbPath,
        size: dbSize,
      },
      memory: {
        totalEntries,
      },
      cli: {
        version: packageInfo.version,
      },
      system: {
        uptime: this.formatUptime(process.uptime()),
        memory: this.formatMemory(process.memoryUsage().rss),
      },
    };
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }

  private formatMemory(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}