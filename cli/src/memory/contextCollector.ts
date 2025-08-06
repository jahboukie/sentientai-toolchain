import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { EnhancedExecutionContext, DetailedActionRecord } from './executionContextManager';

export class ContextCollector {
  private startTime: number;
  private startMemory: NodeJS.MemoryUsage;
  private ioCounters: { read: number; write: number };

  constructor() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
    this.ioCounters = { read: 0, write: 0 };
  }

  async collectEnvironmentContext(): Promise<EnhancedExecutionContext['environment']> {
    const workingDirectory = process.cwd();
    
    let gitBranch: string | undefined;
    let gitCommit: string | undefined;
    
    try {
      gitBranch = await this.executeCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      gitCommit = await this.executeCommand('git', ['rev-parse', 'HEAD']);
    } catch (error) {
      logger.debug('Git information not available:', error);
    }
    
    return {
      workingDirectory,
      gitBranch: gitBranch?.trim(),
      gitCommit: gitCommit?.trim(),
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`
    };
  }

  collectPerformanceContext(): EnhancedExecutionContext['performance'] {
    const currentMemory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memoryUsage: currentMemory.heapUsed - this.startMemory.heapUsed,
      cpuTime: cpuUsage.user + cpuUsage.system,
      ioOperations: this.ioCounters.read + this.ioCounters.write,
      networkCalls: 0 // Would need to be tracked separately
    };
  }

  createMetadata(
    tags: string[] = [],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: string = 'general',
    complexity: number = 5,
    confidence: number = 0.5
  ): EnhancedExecutionContext['metadata'] {
    return {
      tags,
      priority,
      category,
      complexity: Math.max(1, Math.min(10, complexity)),
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }

  async createEnhancedContext(
    prompt: string,
    options: {
      plan?: string;
      reasoning?: string;
      actions?: DetailedActionRecord[];
      codeChanges?: string;
      outcome?: string;
      success?: boolean;
      modelUsed?: string;
      tokensUsed?: number;
      sessionId?: string;
      parentExecutionId?: number;
      tags?: string[];
      priority?: 'low' | 'medium' | 'high' | 'critical';
      category?: string;
      complexity?: number;
      confidence?: number;
    } = {}
  ): Promise<EnhancedExecutionContext> {
    const environment = await this.collectEnvironmentContext();
    const performance = this.collectPerformanceContext();
    const metadata = this.createMetadata(
      options.tags,
      options.priority,
      options.category,
      options.complexity,
      options.confidence
    );

    return {
      sessionId: options.sessionId || `session_${Date.now()}`,
      parentExecutionId: options.parentExecutionId,
      timestamp: new Date(),
      prompt,
      plan: options.plan,
      reasoning: options.reasoning,
      actions: options.actions || [],
      codeChanges: options.codeChanges,
      outcome: options.outcome,
      success: options.success ?? false,
      duration: Date.now() - this.startTime,
      modelUsed: options.modelUsed,
      tokensUsed: options.tokensUsed,
      environment,
      performance,
      metadata
    };
  }

  createDetailedAction(
    type: string,
    command: string,
    parameters: Record<string, any>,
    sequence: number = 0
  ): DetailedActionRecord {
    const startTime = new Date();
    
    return {
      type,
      command,
      parameters,
      timestamp: startTime,
      duration: 0,
      status: 'pending',
      output: undefined,
      error: undefined,
      sequence,
      startTime,
      retryCount: 0,
      resourcesUsed: {
        memory: 0,
        cpu: 0,
        io: 0
      },
      dependencies: [],
      sideEffects: []
    };
  }

  async executeAndTrackAction(
    action: DetailedActionRecord,
    executor: () => Promise<any>
  ): Promise<DetailedActionRecord> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    action.startTime = new Date(startTime);
    action.status = 'pending';
    
    try {
      const result = await executor();
      
      action.endTime = new Date();
      action.duration = Date.now() - startTime;
      action.status = 'success';
      action.outputData = result;
      
      // Calculate resource usage
      const endMemory = process.memoryUsage();
      action.resourcesUsed = {
        memory: endMemory.heapUsed - startMemory.heapUsed,
        cpu: Date.now() - startTime, // Simplified CPU time
        io: this.ioCounters.read + this.ioCounters.write
      };
      
      logger.debug(`Action ${action.command} completed successfully in ${action.duration}ms`);
      
    } catch (error) {
      action.endTime = new Date();
      action.duration = Date.now() - startTime;
      action.status = 'error';
      action.error = error instanceof Error ? error.message : String(error);
      action.errorDetails = error instanceof Error ? error.stack : undefined;
      
      logger.error(`Action ${action.command} failed:`, error);
    }
    
    return action;
  }

  async trackFileOperation(filePath: string, operation: 'read' | 'write' | 'delete'): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (operation === 'read') {
        this.ioCounters.read += stats.size;
      } else if (operation === 'write') {
        this.ioCounters.write += stats.size;
      }
      
      logger.debug(`File ${operation} tracked: ${filePath} (${stats.size} bytes)`);
    } catch (error) {
      logger.debug(`Could not track file operation for ${filePath}:`, error);
    }
  }

  async detectSideEffects(workingDir: string, beforeSnapshot?: string[]): Promise<string[]> {
    if (!beforeSnapshot) return [];
    
    try {
      const afterSnapshot = await this.getDirectorySnapshot(workingDir);
      const sideEffects: string[] = [];
      
      // Find new or modified files
      for (const file of afterSnapshot) {
        if (!beforeSnapshot.includes(file)) {
          sideEffects.push(file);
        }
      }
      
      return sideEffects;
    } catch (error) {
      logger.debug('Could not detect side effects:', error);
      return [];
    }
  }

  async getDirectorySnapshot(dir: string, maxDepth: number = 3): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (currentDir: string, depth: number) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const relativePath = path.relative(dir, fullPath);
          
          // Skip hidden files and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          
          if (entry.isFile()) {
            files.push(relativePath);
          } else if (entry.isDirectory()) {
            await scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        logger.debug(`Could not scan directory ${currentDir}:`, error);
      }
    };
    
    await scanDirectory(dir, 0);
    return files;
  }

  private async executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  reset(): void {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();
    this.ioCounters = { read: 0, write: 0 };
  }
}
