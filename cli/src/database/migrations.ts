import { DatabaseManager } from './databaseManager';
import { logger } from '../utils/logger';

export interface Migration {
  version: string;
  description: string;
  up: (db: import('better-sqlite3').Database) => void;
  down: (db: import('better-sqlite3').Database) => void;
}

export class MigrationManager {
  private dbManager: DatabaseManager;
  private migrations: Migration[] = [];

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.initializeMigrations();
  }

  private initializeMigrations(): void {
    // Migration 1.0.1 - Add indexes for better performance
    this.migrations.push({
      version: '1.0.1',
      description: 'Add performance indexes',
      up: (db) => {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at);
          CREATE INDEX IF NOT EXISTS idx_memory_links_created_at ON memory_links(created_at);
        `);
      },
      down: (db) => {
        db.exec(`
          DROP INDEX IF EXISTS idx_executions_created_at;
          DROP INDEX IF EXISTS idx_memory_links_created_at;
        `);
      }
    });

    // Migration 1.0.2 - Add user preferences table
    this.migrations.push({
      version: '1.0.2',
      description: 'Add user preferences table',
      up: (db) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preference_key TEXT UNIQUE NOT NULL,
            preference_value TEXT,
            user_id TEXT DEFAULT 'default',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);
        `);
      },
      down: (db) => {
        db.exec('DROP TABLE IF EXISTS user_preferences');
      }
    });

    // Future migrations will be added here
  }

  async runMigrations(): Promise<void> {
    const db = this.dbManager.getDatabase();
    
    // Create migration tracking table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version TEXT PRIMARY KEY,
        description TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const appliedMigrations = db
      .prepare('SELECT version FROM migrations')
      .all()
      .map((row: any) => row.version);

    // Apply pending migrations
    for (const migration of this.migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        try {
          logger.info(`Applying migration ${migration.version}: ${migration.description}`);
          migration.up(db);
          
          // Record migration as applied
          db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)')
            .run(migration.version, migration.description);
            
          logger.info(`Migration ${migration.version} applied successfully`);
        } catch (error) {
          logger.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }

  async rollbackMigration(version: string): Promise<void> {
    const db = this.dbManager.getDatabase();
    const migration = this.migrations.find(m => m.version === version);
    
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    try {
      logger.info(`Rolling back migration ${version}`);
      migration.down(db);
      
      // Remove migration record
      db.prepare('DELETE FROM migrations WHERE version = ?').run(version);
      
      logger.info(`Migration ${version} rolled back successfully`);
    } catch (error) {
      logger.error(`Migration rollback ${version} failed:`, error);
      throw error;
    }
  }

  getAppliedMigrations(): string[] {
    const db = this.dbManager.getDatabase();
    return db
      .prepare('SELECT version FROM migrations ORDER BY applied_at')
      .all()
      .map((row: any) => row.version);
  }
}