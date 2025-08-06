import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

export class ExtensionManager {
  private cliProcess: ChildProcess | null = null;
  private isInitialized = false;

  constructor(private context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if current workspace has Sentient initialized
      await this.detectSentientProject();
      
      // Initialize CLI communication
      await this.initializeCLI();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Extension manager initialization failed:', error);
      throw error;
    }
  }

  private async detectSentientProject(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return false;
    }

    const sentientPath = path.join(workspaceFolder.uri.fsPath, '.sentient');
    const exists = fs.existsSync(sentientPath);
    
    if (exists) {
      vscode.commands.executeCommand('setContext', 'sentient.projectInitialized', true);
    }
    
    return exists;
  }

  private async initializeCLI(): Promise<void> {
    // Initialize communication with CLI
    // This would set up WebSocket or other communication channel
    console.log('CLI communication initialized');
  }

  async activateSentient(): Promise<void> {
    const config = vscode.workspace.getConfiguration('sentient');
    const autoActivate = config.get<boolean>('autoActivate', true);
    
    if (autoActivate && !await this.detectSentientProject()) {
      const result = await vscode.window.showQuickPick(
        ['Initialize in current workspace', 'Skip'],
        {
          placeHolder: 'Sentient is not initialized in this workspace'
        }
      );
      
      if (result === 'Initialize in current workspace') {
        await this.initProject();
      }
    }
  }

  async pauseAgent(): Promise<void> {
    // Send pause command to CLI
    await this.executeCLICommand('pause');
  }

  async resumeAgent(): Promise<void> {
    // Send resume command to CLI  
    await this.executeCLICommand('resume');
  }

  async initProject(projectPath?: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const targetPath = projectPath || workspaceFolder?.uri.fsPath;
    
    if (!targetPath) {
      throw new Error('No workspace folder found');
    }

    await this.executeCLICommand('init', [], targetPath);
    await this.detectSentientProject();
  }

  async exportLogs(outputPath: string): Promise<void> {
    // Export logs from CLI
    await this.executeCLICommand('memory', ['export', '--output', outputPath]);
  }

  async getStatus(): Promise<any> {
    // Get status from CLI
    const result = await this.executeCLICommand('status', ['--json']);
    return JSON.parse(result);
  }

  private async executeCLICommand(
    command: string, 
    args: string[] = [],
    cwd?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('sentient', [command, ...args], {
        cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`CLI command failed: ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async dispose(): Promise<void> {
    if (this.cliProcess) {
      this.cliProcess.kill();
      this.cliProcess = null;
    }
  }
}