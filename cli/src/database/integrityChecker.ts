import { DatabaseManager } from './databaseManager';
import { logger } from '../utils/logger';

export interface IntegrityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalTables: number;
    totalRecords: number;
    orphanedRecords: number;
    corruptedRecords: number;
  };
}

export class IntegrityChecker {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  async performFullCheck(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      passed: true,
      errors: [],
      warnings: [],
      statistics: {
        totalTables: 0,
        totalRecords: 0,
        orphanedRecords: 0,
        corruptedRecords: 0
      }
    };

    try {
      const db = this.dbManager.getDatabase();

      // Check database integrity using SQLite's built-in PRAGMA
      await this.checkSQLiteIntegrity(db, result);
      
      // Check schema consistency
      await this.checkSchemaConsistency(db, result);
      
      // Check foreign key constraints
      await this.checkForeignKeyConstraints(db, result);
      
      // Check data consistency
      await this.checkDataConsistency(db, result);
      
      // Check FTS5 index integrity
      await this.checkFTSIntegrity(db, result);
      
      // Calculate statistics
      await this.calculateStatistics(db, result);
      
      result.passed = result.errors.length === 0;
      
      if (result.passed) {
        logger.info('Database integrity check passed');
      } else {
        logger.warn(`Database integrity check failed with ${result.errors.length} errors`);
      }
      
    } catch (error) {
      result.passed = false;
      result.errors.push(`Integrity check failed: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('Database integrity check error:', error);
    }

    return result;
  }

  private async checkSQLiteIntegrity(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      const integrityResult = db.prepare('PRAGMA integrity_check').get();
      
      if (integrityResult.integrity_check !== 'ok') {
        result.errors.push(`SQLite integrity check failed: ${integrityResult.integrity_check}`);
      }
    } catch (error) {
      result.errors.push(`SQLite integrity check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkSchemaConsistency(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check if all required tables exist
      const requiredTables = [
        'executions', 'executions_fts', 'memory_links', 
        'performance_metrics', 'file_changes', 'settings'
      ];
      
      const existingTables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((row: any) => row.name);
      
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          result.errors.push(`Required table missing: ${table}`);
        }
      }
      
      result.statistics.totalTables = existingTables.length;
      
    } catch (error) {
      result.errors.push(`Schema consistency check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkForeignKeyConstraints(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      // Enable foreign key checking temporarily
      db.exec('PRAGMA foreign_keys = ON');
      
      const violations = db.prepare('PRAGMA foreign_key_check').all();
      
      if (violations.length > 0) {
        for (const violation of violations) {
          result.errors.push(
            `Foreign key violation in table ${violation.table}: ${violation.fkid}`
          );
        }
      }
      
    } catch (error) {
      result.warnings.push(`Foreign key check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkDataConsistency(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check for orphaned memory_links
      const orphanedLinks = db
        .prepare(`
          SELECT COUNT(*) as count 
          FROM memory_links ml 
          LEFT JOIN executions e ON ml.execution_id = e.id 
          WHERE e.id IS NULL
        `)
        .get();
      
      if (orphanedLinks.count > 0) {
        result.warnings.push(`Found ${orphanedLinks.count} orphaned memory links`);
        result.statistics.orphanedRecords += orphanedLinks.count;
      }
      
      // Check for orphaned performance_metrics
      const orphanedMetrics = db
        .prepare(`
          SELECT COUNT(*) as count 
          FROM performance_metrics pm 
          LEFT JOIN executions e ON pm.execution_id = e.id 
          WHERE e.id IS NULL
        `)
        .get();
      
      if (orphanedMetrics.count > 0) {
        result.warnings.push(`Found ${orphanedMetrics.count} orphaned performance metrics`);
        result.statistics.orphanedRecords += orphanedMetrics.count;
      }
      
      // Check for orphaned file_changes
      const orphanedChanges = db
        .prepare(`
          SELECT COUNT(*) as count 
          FROM file_changes fc 
          LEFT JOIN executions e ON fc.execution_id = e.id 
          WHERE e.id IS NULL
        `)
        .get();
      
      if (orphanedChanges.count > 0) {
        result.warnings.push(`Found ${orphanedChanges.count} orphaned file changes`);
        result.statistics.orphanedRecords += orphanedChanges.count;
      }
      
      // Check for invalid JSON in actions column
      const invalidActions = db
        .prepare(`
          SELECT id FROM executions 
          WHERE actions IS NOT NULL 
          AND json_valid(actions) = 0
        `)
        .all();
      
      if (invalidActions.length > 0) {
        result.errors.push(`Found ${invalidActions.length} records with invalid JSON in actions`);
        result.statistics.corruptedRecords += invalidActions.length;
      }
      
    } catch (error) {
      result.warnings.push(`Data consistency check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkFTSIntegrity(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      // Check FTS5 index integrity
      const ftsCheck = db.prepare('INSERT INTO executions_fts(executions_fts) VALUES("integrity-check")').run();
      
      // Verify FTS5 can perform searches
      const testSearch = db
        .prepare('SELECT COUNT(*) as count FROM executions_fts WHERE executions_fts MATCH ?')
        .get('test');
      
      if (testSearch.count < 0) {
        result.warnings.push('FTS5 search functionality may be impaired');
      }
      
    } catch (error) {
      result.warnings.push(`FTS5 integrity check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async calculateStatistics(db: any, result: IntegrityCheckResult): Promise<void> {
    try {
      // Count total records across main tables
      const tables = ['executions', 'memory_links', 'performance_metrics', 'file_changes'];
      let totalRecords = 0;
      
      for (const table of tables) {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          totalRecords += count.count;
        } catch (error) {
          result.warnings.push(`Could not count records in table ${table}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      result.statistics.totalRecords = totalRecords;
      
    } catch (error) {
      result.warnings.push(`Statistics calculation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async repairDatabase(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      passed: true,
      errors: [],
      warnings: [],
      statistics: {
        totalTables: 0,
        totalRecords: 0,
        orphanedRecords: 0,
        corruptedRecords: 0
      }
    };

    try {
      const db = this.dbManager.getDatabase();
      
      // Clean up orphaned records
      const orphanedLinks = db.prepare(`
        DELETE FROM memory_links 
        WHERE execution_id NOT IN (SELECT id FROM executions)
      `).run();
      
      const orphanedMetrics = db.prepare(`
        DELETE FROM performance_metrics 
        WHERE execution_id NOT IN (SELECT id FROM executions)
      `).run();
      
      const orphanedChanges = db.prepare(`
        DELETE FROM file_changes 
        WHERE execution_id NOT IN (SELECT id FROM executions)
      `).run();
      
      const totalCleaned = orphanedLinks.changes + orphanedMetrics.changes + orphanedChanges.changes;
      
      if (totalCleaned > 0) {
        result.warnings.push(`Cleaned up ${totalCleaned} orphaned records`);
        logger.info(`Database repair: cleaned up ${totalCleaned} orphaned records`);
      }
      
      // Rebuild FTS5 index
      db.prepare('INSERT INTO executions_fts(executions_fts) VALUES("rebuild")').run();
      result.warnings.push('Rebuilt FTS5 search index');
      
      // Vacuum database to reclaim space
      db.exec('VACUUM');
      result.warnings.push('Database vacuumed to reclaim space');
      
      logger.info('Database repair completed successfully');
      
    } catch (error) {
      result.passed = false;
      result.errors.push(`Database repair failed: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('Database repair error:', error);
    }

    return result;
  }
}
