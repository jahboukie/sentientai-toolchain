import * as vscode from 'vscode';
import { GlassBoxProvider } from './providers/glassBoxProvider';
import { AgentStatusProvider } from './providers/agentStatusProvider';
import { SentientCommands } from './commands/sentientCommands';
import { ExtensionManager } from './core/extensionManager';

let extensionManager: ExtensionManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Sentient extension is now active');

  try {
    // Initialize extension manager
    extensionManager = new ExtensionManager(context);
    await extensionManager.initialize();

    // Register providers
    const glassBoxProvider = new GlassBoxProvider(context);
    const agentStatusProvider = new AgentStatusProvider();

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'sentient.glassBox',
        glassBoxProvider
      ),
      vscode.window.registerTreeDataProvider(
        'sentient.agentStatus',
        agentStatusProvider
      )
    );

    // Register commands
    const commands = new SentientCommands(extensionManager, glassBoxProvider);
    commands.register(context);

    // Set context for when extension is active
    vscode.commands.executeCommand('setContext', 'sentient.isActive', true);

    console.log('Sentient extension activated successfully');
  } catch (error) {
    console.error('Failed to activate Sentient extension:', error);
    vscode.window.showErrorMessage(`Sentient activation failed: ${error}`);
  }
}

export async function deactivate(): Promise<void> {
  if (extensionManager) {
    await extensionManager.dispose();
  }
  
  vscode.commands.executeCommand('setContext', 'sentient.isActive', false);
  console.log('Sentient extension deactivated');
}