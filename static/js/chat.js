// Global variables
let currentConnectionId = null;
let currentSessionId = null;
let isConnected = false;

// DOM Elements
const mcpForm = document.getElementById('mcp-form');
const testConnectionBtn = document.getElementById('test-connection');
const connectButton = document.getElementById('connect-button');
const testResults = document.getElementById('test-results');
const connectionSection = document.getElementById('connection-section');
const chatSection = document.getElementById('chat-section');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');
const statusMessages = document.getElementById('status-messages');

// Utility functions
function showStatus(message, type = 'info', duration = 5000) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    
    statusMessages.appendChild(statusDiv);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.remove();
        }
    }, duration);
}

function showTestResult(testId, status, details = '') {
    const testItem = document.getElementById(testId);
    const statusElement = testItem.querySelector('.test-status');
    const detailsElement = testItem.querySelector('.test-details');
    
    statusElement.className = `test-status ${status}`;
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (details) {
        detailsElement.innerHTML = details;
    }
}

function formatTestDetails(data) {
    if (typeof data === 'object') {
        return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    return data;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(content, type = 'user', toolsUsed = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);
    
    if (toolsUsed && toolsUsed.length > 0) {
        const toolsDiv = document.createElement('div');
        toolsDiv.className = 'message-tools';
        toolsDiv.innerHTML = `<strong>Tools used:</strong> ${toolsUsed.join(', ')}`;
        messageDiv.appendChild(toolsDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function showTyping(show = true) {
    typingIndicator.style.display = show ? 'block' : 'none';
    if (show) {
        scrollToBottom();
    }
}

function setLoading(element, loading = true) {
    if (loading) {
        element.disabled = true;
        element.textContent = element.textContent.replace('...', '') + '...';
    } else {
        element.disabled = false;
        element.textContent = element.textContent.replace('...', '');
    }
}

// Event Listeners
testConnectionBtn.addEventListener('click', async () => {
    const serverUrl = document.getElementById('server-url').value;
    const headersText = document.getElementById('auth-headers').value;
    
    if (!serverUrl) {
        showStatus('Please enter a server URL', 'error');
        return;
    }
    
    let headers = {};
    if (headersText.trim()) {
        try {
            headers = JSON.parse(headersText);
        } catch (e) {
            showStatus('Invalid JSON format for headers', 'error');
            return;
        }
    }
    
    setLoading(testConnectionBtn, true);
    testResults.style.display = 'block';
    
    // Reset test results
    showTestResult('test-connectivity', 'testing');
    showTestResult('test-protocol', 'testing');
    showTestResult('test-tools', 'testing');
    
    try {
        const response = await fetch('/api/mcp/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server_url: serverUrl,
                headers: headers
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Test failed');
        }
        
        // Update connectivity test
        if (result.connectivity_test.status === 'success') {
            showTestResult('test-connectivity', 'success', 
                `Response time: ${result.connectivity_test.response_time_ms}ms<br>` +
                `Status code: ${result.connectivity_test.status_code}`
            );
        } else {
            showTestResult('test-connectivity', 'error', 
                formatTestDetails(result.connectivity_test)
            );
        }
        
        // Update protocol test
        if (result.protocol_test.status === 'success') {
            showTestResult('test-protocol', 'success',
                `MCP Version: ${result.protocol_test.mcp_version || 'Unknown'}<br>` +
                `Server: ${result.protocol_test.server_info?.name || 'Unknown'}`
            );
        } else {
            showTestResult('test-protocol', 'error',
                formatTestDetails(result.protocol_test)
            );
        }
        
        // Update tools test
        if (result.tools_discovered && result.tools_discovered.length > 0) {
            const toolsList = result.tools_discovered.map(tool => 
                `• <strong>${tool.name}</strong>: ${tool.description || 'No description'}`
            ).join('<br>');
            showTestResult('test-tools', 'success', 
                `Found ${result.tools_discovered.length} tools:<br>${toolsList}`
            );
        } else {
            showTestResult('test-tools', 'warning', 
                'No tools discovered or tools/list not supported'
            );
        }
        
        // Enable connect button if overall test was successful
        if (result.success) {
            connectButton.disabled = false;
            showStatus('MCP server test completed successfully!', 'success');
        } else {
            connectButton.disabled = true;
            showStatus(`Test failed: ${result.error_details}`, 'error');
        }
        
    } catch (error) {
        console.error('Test error:', error);
        showStatus(`Test failed: ${error.message}`, 'error');
        showTestResult('test-connectivity', 'error', error.message);
        showTestResult('test-protocol', 'error', 'Test interrupted');
        showTestResult('test-tools', 'error', 'Test interrupted');
        connectButton.disabled = true;
    } finally {
        setLoading(testConnectionBtn, false);
    }
});

mcpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serverUrl = document.getElementById('server-url').value;
    const serverLabel = document.getElementById('server-label').value;
    const headersText = document.getElementById('auth-headers').value;
    
    let headers = {};
    if (headersText.trim()) {
        try {
            headers = JSON.parse(headersText);
        } catch (e) {
            showStatus('Invalid JSON format for headers', 'error');
            return;
        }
    }
    
    setLoading(connectButton, true);
    
    try {
        // Step 1: Connect to MCP server
        const connectResponse = await fetch('/api/mcp/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server_url: serverUrl,
                server_label: serverLabel,
                headers: headers
            })
        });
        
        const connectResult = await connectResponse.json();
        
        if (!connectResponse.ok) {
            throw new Error(connectResult.detail || 'Connection failed');
        }
        
        currentConnectionId = connectResult.connection_id;
        showStatus('Connected to MCP server!', 'success');
        
        // Step 2: Create chat session
        const sessionResponse = await fetch('/api/chat/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mcp_connection_id: currentConnectionId
            })
        });
        
        const sessionResult = await sessionResponse.json();
        
        if (!sessionResponse.ok) {
            throw new Error(sessionResult.detail || 'Failed to create chat session');
        }
        
        currentSessionId = sessionResult.session_id;
        isConnected = true;
        
        // Update UI
        document.getElementById('server-info').textContent = `Server: ${serverLabel}`;
        document.getElementById('tools-info').textContent = 
            `Tools: ${connectResult.tools_count || 0} available`;
        
        connectionSection.style.display = 'none';
        chatSection.style.display = 'block';
        
        showStatus('Chat session created! You can now start chatting.', 'success');
        messageInput.focus();
        
    } catch (error) {
        console.error('Connection error:', error);
        showStatus(`Connection failed: ${error.message}`, 'error');
    } finally {
        setLoading(connectButton, false);
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isConnected || !currentSessionId) {
        showStatus('Not connected to chat session', 'error');
        return;
    }
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Clear input and add user message
    messageInput.value = '';
    addMessage(message, 'user');
    
    // Show typing indicator
    showTyping(true);
    
    try {
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                message: message
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Failed to send message');
        }
        
        // Add assistant response
        addMessage(result.response, 'assistant', result.tools_used);
        
    } catch (error) {
        console.error('Chat error:', error);
        showStatus(`Chat error: ${error.message}`, 'error');
        addMessage(`Sorry, there was an error processing your message: ${error.message}`, 'assistant');
    } finally {
        showTyping(false);
    }
});

// Auto-resize textarea and handle enter key
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Enable/disable connect button based on form validity
document.getElementById('server-url').addEventListener('input', updateConnectButton);
document.getElementById('server-label').addEventListener('input', updateConnectButton);

function updateConnectButton() {
    const serverUrl = document.getElementById('server-url').value;
    const serverLabel = document.getElementById('server-label').value;
    
    // Only enable if both fields are filled and test has been run successfully
    if (serverUrl && serverLabel && connectButton.textContent.includes('Connect')) {
        // Keep disabled until successful test
        if (!connectButton.disabled && testResults.style.display === 'block') {
            // Button was enabled by successful test, keep it enabled
        } else {
            connectButton.disabled = true;
        }
    } else {
        connectButton.disabled = true;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateConnectButton();
    
    // Check if we need to show any initial status
    console.log('MCP Chat Interface loaded');
    
    // Add some example URLs as placeholders or hints
    const serverUrlInput = document.getElementById('server-url');
    serverUrlInput.addEventListener('focus', () => {
        if (!serverUrlInput.value) {
            // Could add placeholder examples here
        }
    });
});
