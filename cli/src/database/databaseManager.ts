import Database = require('better-sqlite3');
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly schemaPath: string;

  constructor() {
    const projectRoot = process.cwd();
    const sentientDir = path.join(projectRoot, '.sentient');
    this.dbPath = path.join(sentientDir, 'knowledge.db');
    this.schemaPath = path.join(__dirname, 'schema.sql');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Create database connection
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      
      // Create schema
      await this.createSchema();
      
      // Run migrations
      await this.runMigrations();
      
      logger.info(`Database initialized at: ${this.dbPath}`);
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const schema = await fs.readFile(this.schemaPath, 'utf-8');
      this.db.exec(schema);
      
      logger.info('Database schema created successfully');
    } catch (error) {
      logger.error('Schema creation failed:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    // Migration logic will be implemented here
    // For now, just log that migrations are complete
    logger.info('Database migrations completed');
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    this.db.exec('VACUUM');
    logger.info('Database vacuumed');
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await fs.ensureDir(path.dirname(backupPath));
    this.db.backup(backupPath);
    logger.info(`Database backed up to: ${backupPath}`);
  }

  async getStats(): Promise<{
    size: number;
    pageCount: number;
    pageSize: number;
    walSize?: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats = await fs.stat(this.dbPath);
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;

    const result: any = {
      size: stats.size,
      pageCount,
      pageSize,
    };

    // Check for WAL file
    const walPath = `${this.dbPath}-wal`;
    if (await fs.pathExists(walPath)) {
      const walStats = await fs.stat(walPath);
      result.walSize = walStats.size;
    }

    return result;
  }
}