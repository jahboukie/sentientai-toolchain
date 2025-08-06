import { DatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { ExecutionRecord, ActionRecord } from './types';

export interface EnhancedExecutionContext {
  id?: number;
  sessionId: string;
  parentExecutionId?: number;
  timestamp: Date;
  prompt: string;
  plan?: string;
  reasoning?: string;
  actions: DetailedActionRecord[];
  codeChanges?: string;
  outcome?: string;
  success: boolean;
  duration: number;
  modelUsed?: string;
  tokensUsed?: number;
  
  // Enhanced context fields
  environment: {
    workingDirectory: string;
    gitBranch?: string;
    gitCommit?: string;
    nodeVersion: string;
    platform: string;
  };
  
  performance: {
    memoryUsage: number;
    cpuTime: number;
    ioOperations: number;
    networkCalls: number;
  };
  
  metadata: {
    tags: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    complexity: number; // 1-10 scale
    confidence: number; // 0-1 scale
  };
}

export interface DetailedActionRecord extends ActionRecord {
  id?: number;
  executionId?: number;
  sequence: number;
  startTime: Date;
  endTime?: Date;
  retryCount: number;
  errorDetails?: string;
  inputData?: any;
  outputData?: any;
  resourcesUsed: {
    memory: number;
    cpu: number;
    io: number;
  };
  dependencies: string[]; // Other actions this depends on
  sideEffects: string[]; // Files/resources modified
}

export class ExecutionContextManager {
  private dbManager: DatabaseManager;
  private currentSessionId: string;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.currentSessionId = this.generateSessionId();
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
  }

  async storeEnhancedExecution(context: EnhancedExecutionContext): Promise<number> {
    await this.initialize();
    
    try {
      const db = this.dbManager.getDatabase();
      
      // Start transaction for atomic operation
      const transaction = db.transaction(() => {
        // Store main execution record
        const execStmt = db.prepare(`
          INSERT INTO executions (
            timestamp, prompt, plan, reasoning, actions, code_changes, 
            outcome, success, duration_ms, model_used, tokens_used
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const execResult = execStmt.run(
          context.timestamp.toISOString(),
          context.prompt,
          context.plan || null,
          context.reasoning || null,
          JSON.stringify(context.actions),
          context.codeChanges || null,
          context.outcome || null,
          context.success ? 1 : 0,
          context.duration,
          context.modelUsed || null,
          context.tokensUsed || null
        );
        
        const executionId = execResult.lastInsertRowid as number;
        
        // Store enhanced context in performance_metrics table
        const perfStmt = db.prepare(`
          INSERT INTO performance_metrics (
            execution_id, metric_type, metric_value, unit, timestamp
          ) VALUES (?, ?, ?, ?, ?)
        `);
        
        // Store environment metrics
        perfStmt.run(executionId, 'working_directory', context.environment.workingDirectory, 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'git_branch', context.environment.gitBranch || 'unknown', 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'git_commit', context.environment.gitCommit || 'unknown', 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'node_version', context.environment.nodeVersion, 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'platform', context.environment.platform, 'text', context.timestamp.toISOString());
        
        // Store performance metrics
        perfStmt.run(executionId, 'memory_usage', context.performance.memoryUsage.toString(), 'bytes', context.timestamp.toISOString());
        perfStmt.run(executionId, 'cpu_time', context.performance.cpuTime.toString(), 'microseconds', context.timestamp.toISOString());
        perfStmt.run(executionId, 'io_operations', context.performance.ioOperations.toString(), 'count', context.timestamp.toISOString());
        perfStmt.run(executionId, 'network_calls', context.performance.networkCalls.toString(), 'count', context.timestamp.toISOString());
        
        // Store metadata
        perfStmt.run(executionId, 'tags', JSON.stringify(context.metadata.tags), 'json', context.timestamp.toISOString());
        perfStmt.run(executionId, 'priority', context.metadata.priority, 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'category', context.metadata.category, 'text', context.timestamp.toISOString());
        perfStmt.run(executionId, 'complexity', context.metadata.complexity.toString(), 'score', context.timestamp.toISOString());
        perfStmt.run(executionId, 'confidence', context.metadata.confidence.toString(), 'percentage', context.timestamp.toISOString());
        perfStmt.run(executionId, 'session_id', context.sessionId, 'text', context.timestamp.toISOString());
        
        if (context.parentExecutionId) {
          perfStmt.run(executionId, 'parent_execution_id', context.parentExecutionId.toString(), 'id', context.timestamp.toISOString());
        }
        
        // Store detailed action records
        for (const action of context.actions) {
          this.storeDetailedAction(db, executionId, action);
        }
        
        // Store memory links for searchability
        this.storeMemoryLinks(db, executionId, context);
        
        return executionId;
      });
      
      const executionId = transaction();
      logger.info(`Enhanced execution context stored with ID: ${executionId}`);
      return executionId;
      
    } catch (error) {
      logger.error('Failed to store enhanced execution context:', error);
      throw error;
    }
  }

  private storeDetailedAction(db: any, executionId: number, action: DetailedActionRecord): void {
    // Store in memory_links table with enhanced data
    const linkStmt = db.prepare(`
      INSERT INTO memory_links (
        execution_id, context_type, context_path, context_data, relevance_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const actionData = {
      type: action.type,
      command: action.command,
      parameters: action.parameters,
      sequence: action.sequence,
      startTime: action.startTime.toISOString(),
      endTime: action.endTime?.toISOString(),
      duration: action.duration,
      status: action.status,
      retryCount: action.retryCount,
      errorDetails: action.errorDetails,
      resourcesUsed: action.resourcesUsed,
      dependencies: action.dependencies,
      sideEffects: action.sideEffects,
      inputData: action.inputData,
      outputData: action.outputData
    };
    
    linkStmt.run(
      executionId,
      'detailed_action',
      action.command,
      JSON.stringify(actionData),
      this.calculateActionRelevance(action),
      new Date().toISOString()
    );
  }

  private storeMemoryLinks(db: any, executionId: number, context: EnhancedExecutionContext): void {
    const linkStmt = db.prepare(`
      INSERT INTO memory_links (
        execution_id, context_type, context_path, context_data, relevance_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Store file-based links
    for (const action of context.actions) {
      for (const sideEffect of action.sideEffects) {
        linkStmt.run(
          executionId,
          'file_modification',
          sideEffect,
          JSON.stringify({ action: action.command, timestamp: action.startTime }),
          1.0,
          new Date().toISOString()
        );
      }
    }
    
    // Store tag-based links
    for (const tag of context.metadata.tags) {
      linkStmt.run(
        executionId,
        'tag',
        tag,
        JSON.stringify({ category: context.metadata.category, priority: context.metadata.priority }),
        0.8,
        new Date().toISOString()
      );
    }
    
    // Store category link
    linkStmt.run(
      executionId,
      'category',
      context.metadata.category,
      JSON.stringify({ complexity: context.metadata.complexity, confidence: context.metadata.confidence }),
      0.9,
      new Date().toISOString()
    );
  }

  private calculateActionRelevance(action: DetailedActionRecord): number {
    let relevance = 0.5; // Base relevance
    
    // Increase relevance for successful actions
    if (action.status === 'success') relevance += 0.3;
    
    // Increase relevance for actions with side effects
    if (action.sideEffects.length > 0) relevance += 0.2;
    
    // Decrease relevance for failed actions with retries
    if (action.status === 'error' && action.retryCount > 0) relevance -= 0.2;
    
    // Increase relevance for longer-running actions (more significant)
    if (action.duration > 1000) relevance += 0.1;
    
    return Math.max(0, Math.min(1, relevance));
  }

  async getExecutionContext(executionId: number): Promise<EnhancedExecutionContext | null> {
    await this.initialize();
    
    try {
      const db = this.dbManager.getDatabase();
      
      // Get main execution record
      const execution = db.prepare(`
        SELECT * FROM executions WHERE id = ?
      `).get(executionId) as any;
      
      if (!execution) return null;
      
      // Get performance metrics
      const metrics = db.prepare(`
        SELECT metric_type, metric_value FROM performance_metrics 
        WHERE execution_id = ?
      `).all(executionId) as any[];
      
      // Get detailed actions
      const actions = db.prepare(`
        SELECT context_data FROM memory_links 
        WHERE execution_id = ? AND context_type = 'detailed_action'
        ORDER BY created_at
      `).all(executionId) as any[];
      
      // Reconstruct enhanced context
      const metricsMap = new Map(metrics.map(m => [m.metric_type, m.metric_value]));
      
      const enhancedContext: EnhancedExecutionContext = {
        id: execution.id,
        sessionId: metricsMap.get('session_id') || 'unknown',
        parentExecutionId: metricsMap.get('parent_execution_id') ? parseInt(metricsMap.get('parent_execution_id')) : undefined,
        timestamp: new Date(execution.timestamp),
        prompt: execution.prompt,
        plan: execution.plan,
        reasoning: execution.reasoning,
        actions: actions.map(a => JSON.parse(a.context_data)),
        codeChanges: execution.code_changes,
        outcome: execution.outcome,
        success: execution.success === 1,
        duration: execution.duration_ms,
        modelUsed: execution.model_used,
        tokensUsed: execution.tokens_used,
        
        environment: {
          workingDirectory: metricsMap.get('working_directory') || process.cwd(),
          gitBranch: metricsMap.get('git_branch'),
          gitCommit: metricsMap.get('git_commit'),
          nodeVersion: metricsMap.get('node_version') || process.version,
          platform: metricsMap.get('platform') || process.platform
        },
        
        performance: {
          memoryUsage: parseFloat(metricsMap.get('memory_usage') || '0'),
          cpuTime: parseFloat(metricsMap.get('cpu_time') || '0'),
          ioOperations: parseInt(metricsMap.get('io_operations') || '0'),
          networkCalls: parseInt(metricsMap.get('network_calls') || '0')
        },
        
        metadata: {
          tags: JSON.parse(metricsMap.get('tags') || '[]'),
          priority: metricsMap.get('priority') as any || 'medium',
          category: metricsMap.get('category') || 'general',
          complexity: parseInt(metricsMap.get('complexity') || '5'),
          confidence: parseFloat(metricsMap.get('confidence') || '0.5')
        }
      };
      
      return enhancedContext;
      
    } catch (error) {
      logger.error('Failed to get execution context:', error);
      throw error;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  newSession(): string {
    this.currentSessionId = this.generateSessionId();
    return this.currentSessionId;
  }
}
