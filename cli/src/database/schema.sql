-- Sentient Knowledge Base Schema
-- Version: 1.0.0

-- Main execution log table
CREATE TABLE IF NOT EXISTS executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    prompt TEXT NOT NULL,
    plan TEXT,
    reasoning TEXT,
    actions TEXT, -- JSON array of actions
    code_changes TEXT, -- Git diff format
    outcome TEXT,
    success BOOLEAN DEFAULT 0,
    duration_ms INTEGER,
    model_used TEXT,
    tokens_used INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index for executions
CREATE VIRTUAL TABLE IF NOT EXISTS executions_fts USING fts5(
    prompt, 
    plan, 
    reasoning, 
    actions, 
    outcome,
    content='executions',
    content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS executions_fts_insert AFTER INSERT ON executions
BEGIN
    INSERT INTO executions_fts(rowid, prompt, plan, reasoning, actions, outcome)
    VALUES (NEW.id, NEW.prompt, NEW.plan, NEW.reasoning, NEW.actions, NEW.outcome);
END;

CREATE TRIGGER IF NOT EXISTS executions_fts_delete AFTER DELETE ON executions
BEGIN
    INSERT INTO executions_fts(executions_fts, rowid, prompt, plan, reasoning, actions, outcome)
    VALUES ('delete', OLD.id, OLD.prompt, OLD.plan, OLD.reasoning, OLD.actions, OLD.outcome);
END;

CREATE TRIGGER IF NOT EXISTS executions_fts_update AFTER UPDATE ON executions
BEGIN
    INSERT INTO executions_fts(executions_fts, rowid, prompt, plan, reasoning, actions, outcome)
    VALUES ('delete', OLD.id, OLD.prompt, OLD.plan, OLD.reasoning, OLD.actions, OLD.outcome);
    INSERT INTO executions_fts(rowid, prompt, plan, reasoning, actions, outcome)
    VALUES (NEW.id, NEW.prompt, NEW.plan, NEW.reasoning, NEW.actions, NEW.outcome);
END;

-- Memory context links table
CREATE TABLE IF NOT EXISTS memory_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    context_type TEXT NOT NULL, -- 'file', 'function', 'class', 'test', 'error', 'solution'
    context_path TEXT NOT NULL, -- file path or identifier
    context_data TEXT, -- additional context data as JSON
    relevance_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

-- Performance tracking table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    metric_type TEXT NOT NULL, -- 'response_time', 'memory_usage', 'search_time'
    metric_value REAL NOT NULL,
    unit TEXT NOT NULL, -- 'ms', 'bytes', 'count'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

-- Configuration and settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File change tracking table
CREATE TABLE IF NOT EXISTS file_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    content_before TEXT,
    content_after TEXT,
    diff TEXT, -- unified diff format
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_executions_timestamp ON executions(timestamp);
CREATE INDEX IF NOT EXISTS idx_executions_success ON executions(success);
CREATE INDEX IF NOT EXISTS idx_executions_model ON executions(model_used);
CREATE INDEX IF NOT EXISTS idx_memory_links_execution_id ON memory_links(execution_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_context_type ON memory_links(context_type);
CREATE INDEX IF NOT EXISTS idx_memory_links_relevance ON memory_links(relevance_score);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_id ON performance_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_file_changes_execution_id ON file_changes(execution_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_file_path ON file_changes(file_path);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
('retention_days', '180', 'number', 'Number of days to retain execution history'),
('max_entries', '10000', 'number', 'Maximum number of execution entries to keep'),
('compression_days', '30', 'number', 'Number of days after which to compress historical data'),
('fts_enabled', 'true', 'boolean', 'Enable full-text search functionality'),
('performance_tracking', 'true', 'boolean', 'Enable performance metrics collection'),
('auto_cleanup', 'true', 'boolean', 'Enable automatic cleanup of old entries');