import * as vscode from 'vscode';

export class AgentStatusProvider implements vscode.TreeDataProvider<AgentStatusItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentStatusItem | undefined | null | void> = new vscode.EventEmitter<AgentStatusItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentStatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private status: AgentStatus = {
    state: 'idle',
    currentTask: null,
    memoryEntries: 0,
    lastActivity: null,
  };

  constructor() {
    // Update status periodically
    setInterval(() => {
      this.updateStatus();
    }, 5000);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentStatusItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AgentStatusItem): Thenable<AgentStatusItem[]> {
    if (!element) {
      return Promise.resolve(this.getRootItems());
    }
    
    return Promise.resolve([]);
  }

  private getRootItems(): AgentStatusItem[] {
    return [
      new AgentStatusItem(
        `Status: ${this.getStatusIcon()} ${this.status.state}`,
        vscode.TreeItemCollapsibleState.None,
        'status'
      ),
      new AgentStatusItem(
        `Task: ${this.status.currentTask || 'None'}`,
        vscode.TreeItemCollapsibleState.None,
        'task'
      ),
      new AgentStatusItem(
        `Memory: ${this.status.memoryEntries} entries`,
        vscode.TreeItemCollapsibleState.None,
        'memory'
      ),
      new AgentStatusItem(
        `Last Activity: ${this.status.lastActivity || 'Never'}`,
        vscode.TreeItemCollapsibleState.None,
        'activity'
      ),
    ];
  }

  private getStatusIcon(): string {
    switch (this.status.state) {
      case 'active': return '🟢';
      case 'paused': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  }

  private async updateStatus(): Promise<void> {
    try {
      // In a real implementation, this would query the CLI for status
      // For now, we'll simulate status updates
      const newStatus = await this.fetchAgentStatus();
      
      if (JSON.stringify(newStatus) !== JSON.stringify(this.status)) {
        this.status = newStatus;
        this.refresh();
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  }

  private async fetchAgentStatus(): Promise<AgentStatus> {
    // Simulate API call to get agent status
    return {
      state: 'idle',
      currentTask: null,
      memoryEntries: Math.floor(Math.random() * 1000),
      lastActivity: new Date().toLocaleTimeString(),
    };
  }

  public updateAgentStatus(newStatus: Partial<AgentStatus>): void {
    this.status = { ...this.status, ...newStatus };
    this.refresh();
  }
}

class AgentStatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: string
  ) {
    super(label, collapsibleState);
    
    this.tooltip = this.label;
    this.contextValue = itemType;
  }
}

interface AgentStatus {
  state: 'idle' | 'active' | 'paused' | 'error';
  currentTask: string | null;
  memoryEntries: number;
  lastActivity: string | null;
}