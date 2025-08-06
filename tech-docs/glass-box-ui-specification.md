# Glass Box UI - Developer Dashboard Specification

## 1. Overview
The Glass Box UI is a VS Code webview-based dashboard that provides complete transparency into the Sentient AI agent's operations. It serves as the primary interface for monitoring, controlling, and understanding AI agent behavior.

## 2. Layout & Design

### 2.1 Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Sentient Agent Status | [Pause] [Settings] [Export] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │   Live Actions  │ │ Plan Progress   │ │ Memory Context  │ │
│ │                 │ │                 │ │                 │ │
│ │ [Tool Calls]    │ │ [Step 1] ✓      │ │ [Related Mem.]  │ │
│ │ [File Changes]  │ │ [Step 2] ⏳     │ │ [Confidence]    │ │
│ │ [Git Ops]       │ │ [Step 3] ⏸      │ │ [Source Links]  │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                Code Diff Viewer                         │ │
│ │ [Before] ←→ [After] | [Approve] [Reject] [Comment]      │ │
│ │                                                         │ │
│ │ - function calculateTotal() {                           │ │
│ │ + function calculateTotal(items, tax = 0.08) {          │ │
│ │     return items.reduce((sum, item) =>                  │ │
│ │ +     sum + (item.price * (1 + tax)), 0);              │ │
│ │ -     sum + item.price, 0);                             │ │
│ │   }                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Performance     │ │ Error Log       │ │ LLM Chat        │ │
│ │ Metrics         │ │                 │ │ Interface       │ │
│ │                 │ │ [Warnings]      │ │                 │ │
│ │ Response: 150ms │ │ [Errors]        │ │ [Send Message]  │ │
│ │ Memory: 45%     │ │ [Debug Info]    │ │ [View History]  │ │
│ │ Success: 94%    │ │                 │ │ [Clear Chat]    │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 3. Component Specifications

### 3.1 Header & Controls
**Purpose**: Global controls and status overview
**Features**:
- Agent status indicator (Active/Paused/Error)
- Global pause/resume button
- Settings panel access
- Export session logs
- Connection status to knowledge base

**Implementation**:
```typescript
interface HeaderState {
  agentStatus: 'active' | 'paused' | 'error' | 'idle';
  connectionStatus: 'connected' | 'disconnected' | 'syncing';
  currentTask: string | null;
  uptime: number;
}
```

### 3.2 Live Action Log
**Purpose**: Real-time monitoring of all agent activities
**Features**:
- Chronological list of tool calls and operations
- Color-coded status indicators
- Expandable details for each action
- Search and filter capabilities
- Auto-scroll with pause option

**Data Structure**:
```typescript
interface ActionLogEntry {
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
```

### 3.3 Plan Visualization
**Purpose**: Visual representation of execution plan and progress
**Features**:
- Interactive flowchart of planned steps
- Real-time progress indicators
- Dependency mapping between steps
- Estimated completion times
- Manual step approval controls

**Plan Structure**:
```typescript
interface ExecutionPlan {
  id: string;
  title: string;
  steps: PlanStep[];
  dependencies: StepDependency[];
  estimatedDuration: number;
  currentStep: number;
}

interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  estimatedDuration: number;
  actualDuration?: number;
  requiresApproval: boolean;
}
```

### 3.4 Memory Traceability
**Purpose**: Show how historical context influences current decisions
**Features**:
- Visual links to relevant past executions
- Confidence scores for memory matches
- Source highlighting for knowledge base queries
- Interactive exploration of related memories
- Context similarity visualization

**Memory Context**:
```typescript
interface MemoryContext {
  queryId: string;
  query: string;
  matches: MemoryMatch[];
  totalResults: number;
  searchDuration: number;
}

interface MemoryMatch {
  executionId: string;
  relevanceScore: number;
  matchedContent: string;
  contextType: 'solution' | 'error' | 'pattern' | 'decision';
  timestamp: Date;
  summary: string;
}
```

### 3.5 Code Diff Viewer
**Purpose**: Review and approve code changes before execution
**Features**:
- Side-by-side diff visualization
- Syntax highlighting for multiple languages
- Inline comments and annotations
- Approve/reject controls for individual changes
- Batch approval for multiple files

**Diff Structure**:
```typescript
interface CodeDiff {
  fileId: string;
  filePath: string;
  language: string;
  changes: DiffChange[];
  status: 'pending' | 'approved' | 'rejected';
  comments: DiffComment[];
}

interface DiffChange {
  type: 'addition' | 'deletion' | 'modification';
  lineNumber: number;
  oldContent?: string;
  newContent?: string;
  context: string[];
}
```

### 3.6 Performance Metrics
**Purpose**: Monitor system performance and resource usage
**Features**:
- Real-time performance indicators
- Historical performance trends
- Resource usage monitoring
- Success/failure rate tracking
- Knowledge base utilization stats

**Metrics Structure**:
```typescript
interface PerformanceMetrics {
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
```

## 4. Interactive Features

### 4.1 Execution Control
- **Pause/Resume**: Stop agent execution at any point
- **Step Mode**: Execute plan one step at a time
- **Rollback**: Undo specific actions or entire sequences
- **Emergency Stop**: Immediate halt with cleanup

### 4.2 Approval Workflows
- **Code Change Approval**: Manual review before file modifications
- **Critical Operation Approval**: Confirmation for destructive actions
- **Batch Approval**: Approve multiple related changes together
- **Auto-approval Rules**: Configure automatic approval for trusted operations

### 4.3 Debugging Tools
- **Memory Inspector**: Deep dive into knowledge base queries
- **Execution Replay**: Step through past executions
- **Context Viewer**: Examine full context for any decision
- **Error Analysis**: Detailed error investigation tools

## 5. Real-time Communication

### 5.1 WebSocket Integration
```typescript
interface WebSocketMessage {
  type: 'action_update' | 'plan_progress' | 'memory_query' | 'performance_update';
  payload: any;
  timestamp: Date;
}
```

### 5.2 Event Streaming
- **Action Events**: Real-time tool call updates
- **File System Events**: Live file change monitoring
- **Git Events**: Repository operation notifications
- **Performance Events**: Resource usage alerts

## 6. Customization & Settings

### 6.1 Dashboard Configuration
- **Layout Preferences**: Customizable panel arrangement
- **Theme Support**: Light/dark mode with VS Code integration
- **Notification Settings**: Configure alert levels and types
- **Auto-refresh Intervals**: Adjustable update frequencies

### 6.2 Security & Privacy
- **Data Masking**: Hide sensitive information in logs
- **Access Controls**: Role-based feature restrictions
- **Audit Logging**: Track all user interactions
- **Session Management**: Secure session handling

## 7. Integration Points

### 7.1 VS Code Extension API
- **Webview Communication**: Bidirectional messaging
- **File System Integration**: Direct file access and monitoring
- **Git Integration**: Repository status and operations
- **Terminal Integration**: Command execution and output capture

### 7.2 CLI Integration
- **Command Monitoring**: Track all CLI operations
- **Output Streaming**: Real-time command output
- **Error Handling**: Graceful error recovery and reporting
- **Performance Tracking**: Monitor CLI response times
