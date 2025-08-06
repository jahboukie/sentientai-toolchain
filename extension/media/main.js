// Sentient Glass Box UI JavaScript

(function() {
    const vscode = acquireVsCodeApi();

    // DOM Elements
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const exportBtn = document.getElementById('exportBtn');
    const actionLog = document.getElementById('actionLog');
    const planProgress = document.getElementById('planProgress');
    const memoryContext = document.getElementById('memoryContext');
    const codeDiff = document.getElementById('codeDiff');
    const errorLog = document.getElementById('errorLog');

    // State
    let agentState = 'idle';
    let isConnected = false;

    // Event Listeners
    pauseBtn?.addEventListener('click', handlePause);
    resumeBtn?.addEventListener('click', handleResume);
    exportBtn?.addEventListener('click', handleExport);

    // Message handling from extension
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
        const message = event.data;
        
        switch (message.command) {
            case 'agentStateChanged':
                updateAgentState(message.state);
                break;
            case 'actionUpdate':
                addActionLogEntry(message.data);
                break;
            case 'planUpdate':
                updatePlanProgress(message.data);
                break;
            case 'memoryUpdate':
                updateMemoryContext(message.data);
                break;
            case 'codeChangeUpdate':
                updateCodeDiff(message.data);
                break;
            case 'performanceUpdate':
                updatePerformanceMetrics(message.data);
                break;
            case 'logUpdate':
                addSystemLogEntry(message.data);
                break;
        }
    }

    function handlePause() {
        vscode.postMessage({
            command: 'pauseAgent'
        });
    }

    function handleResume() {
        vscode.postMessage({
            command: 'resumeAgent'
        });
    }

    function handleExport() {
        vscode.postMessage({
            command: 'exportLogs'
        });
    }

    function updateAgentState(state) {
        agentState = state;
        
        const isPaused = state === 'paused';
        const isActive = state === 'active';
        
        if (pauseBtn) {
            pauseBtn.disabled = isPaused || !isActive;
        }
        if (resumeBtn) {
            resumeBtn.disabled = !isPaused;
        }

        // Update UI indicators
        updateStatusIndicators(state);
    }

    function updateStatusIndicators(state) {
        const header = document.querySelector('.dashboard-header h2');
        if (header) {
            let icon = '⚪';
            switch (state) {
                case 'active': icon = '🟢'; break;
                case 'paused': icon = '🟡'; break;
                case 'error': icon = '🔴'; break;
            }
            header.textContent = `${icon} Sentient Glass Box`;
        }
    }

    function addActionLogEntry(data) {
        if (!actionLog) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="timestamp">${formatTime(new Date())}</span>
            <span class="action ${data.status}">${getStatusIcon(data.status)} ${data.message}</span>
        `;

        actionLog.insertBefore(entry, actionLog.firstChild);

        // Limit entries to prevent memory issues
        const entries = actionLog.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            actionLog.removeChild(entries[entries.length - 1]);
        }

        // Auto-scroll to top
        actionLog.scrollTop = 0;
    }

    function updatePlanProgress(data) {
        if (!planProgress || !data.steps) return;

        planProgress.innerHTML = '';
        
        data.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = `step ${step.status}`;
            stepElement.innerHTML = `
                <span class="step-status">${getStepStatusIcon(step.status)}</span>
                <span class="step-title">${index + 1}. ${step.title}</span>
            `;
            planProgress.appendChild(stepElement);
        });
    }

    function updateMemoryContext(data) {
        if (!memoryContext || !data.matches) return;

        memoryContext.innerHTML = '';
        
        data.matches.forEach(match => {
            const item = document.createElement('div');
            item.className = 'memory-item';
            item.innerHTML = `
                <span class="confidence">${Math.round(match.relevanceScore * 100)}%</span>
                <span class="description">${match.summary}</span>
            `;
            memoryContext.appendChild(item);
        });
    }

    function updateCodeDiff(data) {
        if (!codeDiff || !data.changes) return;

        const diffContent = codeDiff.querySelector('.diff-content pre code');
        if (diffContent) {
            // Simple diff rendering - in a real implementation, 
            // this would be more sophisticated
            let diffText = '';
            data.changes.forEach(change => {
                const prefix = change.type === 'addition' ? '+' : 
                              change.type === 'deletion' ? '-' : ' ';
                diffText += `${prefix} ${change.content}\n`;
            });
            diffContent.textContent = diffText;
        }
    }

    function updatePerformanceMetrics(data) {
        const metrics = document.querySelectorAll('.metric');
        
        metrics.forEach(metric => {
            const label = metric.querySelector('.label').textContent;
            const valueEl = metric.querySelector('.value');
            
            switch (label) {
                case 'Response Time':
                    valueEl.textContent = `${data.responseTime || 0}ms`;
                    break;
                case 'Memory Usage':
                    valueEl.textContent = `${data.memoryUsage || 0}%`;
                    break;
                case 'Success Rate':
                    valueEl.textContent = `${data.successRate || 0}%`;
                    break;
            }
        });
    }

    function addSystemLogEntry(data) {
        if (!errorLog) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${data.level}`;
        entry.innerHTML = `
            <span class="timestamp">${formatTime(new Date())}</span>
            <span class="message">${data.message}</span>
        `;

        errorLog.insertBefore(entry, errorLog.firstChild);

        // Limit entries
        const entries = errorLog.querySelectorAll('.log-entry');
        if (entries.length > 30) {
            errorLog.removeChild(entries[entries.length - 1]);
        }
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'success': return '✅';
            case 'pending': return '⏳';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    }

    function getStepStatusIcon(status) {
        switch (status) {
            case 'completed': return '✅';
            case 'in_progress': return '⏳';
            case 'failed': return '❌';
            case 'pending': return '⏸️';
            default: return '•';
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Simulate real-time updates for demo purposes
    function simulateUpdates() {
        // Add a sample action log entry every few seconds
        setInterval(() => {
            if (agentState === 'active') {
                const actions = [
                    { status: 'info', message: 'Analyzing code structure...' },
                    { status: 'success', message: 'File read: src/components/App.tsx' },
                    { status: 'pending', message: 'Running type checking...' },
                    { status: 'success', message: 'Tests passed: 15/15' },
                ];
                
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                addActionLogEntry(randomAction);
            }
        }, 3000);

        // Update performance metrics periodically
        setInterval(() => {
            updatePerformanceMetrics({
                responseTime: Math.floor(Math.random() * 300) + 50,
                memoryUsage: Math.floor(Math.random() * 30) + 40,
                successRate: Math.floor(Math.random() * 10) + 90
            });
        }, 5000);
    }

    // Initialize
    updateAgentState('idle');
    simulateUpdates();

    // Handle approve/reject buttons for code changes
    document.addEventListener('click', (event) => {
        if (event.target.matches('.btn-success') && event.target.textContent.includes('Approve')) {
            vscode.postMessage({
                command: 'approveChange',
                changeId: 'current'
            });
        } else if (event.target.matches('.btn-danger') && event.target.textContent.includes('Reject')) {
            vscode.postMessage({
                command: 'rejectChange',
                changeId: 'current'
            });
        }
    });

})();