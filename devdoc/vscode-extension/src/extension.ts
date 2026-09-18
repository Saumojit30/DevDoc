import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
    // Command: Open Dev-Doc Copilot panel
    const openCommand = vscode.commands.registerCommand('devDocCopilot.open', () => {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;

        if (currentPanel) {
            currentPanel.reveal(columnToShowIn);
        } else {
            currentPanel = vscode.window.createWebviewPanel(
                'devDocCopilot',
                'Dev-Doc Copilot',
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(context.extensionPath, 'media'))
                    ]
                }
            );

            currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionPath);

            // Handle messages from webview
            currentPanel.webview.onDidReceiveMessage(
                async (message) => {
                    const config = vscode.workspace.getConfiguration('devDocCopilot');
                    const backendUrl = config.get<string>('backendUrl', 'http://localhost:8000');
                    const project = config.get<string>('project', 'vscode-project');

                    switch (message.command) {
                        case 'chat':
                            try {
                                const response = await axios.post(`${backendUrl}/api/chat`, {
                                    project: project,
                                    question: message.text,
                                    onlyContext: false
                                });
                                currentPanel?.webview.postMessage({
                                    command: 'chatResponse',
                                    data: response.data
                                });
                            } catch (error: any) {
                                currentPanel?.webview.postMessage({
                                    command: 'error',
                                    text: error.message || 'Failed to connect to backend'
                                });
                            }
                            break;

                        case 'getGraph':
                            try {
                                const response = await axios.post(`${backendUrl}/api/graph/data`, {
                                    project: project
                                });
                                currentPanel?.webview.postMessage({
                                    command: 'graphData',
                                    data: response.data
                                });
                            } catch (error: any) {
                                currentPanel?.webview.postMessage({
                                    command: 'error',
                                    text: error.message || 'Failed to load graph'
                                });
                            }
                            break;

                        case 'getConfig':
                            currentPanel?.webview.postMessage({
                                command: 'config',
                                backendUrl: backendUrl,
                                project: project
                            });
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

            currentPanel.onDidDispose(
                () => {
                    currentPanel = undefined;
                },
                null,
                context.subscriptions
            );
        }
    });

    // Command: Query about selected text
    const querySelectionCommand = vscode.commands.registerCommand('devDocCopilot.querySelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showInformationMessage('No text selected');
            return;
        }

        // Open the panel if not already open
        await vscode.commands.executeCommand('devDocCopilot.open');

        // Send the query
        setTimeout(() => {
            currentPanel?.webview.postMessage({
                command: 'prefillQuery',
                text: `Explain this: ${selection}`
            });
        }, 500);
    });

    context.subscriptions.push(openCommand, querySelectionCommand);
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'unsafe-inline' ${webview.cspSource} https:; connect-src http://localhost:8000;">
    <title>Dev-Doc Copilot</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            padding: 10px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header h1 {
            font-size: 14px;
            margin: 0;
            font-weight: 600;
        }
        .status {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-left: auto;
        }
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab {
            padding: 8px 16px;
            font-size: 12px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--vscode-foreground);
            border-bottom: 2px solid transparent;
        }
        .tab.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-focusBorder);
        }
        .content {
            flex: 1;
            overflow: hidden;
            display: none;
        }
        .content.active {
            display: flex;
            flex-direction: column;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        .message {
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.5;
        }
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20%;
        }
        .message.assistant {
            background: var(--vscode-editor-inactiveSelectionBackground);
            margin-right: 20%;
        }
        .message .sources {
            margin-top: 8px;
            font-size: 11px;
            opacity: 0.7;
        }
        .input-area {
            padding: 12px 16px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        .input-area input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 13px;
        }
        .input-area button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .input-area button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .input-area button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .graph-view {
            flex: 1;
            padding: 16px;
            overflow: auto;
        }
        .graph-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        .error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            margin: 8px 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 Dev-Doc Copilot</h1>
        <span class="status" id="status">Connecting...</span>
    </div>
    <div class="tabs">
        <button class="tab active" onclick="switchTab('chat')">Chat</button>
        <button class="tab" onclick="switchTab('graph')">Graph</button>
    </div>
    <div id="chat-tab" class="content active">
        <div class="chat-messages" id="chat-messages"></div>
        <div class="input-area">
            <input type="text" id="chat-input" placeholder="Ask about your code and docs..." onkeydown="if(event.key==='Enter')sendMessage()">
            <button id="send-btn" onclick="sendMessage()">Send</button>
        </div>
    </div>
    <div id="graph-tab" class="content">
        <div class="graph-view">
            <div class="graph-info" id="graph-info">Loading graph data...</div>
            <div id="graph-visualization">Graph visualization will appear here</div>
        </div>
    </div>
    <div id="error-container"></div>

    <script>
        const vscode = acquireVsCodeApi();
        let messages = [];
        let currentConfig = {};

        // Request config on load
        vscode.postMessage({ command: 'getConfig' });

        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');

            if (tab === 'graph') {
                loadGraph();
            }
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            addMessage(text, 'user');

            document.getElementById('send-btn').disabled = true;
            vscode.postMessage({ command: 'chat', text: text });
        }

        function addMessage(text, role, sources = []) {
            const container = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = 'message ' + role;
            div.textContent = text;

            if (sources && sources.length > 0) {
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'sources';
                sourcesDiv.textContent = 'Sources: ' + sources.map(s => s.name).join(', ');
                div.appendChild(sourcesDiv);
            }

            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function loadGraph() {
            document.getElementById('graph-info').textContent = 'Loading graph...';
            vscode.postMessage({ command: 'getGraph' });
        }

        function showError(text) {
            const container = document.getElementById('error-container');
            const div = document.createElement('div');
            div.className = 'error';
            div.textContent = 'Error: ' + text;
            container.appendChild(div);
            setTimeout(() => div.remove(), 5000);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'chatResponse':
                    document.getElementById('send-btn').disabled = false;
                    addMessage(message.data.content, 'assistant', message.data.sources);
                    break;

                case 'graphData':
                    const info = document.getElementById('graph-info');
                    info.textContent = 'Graph: ' + message.data.metrics.num_nodes + ' nodes, ' + message.data.metrics.num_edges + ' edges';
                    const viz = document.getElementById('graph-visualization');
                    viz.innerHTML = '<pre style="font-size:11px;overflow:auto;">' + JSON.stringify(message.data, null, 2) + '</pre>';
                    break;

                case 'config':
                    currentConfig = message;
                    document.getElementById('status').textContent = 'Connected to ' + message.backendUrl;
                    break;

                case 'prefillQuery':
                    document.getElementById('chat-input').value = message.text;
                    break;

                case 'error':
                    document.getElementById('send-btn').disabled = false;
                    showError(message.text);
                    break;
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() {}
