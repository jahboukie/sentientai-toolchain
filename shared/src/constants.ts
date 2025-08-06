// Shared constants between CLI and Extension

export const SENTIENT_CONFIG = {
  DIRECTORY_NAME: '.sentient',
  CONFIG_FILE: 'config.json',
  DATABASE_FILE: 'knowledge.db',
  LOGS_DIRECTORY: 'logs',
} as const;

export const DEFAULT_SETTINGS = {
  RETENTION_DAYS: 180,
  MAX_ENTRIES: 10000,
  COMPRESSION_DAYS: 30,
  AUTO_CLEANUP: true,
  PERFORMANCE_TRACKING: true,
  FTS_ENABLED: true,
} as const;

export const WEBSOCKET_CONFIG = {
  DEFAULT_PORT: 3001,
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

export const PERFORMANCE_TARGETS = {
  CLI_RESPONSE_TIME: 200, // ms
  KNOWLEDGE_BASE_QUERY_TIME: 1000, // ms
  MEMORY_USAGE_LIMIT: 0.8, // 80% of available memory
  SUCCESS_RATE_TARGET: 0.9, // 90% success rate
} as const;

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export const AGENT_STATES = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
} as const;

export const ACTION_TYPES = {
  TOOL_CALL: 'tool_call',
  FILE_OPERATION: 'file_operation',
  GIT_OPERATION: 'git_operation',
  MEMORY_QUERY: 'memory_query',
  TEST_EXECUTION: 'test_execution',
} as const;

export const STEP_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
} as const;

export const MEMORY_CONTEXT_TYPES = {
  SOLUTION: 'solution',
  ERROR: 'error',
  PATTERN: 'pattern',
  DECISION: 'decision',
} as const;

export const FILE_OPERATIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
  COPY: 'copy',
  MOVE: 'move',
} as const;