import * as vscode from 'vscode';
import * as path from 'path';

export class GlassBoxProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'sentient.glassBox';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionContext.extensionUri,
        vscode.Uri.file(path.join(this._extensionContext.extensionPath, 'media'))
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'pauseAgent':
            this.handlePauseAgent();
            break;
          case 'resumeAgent':
            this.handleResumeAgent();
            break;
          case 'approveChange':
            this.handleApproveChange(message.changeId);
            break;
          case 'rejectChange':
            this.handleRejectChange(message.changeId);
            break;
          case 'exportLogs':
            this.handleExportLogs();
            break;
        }
      },
      undefined,
      this._extensionContext.subscriptions
    );
  }

  public sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private handlePauseAgent(): void {
    vscode.commands.executeCommand('sentient.pauseAgent');
  }

  private handleResumeAgent(): void {
    vscode.commands.executeCommand('sentient.resumeAgent');
  }

  private handleApproveChange(changeId: string): void {
    // Implementation for approving code changes
    console.log(`Approving change: ${changeId}`);
  }

  private handleRejectChange(changeId: string): void {
    // Implementation for rejecting code changes
    console.log(`Rejecting change: ${changeId}`);
  }

  private handleExportLogs(): void {
    vscode.commands.executeCommand('sentient.exportLogs');
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionContext.extensionUri, 'media', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionContext.extensionUri, 'media', 'main.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Sentient Glass Box</title>
</head>
<body>
    <div id="app">
        <header class="dashboard-header">
            <h2>🔍 Sentient Glass Box</h2>
            <div class="controls">
                <button id="pauseBtn" class="btn btn-warning">⏸️ Pause</button>
                <button id="resumeBtn" class="btn btn-success" disabled>▶️ Resume</button>
                <button id="exportBtn" class="btn btn-secondary">📤 Export</button>
            </div>
        </header>

        <main class="dashboard-main">
            <div class="panel-grid">
                <section class="panel live-actions">
                    <h3>Live Actions</h3>
                    <div id="actionLog" class="action-log">
                        <div class="log-entry">
                            <span class="timestamp">12:34:56</span>
                            <span class="action success">✅ File read: src/main.ts</span>
                        </div>
                        <div class="log-entry">
                            <span class="timestamp">12:35:02</span>
                            <span class="action pending">⏳ Running tests...</span>
                        </div>
                    </div>
                </section>

                <section class="panel plan-progress">
                    <h3>Plan Progress</h3>
                    <div id="planProgress" class="plan-steps">
                        <div class="step completed">
                            <span class="step-status">✅</span>
                            <span class="step-title">1. Analyze requirements</span>
                        </div>
                        <div class="step in-progress">
                            <span class="step-status">⏳</span>
                            <span class="step-title">2. Implement solution</span>
                        </div>
                        <div class="step pending">
                            <span class="step-status">⏸️</span>
                            <span class="step-title">3. Run tests</span>
                        </div>
                    </div>
                </section>

                <section class="panel memory-context">
                    <h3>Memory Context</h3>
                    <div id="memoryContext" class="memory-items">
                        <div class="memory-item">
                            <span class="confidence">95%</span>
                            <span class="description">Similar solution from 2 days ago</span>
                        </div>
                        <div class="memory-item">
                            <span class="confidence">78%</span>
                            <span class="description">Related error pattern</span>
                        </div>
                    </div>
                </section>
            </div>

            <section class="panel code-diff">
                <h3>Code Changes</h3>
                <div id="codeDiff" class="diff-viewer">
                    <div class="diff-controls">
                        <button class="btn btn-success">✅ Approve All</button>
                        <button class="btn btn-danger">❌ Reject All</button>
                    </div>
                    <div class="diff-content">
                        <pre><code>- function calculateTotal() {
+ function calculateTotal(items, tax = 0.08) {
    return items.reduce((sum, item) =>
+     sum + (item.price * (1 + tax)), 0);
-     sum + item.price, 0);
  }</code></pre>
                    </div>
                </div>
            </section>

            <div class="panel-grid bottom">
                <section class="panel performance">
                    <h3>Performance</h3>
                    <div class="metrics">
                        <div class="metric">
                            <span class="label">Response Time</span>
                            <span class="value">150ms</span>
                        </div>
                        <div class="metric">
                            <span class="label">Memory Usage</span>
                            <span class="value">45%</span>
                        </div>
                        <div class="metric">
                            <span class="label">Success Rate</span>
                            <span class="value">94%</span>
                        </div>
                    </div>
                </section>

                <section class="panel error-log">
                    <h3>System Log</h3>
                    <div id="errorLog" class="log-entries">
                        <div class="log-entry info">
                            <span class="timestamp">12:30:15</span>
                            <span class="message">Agent initialized successfully</span>
                        </div>
                        <div class="log-entry warning">
                            <span class="timestamp">12:32:45</span>
                            <span class="message">Memory usage approaching limit</span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}