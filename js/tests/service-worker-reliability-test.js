// Service Worker Reliability Test Suite
// Tests the improved service worker's ability to handle "going dark" scenarios

class ServiceWorkerReliabilityTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.testTimeout = 30000; // 30 seconds per test
    }

    // Test 1: Basic Service Worker Communication
    async testBasicCommunication() {
        console.log('🧪 Test 1: Basic Service Worker Communication');
        
        try {
            const response = await this.sendMessage({ action: 'ping' });
            
            if (response && response.status === 'ready') {
                console.log('✅ Basic communication working');
                console.log('   - Initialized:', response.initialized);
                console.log('   - Monitoring:', response.monitoring);
                console.log('   - Last Activity:', new Date(response.lastActivity).toISOString());
                
                this.recordTestResult('Basic Communication', true, 'Service worker responds to ping');
                return true;
            } else {
                console.log('❌ Basic communication failed');
                this.recordTestResult('Basic Communication', false, 'No valid response from service worker');
                return false;
            }
        } catch (error) {
            console.error('❌ Basic communication error:', error);
            this.recordTestResult('Basic Communication', false, error.message);
            return false;
        }
    }

    // Test 2: Service Worker Initialization
    async testInitialization() {
        console.log('🧪 Test 2: Service Worker Initialization');
        
        try {
            // First ping to trigger initialization
            const response1 = await this.sendMessage({ action: 'ping' });
            
            if (!response1.initialized) {
                console.log('   Service worker not initialized, triggering initialization...');
                
                // Send a request that requires initialization
                const response2 = await this.sendMessage({ action: 'requestHotkeys' });
                
                // Check if initialization worked
                const response3 = await this.sendMessage({ action: 'ping' });
                
                if (response3.initialized) {
                    console.log('✅ Service worker initialized successfully');
                    this.recordTestResult('Initialization', true, 'Service worker initialized on demand');
                    return true;
                } else {
                    console.log('❌ Service worker failed to initialize');
                    this.recordTestResult('Initialization', false, 'Service worker did not initialize');
                    return false;
                }
            } else {
                console.log('✅ Service worker already initialized');
                this.recordTestResult('Initialization', true, 'Service worker already initialized');
                return true;
            }
        } catch (error) {
            console.error('❌ Initialization test error:', error);
            this.recordTestResult('Initialization', false, error.message);
            return false;
        }
    }

    // Test 3: Idle Period Survival
    async testIdleSurvival() {
        console.log('🧪 Test 3: Idle Period Survival');
        
        try {
            // Send initial ping
            const response1 = await this.sendMessage({ action: 'ping' });
            console.log('   Initial ping successful');
            
            // Wait for 3 minutes (simulating idle period)
            console.log('   Waiting 3 minutes to test idle survival...');
            await this.wait(180000); // 3 minutes
            
            // Try to communicate again
            const response2 = await this.sendMessage({ action: 'ping' });
            
            if (response2 && response2.status === 'ready') {
                console.log('✅ Service worker survived idle period');
                console.log('   - Still initialized:', response2.initialized);
                console.log('   - Still monitoring:', response2.monitoring);
                this.recordTestResult('Idle Survival', true, 'Service worker responsive after 3 minutes idle');
                return true;
            } else {
                console.log('❌ Service worker not responsive after idle period');
                this.recordTestResult('Idle Survival', false, 'Service worker went dark during idle');
                return false;
            }
        } catch (error) {
            console.error('❌ Idle survival test error:', error);
            this.recordTestResult('Idle Survival', false, error.message);
            return false;
        }
    }

    // Test 4: Error Recovery
    async testErrorRecovery() {
        console.log('🧪 Test 4: Error Recovery');
        
        try {
            // Send a malformed request to trigger error handling
            const response1 = await this.sendMessage({ 
                action: 'invalidAction',
                malformedData: 'this should cause an error'
            });
            
            if (response1 && response1.error) {
                console.log('✅ Error handling working');
                console.log('   - Error message:', response1.error);
                
                // Check if service worker is still functional
                const response2 = await this.sendMessage({ action: 'ping' });
                
                if (response2 && response2.status === 'ready') {
                    console.log('✅ Service worker recovered from error');
                    this.recordTestResult('Error Recovery', true, 'Service worker recovered from malformed request');
                    return true;
                } else {
                    console.log('❌ Service worker not functional after error');
                    this.recordTestResult('Error Recovery', false, 'Service worker not functional after error');
                    return false;
                }
            } else {
                console.log('❌ Error handling not working as expected');
                this.recordTestResult('Error Recovery', false, 'Error handling not triggered');
                return false;
            }
        } catch (error) {
            console.error('❌ Error recovery test error:', error);
            this.recordTestResult('Error Recovery', false, error.message);
            return false;
        }
    }

    // Test 5: State Persistence
    async testStatePersistence() {
        console.log('🧪 Test 5: State Persistence');
        
        try {
            // Get initial state
            const response1 = await this.sendMessage({ action: 'ping' });
            const initialActivity = response1.lastActivity;
            
            console.log('   Initial activity time:', new Date(initialActivity).toISOString());
            
            // Wait a bit and check if activity is updated
            await this.wait(5000); // 5 seconds
            
            const response2 = await this.sendMessage({ action: 'ping' });
            const updatedActivity = response2.lastActivity;
            
            console.log('   Updated activity time:', new Date(updatedActivity).toISOString());
            
            if (updatedActivity > initialActivity) {
                console.log('✅ Activity tracking working');
                this.recordTestResult('State Persistence', true, 'Activity time updated correctly');
                return true;
            } else {
                console.log('❌ Activity tracking not working');
                this.recordTestResult('State Persistence', false, 'Activity time not updated');
                return false;
            }
        } catch (error) {
            console.error('❌ State persistence test error:', error);
            this.recordTestResult('State Persistence', false, error.message);
            return false;
        }
    }

    // Test 6: Multiple Rapid Requests
    async testMultipleRequests() {
        console.log('🧪 Test 6: Multiple Rapid Requests');
        
        try {
            const promises = [];
            
            // Send 10 rapid requests
            for (let i = 0; i < 10; i++) {
                promises.push(this.sendMessage({ action: 'ping' }));
            }
            
            const responses = await Promise.all(promises);
            
            const successCount = responses.filter(r => r && r.status === 'ready').length;
            
            if (successCount === 10) {
                console.log('✅ All rapid requests successful');
                this.recordTestResult('Multiple Requests', true, `All ${successCount}/10 requests successful`);
                return true;
            } else {
                console.log(`❌ Only ${successCount}/10 rapid requests successful`);
                this.recordTestResult('Multiple Requests', false, `Only ${successCount}/10 requests successful`);
                return false;
            }
        } catch (error) {
            console.error('❌ Multiple requests test error:', error);
            this.recordTestResult('Multiple Requests', false, error.message);
            return false;
        }
    }

    // Test 7: Service Worker Health Monitoring
    async testHealthMonitoring() {
        console.log('🧪 Test 7: Service Worker Health Monitoring');
        
        try {
            const response = await this.sendMessage({ action: 'ping' });
            
            console.log('   Ping response:', response);
            
            if (response && response.monitoring) {
                console.log('✅ Health monitoring active');
                console.log('   - Heartbeat interval: 25s');
                console.log('   - Activity check interval: 30s');
                console.log('   - Max inactive time: 2 minutes');
                this.recordTestResult('Health Monitoring', true, 'Health monitoring system active');
                return true;
            } else {
                console.log('❌ Health monitoring not active');
                console.log('   - Response monitoring property:', response?.monitoring);
                console.log('   - Full response:', response);
                this.recordTestResult('Health Monitoring', false, `Health monitoring system not active (monitoring: ${response?.monitoring})`);
                return false;
            }
        } catch (error) {
            console.error('❌ Health monitoring test error:', error);
            this.recordTestResult('Health Monitoring', false, error.message);
            return false;
        }
    }

    // Test 8: Long-term Stability
    async testLongTermStability() {
        console.log('🧪 Test 8: Long-term Stability (5 minutes)');
        
        try {
            const startTime = Date.now();
            let successCount = 0;
            let totalAttempts = 0;
            
            // Test for 5 minutes with ping every 30 seconds
            while (Date.now() - startTime < 300000) { // 5 minutes
                try {
                    const response = await this.sendMessage({ action: 'ping' });
                    if (response && response.status === 'ready') {
                        successCount++;
                    }
                    totalAttempts++;
                    
                    console.log(`   Ping ${totalAttempts}: ${response && response.status === 'ready' ? '✅' : '❌'}`);
                    
                    // Wait 30 seconds before next ping
                    await this.wait(30000);
                } catch (error) {
                    console.log(`   Ping ${totalAttempts + 1}: ❌ Error`);
                    totalAttempts++;
                }
            }
            
            const successRate = (successCount / totalAttempts) * 100;
            
            if (successRate >= 90) {
                console.log(`✅ Long-term stability good: ${successRate.toFixed(1)}% success rate`);
                this.recordTestResult('Long-term Stability', true, `${successRate.toFixed(1)}% success rate over 5 minutes`);
                return true;
            } else {
                console.log(`❌ Long-term stability poor: ${successRate.toFixed(1)}% success rate`);
                this.recordTestResult('Long-term Stability', false, `${successRate.toFixed(1)}% success rate over 5 minutes`);
                return false;
            }
        } catch (error) {
            console.error('❌ Long-term stability test error:', error);
            this.recordTestResult('Long-term Stability', false, error.message);
            return false;
        }
    }

    // Utility methods
    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    recordTestResult(testName, passed, details) {
        this.testResults.push({
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Service Worker Reliability Test Suite');
        console.log('================================================');
        
        const tests = [
            this.testBasicCommunication.bind(this),
            this.testInitialization.bind(this),
            this.testErrorRecovery.bind(this),
            this.testStatePersistence.bind(this),
            this.testMultipleRequests.bind(this),
            this.testHealthMonitoring.bind(this),
            this.testIdleSurvival.bind(this),
            this.testLongTermStability.bind(this)
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        for (let i = 0; i < tests.length; i++) {
            try {
                const result = await tests[i]();
                if (result) passedTests++;
                
                // Add delay between tests
                if (i < tests.length - 1) {
                    console.log('   Waiting 5 seconds before next test...');
                    await this.wait(5000);
                }
            } catch (error) {
                console.error(`❌ Test ${i + 1} failed with error:`, error);
            }
        }
        
        this.printSummary(passedTests, totalTests);
    }

    // Run individual test
    async runTest(testName) {
        console.log(`🧪 Running individual test: ${testName}`);
        
        const testMap = {
            'basic': this.testBasicCommunication.bind(this),
            'init': this.testInitialization.bind(this),
            'idle': this.testIdleSurvival.bind(this),
            'error': this.testErrorRecovery.bind(this),
            'state': this.testStatePersistence.bind(this),
            'multiple': this.testMultipleRequests.bind(this),
            'health': this.testHealthMonitoring.bind(this),
            'stability': this.testLongTermStability.bind(this)
        };
        
        if (testMap[testName]) {
            try {
                const result = await testMap[testName]();
                this.printSummary(result ? 1 : 0, 1);
                return result;
            } catch (error) {
                console.error(`❌ Test failed with error:`, error);
                return false;
            }
        } else {
            console.error(`❌ Unknown test: ${testName}`);
            console.log('Available tests:', Object.keys(testMap).join(', '));
            return false;
        }
    }

    printSummary(passed, total) {
        console.log('\n📊 Test Summary');
        console.log('===============');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${total - passed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.details}`);
        });
        
        if (passed === total) {
            console.log('\n🎉 All tests passed! Service worker reliability looks good.');
        } else {
            console.log('\n⚠️ Some tests failed. Review the results above.');
        }
    }

    // Get test results
    getResults() {
        return this.testResults;
    }
}

// Export for use in other files
window.ServiceWorkerReliabilityTester = ServiceWorkerReliabilityTester;

// Auto-run if this script is loaded directly (CSP compliant version)
if (typeof window !== 'undefined' && window.location.href.includes('service-worker-reliability-test')) {
    const tester = new ServiceWorkerReliabilityTester();
    
    // Add test buttons to the page (CSP compliant - no inline event handlers)
    const testButtons = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>Service Worker Reliability Tests</h2>
            <button id="auto-run-all">Run All Tests</button>
            <button id="auto-run-basic">Basic Communication</button>
            <button id="auto-run-init">Initialization</button>
            <button id="auto-run-error">Error Recovery</button>
            <button id="auto-run-state">State Persistence</button>
            <button id="auto-run-multiple">Multiple Requests</button>
            <button id="auto-run-health">Health Monitoring</button>
            <button id="auto-run-idle">Idle Survival</button>
            <button id="auto-run-stability">Long-term Stability</button>
            <div id="test-results" style="margin-top: 20px;"></div>
        </div>
    `;
    
    document.body.innerHTML = testButtons;
    
    // Add event listeners after DOM is updated
    setTimeout(() => {
        document.getElementById('auto-run-all')?.addEventListener('click', () => tester.runAllTests());
        document.getElementById('auto-run-basic')?.addEventListener('click', () => tester.runTest('basic'));
        document.getElementById('auto-run-init')?.addEventListener('click', () => tester.runTest('init'));
        document.getElementById('auto-run-error')?.addEventListener('click', () => tester.runTest('error'));
        document.getElementById('auto-run-state')?.addEventListener('click', () => tester.runTest('state'));
        document.getElementById('auto-run-multiple')?.addEventListener('click', () => tester.runTest('multiple'));
        document.getElementById('auto-run-health')?.addEventListener('click', () => tester.runTest('health'));
        document.getElementById('auto-run-idle')?.addEventListener('click', () => tester.runTest('idle'));
        document.getElementById('auto-run-stability')?.addEventListener('click', () => tester.runTest('stability'));
    }, 100);
} 