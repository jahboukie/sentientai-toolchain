// Shared types between CLI and Extension

export interface AgentStatus {
  state: 'idle' | 'active' | 'paused' | 'error';
  currentTask: string | null;
  memoryEntries: number;
  lastActivity: string | null;
  uptime: number;
  version: string;
}

export interface SystemInfo {
  agent: AgentStatus;
  memory: {
    totalEntries: number;
    lastQuery?: string;
    hitRate: number;
  };
  cli: {
    version: string;
    installed: boolean;
  };
  project: {
    initialized: boolean;
    path: string;
    name?: string;
  };
}

export interface ActionLogEntry {
  id: string;
  timestamp: Date;
  type: 'tool_call' | 'file_operation' | 'git_operation' | 'memory_query';
  command: string;
  parameters: Record<string, any>;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  duration: number;
  output?: string;
  error?: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  estimatedDuration: number;
  actualDuration?: number;
  requiresApproval: boolean;
  dependencies: string[];
}

export interface ExecutionPlan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  currentStep: number;
  estimatedDuration: number;
  actualDuration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

export interface MemoryMatch {
  executionId: string;
  relevanceScore: number;
  matchedContent: string;
  contextType: 'solution' | 'error' | 'pattern' | 'decision';
  timestamp: Date;
  summary: string;
}

export interface MemoryContext {
  queryId: string;
  query: string;
  matches: MemoryMatch[];
  totalResults: number;
  searchDuration: number;
}

export interface CodeChange {
  id: string;
  filePath: string;
  operation: 'create' | 'update' | 'delete';
  contentBefore?: string;
  contentAfter?: string;
  diff: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
}

export interface PerformanceMetrics {
  responseTime: {
    current: number;
    average: number;
    p95: number;
  };
  memoryUsage: {
    current: number;
    peak: number;
    limit: number;
  };
  successRate: {
    current: number;
    last24h: number;
    allTime: number;
  };
  knowledgeBaseStats: {
    totalEntries: number;
    queriesPerHour: number;
    hitRate: number;
  };
}

export interface WebSocketMessage {
  type: 'action_update' | 'plan_progress' | 'memory_query' | 'performance_update' | 'code_change' | 'system_log';
  payload: any;
  timestamp: Date;
}