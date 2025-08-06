import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { ExecutionRecord, MemorySearchResult, MemoryStats } from './types';

export class MemoryManager {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = new DatabaseManager();
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
  }

  async storeExecution(execution: ExecutionRecord): Promise<number> {
    try {
      await this.initialize();
      const db = this.dbManager.getDatabase();

      const stmt = db.prepare(`
        INSERT INTO executions (
          timestamp, prompt, plan, reasoning, actions, code_changes, 
          outcome, success, duration_ms, model_used, tokens_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const timestamp = execution.timestamp || new Date();
      const result = stmt.run(
        timestamp.toISOString(),
        execution.prompt || '',
        execution.plan || null,
        execution.reasoning || null,
        JSON.stringify(execution.actions || []),
        execution.codeChanges || null,
        execution.outcome || null,
        execution.success ? 1 : 0,
        execution.duration || 0,
        execution.modelUsed || null,
        execution.tokensUsed || null
      );

      const executionId = result.lastInsertRowid as number;
      
      // Store memory links for better searchability
      await this.storeMemoryLinks(executionId, execution);
      
      logger.info(`Execution stored with ID: ${executionId}`);
      return executionId;
    } catch (error) {
      logger.error('Failed to store execution', error);
      throw error;
    }
  }

  private async storeMemoryLinks(executionId: number, execution: ExecutionRecord): Promise<void> {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO memory_links (execution_id, context_type, context_path, context_data, relevance_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Extract file paths from actions
    const actions = execution.actions || [];
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        if (action.type === 'file_operation' && action.parameters?.path) {
          stmt.run(
            executionId,
            'file',
            action.parameters.path,
            JSON.stringify({ operation: action.command }),
            1.0
          );
        }
      });
    }

    // Store outcome type
    if (execution.outcome) {
      const contextType = execution.success ? 'solution' : 'error';
      stmt.run(
        executionId,
        contextType,
        execution.prompt.substring(0, 100), // Use first 100 chars of prompt as path
        JSON.stringify({ outcome: execution.outcome }),
        execution.success ? 0.9 : 0.8
      );
    }
  }

  async search(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    try {
      await this.initialize();
      const db = this.dbManager.getDatabase();

      // Use FTS5 for full-text search
      const stmt = db.prepare(`
        SELECT 
          e.id,
          e.timestamp,
          e.prompt,
          e.outcome,
          e.success,
          e.plan,
          e.reasoning,
          rank
        FROM executions_fts 
        JOIN executions e ON executions_fts.rowid = e.id
        WHERE executions_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const rows = stmt.all(query, limit);
      
      return rows.map((row: any) => ({
        executionId: row.id,
        relevanceScore: this.calculateRelevanceScore(row.rank),
        matchedContent: this.extractMatchedContent(row, query),
        contextType: row.success ? 'solution' : 'error',
        timestamp: new Date(row.timestamp),
        summary: this.generateSummary(row),
        prompt: row.prompt,
        outcome: row.outcome,
      }));
    } catch (error) {
      logger.error('Memory search failed', error);
      throw error;
    }
  }

  private calculateRelevanceScore(rank: number): number {
    // Convert FTS5 rank to a 0-1 relevance score
    // FTS5 rank is negative, closer to 0 means more relevant
    return Math.max(0, 1 + rank / 10);
  }

  private extractMatchedContent(row: any, query: string): string {
    // Simple extraction - in a real implementation, this would highlight matches
    const fields = [row.prompt, row.plan, row.reasoning, row.outcome].filter(Boolean);
    for (const field of fields) {
      if (field && field.toLowerCase().includes(query.toLowerCase())) {
        const index = field.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(field.length, index + query.length + 50);
        return field.substring(start, end) + (end < field.length ? '...' : '');
      }
    }
    return row.prompt?.substring(0, 100) || '';
  }

  private generateSummary(row: any): string {
    if (row.success && row.outcome) {
      return `Successful: ${row.outcome.substring(0, 100)}`;
    } else if (!row.success && row.outcome) {
      return `Failed: ${row.outcome.substring(0, 100)}`;
    } else {
      return row.prompt?.substring(0, 100) || 'Execution record';
    }
  }

  async getStats(): Promise<MemoryStats> {
    try {
      await this.initialize();
      const db = this.dbManager.getDatabase();

      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM executions');
      const successStmt = db.prepare('SELECT COUNT(*) as count FROM executions WHERE success = 1');
      const failedStmt = db.prepare('SELECT COUNT(*) as count FROM executions WHERE success = 0');
      const avgDurationStmt = db.prepare('SELECT AVG(duration_ms) as avg FROM executions');
      const dateRangeStmt = db.prepare(`
        SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM executions
      `);

      const totalResult = totalStmt.get() as { count: number } | undefined;
      const successResult = successStmt.get() as { count: number } | undefined;
      const failedResult = failedStmt.get() as { count: number } | undefined;
      const avgResult = avgDurationStmt.get() as { avg: number } | undefined;
      const dateRange = dateRangeStmt.get() as { oldest: string; newest: string } | undefined;

      const totalExecutions = totalResult?.count || 0;
      const successfulExecutions = successResult?.count || 0;
      const failedExecutions = failedResult?.count || 0;
      const averageExecutionTime = avgResult?.avg || 0;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime: Math.round(averageExecutionTime),
        mostRecentExecution: dateRange?.newest ? new Date(dateRange.newest) : undefined,
        oldestExecution: dateRange?.oldest ? new Date(dateRange.oldest) : undefined,
        totalMemoryEntries: totalExecutions, // Same as total executions for now
        memoryHitRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      };
    } catch (error) {
      logger.error('Failed to get memory stats', error);
      throw error;
    }
  }

  async cleanup(retentionDays: number = 180): Promise<void> {
    try {
      await this.initialize();
      const db = this.dbManager.getDatabase();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const stmt = db.prepare('DELETE FROM executions WHERE timestamp < ?');
      const result = stmt.run(cutoffDate.toISOString());

      logger.info(`Cleaned up ${result.changes} old execution records`);
    } catch (error) {
      logger.error('Memory cleanup failed', error);
      throw error;
    }
  }
}