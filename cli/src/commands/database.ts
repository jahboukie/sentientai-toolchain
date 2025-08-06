import { Command } from 'commander';
import { BaseCommand } from './base';
import { DatabaseManager, BackupManager, IntegrityChecker } from '../database';

export class DatabaseCommands extends BaseCommand {
  readonly name = 'database';
  readonly description = 'Database management commands';

  async execute(): Promise<void> {
    // This is handled by individual subcommands
  }

  static register(program: Command): void {
    const dbCmd = program
      .command('database')
      .alias('db')
      .description('Database management operations');

    // Backup commands
    dbCmd
      .command('backup')
      .description('Create database backup')
      .option('-d, --description <description>', 'Backup description')
      .action(async (options: { description?: string }) => {
        try {
          const dbManager = new DatabaseManager();
          const backupManager = new BackupManager(dbManager);
          
          const backupPath = await backupManager.createBackup(options.description);
          console.log(`✅ Database backup created: ${backupPath}`);
        } catch (error) {
          console.error('❌ Backup failed:', error);
          process.exit(1);
        }
      });

    dbCmd
      .command('restore <backup-filename>')
      .description('Restore database from backup')
      .action(async (backupFilename: string) => {
        try {
          const dbManager = new DatabaseManager();
          const backupManager = new BackupManager(dbManager);
          
          await backupManager.restoreBackup(backupFilename);
          console.log(`✅ Database restored from: ${backupFilename}`);
        } catch (error) {
          console.error('❌ Restore failed:', error);
          process.exit(1);
        }
      });

    dbCmd
      .command('list-backups')
      .description('List available backups')
      .action(async () => {
        try {
          const dbManager = new DatabaseManager();
          const backupManager = new BackupManager(dbManager);
          
          const backups = await backupManager.listBackups();
          
          if (backups.length === 0) {
            console.log('No backups found');
            return;
          }
          
          console.log('\n📦 Available Backups:');
          console.log('─'.repeat(80));
          
          for (const backup of backups) {
            const size = (backup.size / 1024 / 1024).toFixed(2);
            console.log(`📁 ${backup.filename}`);
            console.log(`   📅 ${backup.timestamp.toLocaleString()}`);
            console.log(`   📊 ${size} MB`);
            console.log(`   🏷️  Version: ${backup.version}`);
            console.log('');
          }
        } catch (error) {
          console.error('❌ Failed to list backups:', error);
          process.exit(1);
        }
      });

    dbCmd
      .command('cleanup-backups')
      .description('Clean up old backups')
      .option('-d, --days <days>', 'Retention period in days', '30')
      .action(async (options: { days: string }) => {
        try {
          const dbManager = new DatabaseManager();
          const backupManager = new BackupManager(dbManager);
          
          await backupManager.cleanupOldBackups(parseInt(options.days));
          console.log(`✅ Cleaned up backups older than ${options.days} days`);
        } catch (error) {
          console.error('❌ Cleanup failed:', error);
          process.exit(1);
        }
      });

    // Integrity commands
    dbCmd
      .command('check')
      .description('Check database integrity')
      .option('--repair', 'Attempt to repair issues')
      .action(async (options: { repair?: boolean }) => {
        try {
          const dbManager = new DatabaseManager();
          await dbManager.initialize();
          const integrityChecker = new IntegrityChecker(dbManager);
          
          let result;
          if (options.repair) {
            console.log('🔧 Running database repair...');
            result = await integrityChecker.repairDatabase();
          } else {
            console.log('🔍 Checking database integrity...');
            result = await integrityChecker.performFullCheck();
          }
          
          // Display results
          console.log('\n📊 Database Integrity Report:');
          console.log('─'.repeat(50));
          
          if (result.passed) {
            console.log('✅ Status: PASSED');
          } else {
            console.log('❌ Status: FAILED');
          }
          
          console.log(`📋 Tables: ${result.statistics.totalTables}`);
          console.log(`📝 Records: ${result.statistics.totalRecords}`);
          
          if (result.statistics.orphanedRecords > 0) {
            console.log(`🔗 Orphaned: ${result.statistics.orphanedRecords}`);
          }
          
          if (result.statistics.corruptedRecords > 0) {
            console.log(`💥 Corrupted: ${result.statistics.corruptedRecords}`);
          }
          
          if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach(error => console.log(`   • ${error}`));
          }
          
          if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach(warning => console.log(`   • ${warning}`));
          }
          
          if (!result.passed) {
            console.log('\n💡 Tip: Run with --repair to attempt automatic fixes');
            process.exit(1);
          }
          
        } catch (error) {
          console.error('❌ Integrity check failed:', error);
          process.exit(1);
        }
      });

    // Statistics command
    dbCmd
      .command('stats')
      .description('Show database statistics')
      .action(async () => {
        try {
          const dbManager = new DatabaseManager();
          await dbManager.initialize();
          const db = dbManager.getDatabase();
          
          // Get table sizes
          const tables = ['executions', 'memory_links', 'performance_metrics', 'file_changes', 'settings'];
          const stats: any = {};
          
          for (const table of tables) {
            try {
              const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
              stats[table] = count.count;
            } catch (error) {
              stats[table] = 'Error';
            }
          }
          
          // Get database file size
          const dbPath = dbManager.getDatabasePath();
          const fs = require('fs-extra');
          const dbSize = (await fs.stat(dbPath)).size;
          
          console.log('\n📊 Database Statistics:');
          console.log('─'.repeat(40));
          console.log(`📁 Database Size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`📍 Location: ${dbPath}`);
          console.log('');
          console.log('📋 Table Records:');
          
          for (const [table, count] of Object.entries(stats)) {
            console.log(`   ${table.padEnd(20)}: ${count}`);
          }
          
        } catch (error) {
          console.error('❌ Failed to get database stats:', error);
          process.exit(1);
        }
      });
  }
}
