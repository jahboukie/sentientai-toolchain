export interface ExecutionRecord {
  id?: number;
  timestamp: Date;
  prompt: string;
  plan?: string;
  reasoning?: string;
  actions: ActionRecord[];
  codeChanges?: string;
  outcome?: string;
  success: boolean;
  duration: number;
  modelUsed?: string;
  tokensUsed?: number;
}

export interface ActionRecord {
  type: string;
  command: string;
  parameters: Record<string, any>;
  timestamp: Date;
  duration: number;
  status: 'pending' | 'success' | 'error';
  output?: string;
  error?: string;
}

export interface MemorySearchResult {
  executionId: number;
  relevanceScore: number;
  matchedContent: string;
  contextType: 'solution' | 'error' | 'pattern' | 'decision';
  timestamp: Date;
  summary: string;
  prompt: string;
  outcome?: string;
}

export interface MemoryStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  mostRecentExecution?: Date;
  oldestExecution?: Date;
  totalMemoryEntries: number;
  memoryHitRate: number;
}