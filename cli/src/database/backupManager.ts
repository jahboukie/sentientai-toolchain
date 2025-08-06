import * as fs from 'fs-extra';
import * as path from 'path';
import { DatabaseManager } from './databaseManager';
import { logger } from '../utils/logger';

export interface BackupMetadata {
  filename: string;
  timestamp: Date;
  size: number;
  version: string;
  checksum: string;
}

export class BackupManager {
  private dbManager: DatabaseManager;
  private backupDir: string;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.backupDir = path.join(process.cwd(), '.sentient', 'backups');
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.backupDir);
  }

  async createBackup(description?: string): Promise<string> {
    await this.initialize();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `knowledge-backup-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, backupFilename);
    
    try {
      // Get current database path
      const dbPath = this.dbManager.getDatabasePath();
      
      // Copy database file
      await fs.copy(dbPath, backupPath);
      
      // Create metadata file
      const metadata: BackupMetadata = {
        filename: backupFilename,
        timestamp: new Date(),
        size: (await fs.stat(backupPath)).size,
        version: await this.getDatabaseVersion(),
        checksum: await this.calculateChecksum(backupPath)
      };
      
      const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
      await fs.writeJson(metadataPath, {
        ...metadata,
        description: description || 'Manual backup'
      }, { spaces: 2 });
      
      logger.info(`Database backup created: ${backupFilename}`);
      return backupPath;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupFilename: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupFilename);
    const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
    
    if (!await fs.pathExists(backupPath)) {
      throw new Error(`Backup file not found: ${backupFilename}`);
    }
    
    try {
      // Verify backup integrity
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        const currentChecksum = await this.calculateChecksum(backupPath);
        
        if (metadata.checksum !== currentChecksum) {
          throw new Error('Backup file integrity check failed');
        }
      }
      
      // Close current database connection
      await this.dbManager.close();
      
      // Create backup of current database before restore
      const currentDbPath = this.dbManager.getDatabasePath();
      if (await fs.pathExists(currentDbPath)) {
        const preRestoreBackup = `pre-restore-${Date.now()}.db`;
        await fs.copy(currentDbPath, path.join(this.backupDir, preRestoreBackup));
        logger.info(`Current database backed up as: ${preRestoreBackup}`);
      }
      
      // Restore backup
      await fs.copy(backupPath, currentDbPath);
      
      // Reinitialize database connection
      await this.dbManager.initialize();
      
      logger.info(`Database restored from backup: ${backupFilename}`);
    } catch (error) {
      logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    await this.initialize();
    
    const backups: BackupMetadata[] = [];
    const files = await fs.readdir(this.backupDir);
    
    for (const file of files) {
      if (file.endsWith('.db')) {
        const metadataFile = `${file}.meta.json`;
        const metadataPath = path.join(this.backupDir, metadataFile);
        
        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJson(metadataPath);
          backups.push(metadata);
        } else {
          // Create metadata for legacy backups
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            filename: file,
            timestamp: stats.mtime,
            size: stats.size,
            version: 'unknown',
            checksum: await this.calculateChecksum(filePath)
          });
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async deleteBackup(backupFilename: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupFilename);
    const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
    
    try {
      if (await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
      }
      
      if (await fs.pathExists(metadataPath)) {
        await fs.remove(metadataPath);
      }
      
      logger.info(`Backup deleted: ${backupFilename}`);
    } catch (error) {
      logger.error('Backup deletion failed:', error);
      throw error;
    }
  }

  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        await this.deleteBackup(backup.filename);
        logger.info(`Cleaned up old backup: ${backup.filename}`);
      }
    }
  }

  private async getDatabaseVersion(): Promise<string> {
    try {
      const db = this.dbManager.getDatabase();
      const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('version') as { value: string } | undefined;
      return result?.value || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
}
