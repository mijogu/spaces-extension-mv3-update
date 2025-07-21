// Service Worker Test Script for Extension Context
// This file contains all the test functionality for popup-test.html

// Check if we're in extension context
function checkContext() {
    const statusDiv = document.getElementById('status');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        statusDiv.textContent = '✅ Extension Context';
        statusDiv.className = 'status extension';
        return true;
    } else {
        statusDiv.textContent = '❌ Web Page Context';
        statusDiv.className = 'status webpage';
        return false;
    }
}

// Test functions
function addResult(containerId, message, type = 'info') {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = `result ${type}`;
    div.innerHTML = message;
    container.appendChild(div);
}

function clearResults(containerId) {
    document.getElementById(containerId).innerHTML = '';
}

async function testPing() {
    clearResults('connection-results');
    addResult('connection-results', 'Testing ping...', 'info');
    
    if (!checkContext()) {
        addResult('connection-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'ping' }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        addResult('connection-results', `✅ Ping successful: ${JSON.stringify(response)}`, 'success');
        return true;
    } catch (error) {
        addResult('connection-results', `❌ Ping failed: ${error.message}`, 'error');
        return false;
    }
}

async function testConnection() {
    clearResults('connection-results');
    addResult('connection-results', 'Testing service worker connection...', 'info');
    
    if (!checkContext()) {
        addResult('connection-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    // Check if we can access the service worker
    if (typeof chrome.runtime.getBackgroundPage === 'function') {
        addResult('connection-results', '⚠️ getBackgroundPage is available (MV2 mode)', 'info');
    } else {
        addResult('connection-results', '✅ getBackgroundPage not available (MV3 mode)', 'success');
    }
    
    // Test ping
    const pingResult = await testPing();
    if (pingResult) {
        addResult('connection-results', '✅ Service worker is responsive', 'success');
    } else {
        addResult('connection-results', '❌ Service worker is not responsive', 'error');
    }
}

function checkExtensionInfo() {
    clearResults('extension-info');
    
    if (!checkContext()) {
        addResult('extension-info', '❌ Not in extension context - cannot get extension info', 'error');
        return;
    }
    
    try {
        const manifest = chrome.runtime.getManifest();
        addResult('extension-info', `
            <strong>Extension Info:</strong><br>
            Manifest version: ${manifest.manifest_version}<br>
            Extension version: ${manifest.version}<br>
            Extension ID: ${chrome.runtime.id}<br>
            Name: ${manifest.name}
        `, manifest.manifest_version === 3 ? 'success' : 'info');
    } catch (error) {
        addResult('extension-info', `❌ Error getting extension info: ${error.message}`, 'error');
    }
}

async function testHotkeys() {
    clearResults('message-results');
    addResult('message-results', 'Testing hotkeys...', 'info');
    
    if (!checkContext()) {
        addResult('message-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'requestHotkeys' }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        addResult('message-results', `✅ Hotkeys successful: <pre>${JSON.stringify(response, null, 2)}</pre>`, 'success');
        return true;
    } catch (error) {
        addResult('message-results', `❌ Hotkeys failed: ${error.message}`, 'error');
        return false;
    }
}

async function testGeneratePopupParams() {
    clearResults('message-results');
    addResult('message-results', 'Testing generatePopupParams...', 'info');
    
    if (!checkContext()) {
        addResult('message-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'generatePopupParams',
                actionType: 'switch'
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        addResult('message-results', `✅ GeneratePopupParams successful: <pre>${JSON.stringify(response, null, 2)}</pre>`, 'success');
        return true;
    } catch (error) {
        addResult('message-results', `❌ GeneratePopupParams failed: ${error.message}`, 'error');
        return false;
    }
}

async function testStorage() {
    clearResults('message-results');
    addResult('message-results', 'Testing storage...', 'info');
    
    if (!checkContext()) {
        addResult('message-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['spacesVersion'], result => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });
        addResult('message-results', `✅ Storage test successful: <pre>${JSON.stringify(response, null, 2)}</pre>`, 'success');
        return true;
    } catch (error) {
        addResult('message-results', `❌ Storage test failed: ${error.message}`, 'error');
        return false;
    }
}

async function runAllTests() {
    clearResults('all-results');
    addResult('all-results', 'Starting comprehensive service worker test...', 'info');
    
    if (!checkContext()) {
        addResult('all-results', '❌ Not in extension context - cannot run tests', 'error');
        return;
    }
    
    const tests = [
        { name: 'Ping', fn: testPing },
        { name: 'Hotkeys', fn: testHotkeys },
        { name: 'GeneratePopupParams', fn: testGeneratePopupParams },
        { name: 'Storage', fn: testStorage },
    ];
    
    const results = [];
    
    for (const test of tests) {
        addResult('all-results', `--- ${test.name} Test ---`, 'info');
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
    }
    
    // Summary
    addResult('all-results', '<strong>=== Test Summary ===</strong>', 'info');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        addResult('all-results', `${result.passed ? '✅' : '❌'} ${result.name}`, result.passed ? 'success' : 'error');
    });
    
    addResult('all-results', `<br><strong>${passed}/${total} tests passed</strong>`, passed === total ? 'success' : 'error');
    
    if (passed === total) {
        addResult('all-results', '🎉 All tests passed! Service worker is working correctly.', 'success');
    } else {
        addResult('all-results', '⚠️ Some tests failed. Check the service worker implementation.', 'error');
    }
}

// Auto-run context check and extension info on page load
window.addEventListener('load', () => {
    checkContext();
    checkExtensionInfo();
}); 