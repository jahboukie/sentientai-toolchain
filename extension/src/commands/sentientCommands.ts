import * as vscode from 'vscode';
import { GlassBoxProvider } from '../providers/glassBoxProvider';
import { ExtensionManager } from '../core/extensionManager';

export class SentientCommands {
  constructor(
    private extensionManager: ExtensionManager,
    private glassBoxProvider: GlassBoxProvider
  ) {}

  register(context: vscode.ExtensionContext): void {
    const commands = [
      vscode.commands.registerCommand('sentient.activate', this.activate.bind(this)),
      vscode.commands.registerCommand('sentient.openDashboard', this.openDashboard.bind(this)),
      vscode.commands.registerCommand('sentient.pauseAgent', this.pauseAgent.bind(this)),
      vscode.commands.registerCommand('sentient.resumeAgent', this.resumeAgent.bind(this)),
      vscode.commands.registerCommand('sentient.exportLogs', this.exportLogs.bind(this)),
      vscode.commands.registerCommand('sentient.initProject', this.initProject.bind(this)),
      vscode.commands.registerCommand('sentient.showStatus', this.showStatus.bind(this)),
    ];

    context.subscriptions.push(...commands);
  }

  private async activate(): Promise<void> {
    try {
      await this.extensionManager.activateSentient();
      vscode.window.showInformationMessage('Sentient activated successfully');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to activate Sentient: ${error}`);
    }
  }

  private async openDashboard(): Promise<void> {
    try {
      // Focus on the Glass Box webview
      await vscode.commands.executeCommand('sentient.glassBox.focus');
      vscode.window.showInformationMessage('Glass Box dashboard opened');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open dashboard: ${error}`);
    }
  }

  private async pauseAgent(): Promise<void> {
    try {
      await this.extensionManager.pauseAgent();
      this.glassBoxProvider.sendMessage({
        command: 'agentStateChanged',
        state: 'paused'
      });
      vscode.window.showInformationMessage('Agent paused');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to pause agent: ${error}`);
    }
  }

  private async resumeAgent(): Promise<void> {
    try {
      await this.extensionManager.resumeAgent();
      this.glassBoxProvider.sendMessage({
        command: 'agentStateChanged',
        state: 'active'
      });
      vscode.window.showInformationMessage('Agent resumed');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resume agent: ${error}`);
    }
  }

  private async exportLogs(): Promise<void> {
    try {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('sentient-logs.json'),
        filters: {
          'JSON files': ['json'],
          'All files': ['*']
        }
      });

      if (uri) {
        await this.extensionManager.exportLogs(uri.fsPath);
        vscode.window.showInformationMessage(`Logs exported to ${uri.fsPath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export logs: ${error}`);
    }
  }

  private async initProject(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showWarningMessage('Please open a workspace folder first');
        return;
      }

      await this.extensionManager.initProject(workspaceFolder.uri.fsPath);
      vscode.window.showInformationMessage('Sentient project initialized');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
    }
  }

  private async showStatus(): Promise<void> {
    try {
      const status = await this.extensionManager.getStatus();
      const message = `
Status: ${status.agent.state}
Current Task: ${status.agent.currentTask || 'None'}
Memory Entries: ${status.memory.totalEntries}
CLI Version: ${status.cli.version}
      `.trim();

      vscode.window.showInformationMessage(message, { modal: true });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get status: ${error}`);
    }
  }
}