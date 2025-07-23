// New Service Worker Test Script for Extension Context
// This file tests the new MV3 service worker implementation using the client utility

import { serviceWorkerClient } from '../service-worker-client.js';

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

async function testNewServiceWorkerPing() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing new service worker ping...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const response = await serviceWorkerClient.sendMessage({ action: 'ping' });
        const responseText = response ? JSON.stringify(response) : 'No response';
        addResult('new-sw-results', `✅ New SW ping successful: ${responseText}`, 'success');
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ New SW ping failed: ${error.message}`, 'error');
        return false;
    }
}

async function testServiceWorkerWakeUp() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing service worker wake-up reliability...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        // Test multiple wake-ups to ensure reliability
        const results = [];
        for (let i = 0; i < 3; i++) {
            const startTime = Date.now();
            const response = await serviceWorkerClient.sendMessage({ action: 'ping' });
            const responseTime = Date.now() - startTime;
            
                    results.push({
            attempt: i + 1,
            success: !!response,
            responseTime,
            initialized: response?.initialized ?? response?.status === 'ready'
        });
            
            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        addResult('new-sw-results', `✅ Wake-up test: ${successCount}/3 successful`, 'success');
        addResult('new-sw-results', `📊 Average response time: ${avgResponseTime.toFixed(0)}ms`, 'info');
        
        results.forEach(result => {
            addResult('new-sw-results', 
                `   Attempt ${result.attempt}: ${result.success ? '✅' : '❌'} (${result.responseTime}ms, ready: ${result.initialized})`, 
                result.success ? 'success' : 'error'
            );
        });
        
        return successCount === 3;
    } catch (error) {
        addResult('new-sw-results', `❌ Wake-up test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testInitializationSpeed() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing service worker initialization speed...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        // First ping to trigger initialization
        const startTime = Date.now();
        const response = await serviceWorkerClient.sendMessage({ action: 'ping' });
        const totalTime = Date.now() - startTime;
        
        const isReady = response?.initialized ?? response?.status === 'ready';
        if (isReady) {
            addResult('new-sw-results', `✅ Already ready (${totalTime}ms)`, 'success');
        } else {
            // Second ping to measure initialization time
            const startTime2 = Date.now();
            const response2 = await serviceWorkerClient.sendMessage({ action: 'ping' });
            const initTime = Date.now() - startTime2;
            
            addResult('new-sw-results', `✅ Service worker ready in ${initTime}ms`, 'success');
            addResult('new-sw-results', `📊 Total time: ${totalTime + initTime}ms`, 'info');
        }
        
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ Initialization speed test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testHotkeysWithNewSW() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing hotkeys with new service worker...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const hotkeys = await serviceWorkerClient.getHotkeys();
        addResult('new-sw-results', `✅ Hotkeys retrieved: ${JSON.stringify(hotkeys)}`, 'success');
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ Hotkeys test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testGeneratePopupParamsWithNewSW() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing generate popup params with new service worker...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        const params = await serviceWorkerClient.generatePopupParams('switch');
        addResult('new-sw-results', `✅ Popup params generated: ${params}`, 'success');
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ Popup params test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testRetryLogic() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing retry logic...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        // Test with a message that might fail initially
        const response = await serviceWorkerClient.sendMessage({ 
            action: 'testRetry',
            data: 'test'
        }, 3000);
        addResult('new-sw-results', `✅ Retry logic test completed: ${JSON.stringify(response)}`, 'success');
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ Retry logic test failed: ${error.message}`, 'error');
        return false;
    }
}

async function testServiceWorkerLifecycle() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Testing service worker lifecycle...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot test', 'error');
        return false;
    }
    
    try {
        // Test multiple rapid requests to see if service worker handles them properly
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(serviceWorkerClient.sendMessage({ action: 'ping' }));
        }
        
        const results = await Promise.all(promises);
        addResult('new-sw-results', `✅ Lifecycle test completed - ${results.length} requests handled`, 'success');
        return true;
    } catch (error) {
        addResult('new-sw-results', `❌ Lifecycle test failed: ${error.message}`, 'error');
        return false;
    }
}

async function runNewServiceWorkerTests() {
    clearResults('new-sw-results');
    addResult('new-sw-results', 'Starting new service worker tests...', 'info');
    
    if (!checkContext()) {
        addResult('new-sw-results', '❌ Not in extension context - cannot run tests', 'error');
        return;
    }
    
    const tests = [
        { name: 'Ping Test', fn: testNewServiceWorkerPing },
        { name: 'Wake-Up Test', fn: testServiceWorkerWakeUp },
        { name: 'Initialization Speed Test', fn: testInitializationSpeed },
        { name: 'Hotkeys Test', fn: testHotkeysWithNewSW },
        { name: 'Popup Params Test', fn: testGeneratePopupParamsWithNewSW },
        { name: 'Retry Logic Test', fn: testRetryLogic },
        { name: 'Lifecycle Test', fn: testServiceWorkerLifecycle }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        addResult('new-sw-results', `<br><strong>Running: ${test.name}</strong>`, 'info');
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            addResult('new-sw-results', `❌ ${test.name} threw error: ${error.message}`, 'error');
            failed++;
        }
    }
    
    addResult('new-sw-results', `<br><strong>Test Summary:</strong> ${passed} passed, ${failed} failed`, 
              failed === 0 ? 'success' : 'error');
}

// Auto-run context check on page load
window.addEventListener('load', () => {
    checkContext();
});

// Export functions for use in HTML
window.testNewServiceWorkerPing = testNewServiceWorkerPing;
window.testServiceWorkerWakeUp = testServiceWorkerWakeUp;
window.testInitializationSpeed = testInitializationSpeed;
window.testHotkeysWithNewSW = testHotkeysWithNewSW;
window.testGeneratePopupParamsWithNewSW = testGeneratePopupParamsWithNewSW;
window.testRetryLogic = testRetryLogic;
window.testServiceWorkerLifecycle = testServiceWorkerLifecycle;
window.runNewServiceWorkerTests = runNewServiceWorkerTests; 