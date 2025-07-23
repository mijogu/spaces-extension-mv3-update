// Service Worker Reliability Test UI Handler
// Handles the test interface functionality

let tester = null;
let isRunning = false;

// Initialize tester
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit to ensure all elements are available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    tester = new ServiceWorkerReliabilityTester();
    await checkServiceWorkerStatus();
    
    // Set up console logging
    const originalLog = console.log;
    const originalError = console.error;
    const consoleOutput = document.getElementById('console-output');
    
    if (consoleOutput) {
        console.log = function(...args) {
            originalLog.apply(console, args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            consoleOutput.textContent += '\n' + new Date().toLocaleTimeString() + ' ' + message;
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            consoleOutput.textContent += '\n' + new Date().toLocaleTimeString() + ' ❌ ' + message;
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
    }
    
    // Set up button event listeners
    setupButtonListeners();
});

// Set up event listeners for test buttons
function setupButtonListeners() {
    const buttons = document.querySelectorAll('.test-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const testType = button.getAttribute('data-test');
            
            if (testType === 'all') {
                await runAllTests();
            } else {
                await runTest(testType);
            }
        });
    });
}

async function checkServiceWorkerStatus() {
    try {
        const response = await tester.sendMessage({ action: 'ping' });
        
        const statusElement = document.getElementById('sw-status');
        const statusText = document.getElementById('sw-status-text');
        const activityElement = document.getElementById('sw-activity');
        const monitoringElement = document.getElementById('sw-monitoring');
        
        // Only update UI if status elements exist (main test interface)
        if (statusElement && statusText && activityElement && monitoringElement) {
            if (response && response.status === 'ready') {
                statusElement.className = 'status-indicator ready';
                statusText.textContent = 'Ready';
                activityElement.textContent = new Date(response.lastActivity).toLocaleString();
                monitoringElement.textContent = response.monitoring ? 'Active' : 'Inactive';
            } else {
                statusElement.className = 'status-indicator error';
                statusText.textContent = 'Error';
                activityElement.textContent = 'Unknown';
                monitoringElement.textContent = 'Unknown';
            }
        }
        // If status elements don't exist, we're in auto-run mode - just log the ping
        else if (response && response.status === 'ready') {
            console.log('🏓 Service worker ping successful - status: ready');
        }
    } catch (error) {
        const statusElement = document.getElementById('sw-status');
        const statusText = document.getElementById('sw-status-text');
        
        if (statusElement && statusText) {
            statusElement.className = 'status-indicator error';
            statusText.textContent = 'Connection Failed';
        } else {
            console.error('❌ Service worker ping failed:', error.message);
        }
    }
}

async function runAllTests() {
    if (isRunning) return;
    
    isRunning = true;
    updateButtonStates();
    clearResults();
    showProgress();
    
    try {
        await tester.runAllTests();
        displayResults();
    } catch (error) {
        console.error('Test suite failed:', error);
    } finally {
        isRunning = false;
        updateButtonStates();
        hideProgress();
        await checkServiceWorkerStatus();
    }
}

async function runTest(testName) {
    if (isRunning) return;
    
    isRunning = true;
    updateButtonStates();
    clearResults();
    
    try {
        const result = await tester.runTest(testName);
        displayResults();
        
        // Update button state
        const button = document.getElementById(testName + '-btn');
        if (button) {
            button.classList.remove('running');
            button.classList.add(result ? 'success' : 'error');
        }
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        isRunning = false;
        updateButtonStates();
        await checkServiceWorkerStatus();
    }
}

function updateButtonStates() {
    const buttons = document.querySelectorAll('.test-button');
    buttons.forEach(button => {
        if (isRunning) {
            button.classList.add('running');
            button.disabled = true;
        } else {
            button.classList.remove('running');
            button.disabled = false;
        }
    });
}

function clearResults() {
    const resultsElement = document.getElementById('test-results');
    if (resultsElement) {
        resultsElement.innerHTML = '';
    }
}

function displayResults() {
    const results = tester.getResults();
    const resultsContainer = document.getElementById('test-results');
    
    if (!resultsContainer) {
        console.warn('Results container not found');
        return;
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: #666; font-style: italic;">No test results available.</p>';
        return;
    }
    
    let html = '';
    let passedCount = 0;
    
    results.forEach(result => {
        if (result.passed) passedCount++;
        
        const resultClass = result.passed ? 'success' : 'error';
        const icon = result.passed ? '✅' : '❌';
        
        html += `
            <div class="result-item ${resultClass}">
                <div class="result-icon">${icon}</div>
                <div class="result-details">
                    <div class="result-test">${result.test}</div>
                    <div class="result-message">${result.details}</div>
                </div>
            </div>
        `;
    });
    
    const successRate = ((passedCount / results.length) * 100).toFixed(1);
    html = `<h3>Test Summary: ${passedCount}/${results.length} passed (${successRate}%)</h3>` + html;
    
    resultsContainer.innerHTML = html;
}

function showProgress() {
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    
    if (progressBar && progressFill) {
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
    }
}

function hideProgress() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.display = 'none';
    }
}

// Update progress bar during long tests
function updateProgress(percent) {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
}

// Auto-refresh status every 30 seconds
setInterval(checkServiceWorkerStatus, 30000); 