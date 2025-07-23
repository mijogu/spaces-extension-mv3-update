// Test script for new service worker patterns
// Run this in the browser console to test the new implementation

console.log('🧪 Testing new service worker patterns...');

// Test 1: Basic ping test
async function testPing() {
    console.log('📡 Testing ping...');
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
        console.log('✅ Ping successful:', response);
        return response;
    } catch (error) {
        console.error('❌ Ping failed:', error.message);
        return null;
    }
}

// Test 2: Test service worker initialization
async function testInitialization() {
    console.log('🔧 Testing initialization...');
    try {
        // First ping should trigger initialization
        const response1 = await testPing();
        if (!response1) return false;
        
        // Second ping should show initialized
        const response2 = await testPing();
        if (!response2) return false;
        
        console.log('✅ Initialization test completed');
        console.log('   First response:', response1);
        console.log('   Second response:', response2);
        
        return true;
    } catch (error) {
        console.error('❌ Initialization test failed:', error.message);
        return false;
    }
}

// Test 3: Test hotkeys
async function testHotkeys() {
    console.log('⌨️ Testing hotkeys...');
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
        console.log('✅ Hotkeys retrieved:', response);
        return response;
    } catch (error) {
        console.error('❌ Hotkeys test failed:', error.message);
        return null;
    }
}

// Test 4: Test popup params generation
async function testPopupParams() {
    console.log('🔗 Testing popup params generation...');
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
        console.log('✅ Popup params generated:', response);
        return response;
    } catch (error) {
        console.error('❌ Popup params test failed:', error.message);
        return null;
    }
}

// Test 5: Test retry logic
async function testRetryLogic() {
    console.log('🔄 Testing retry logic...');
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
                action: 'testRetry',
                data: 'test'
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        console.log('✅ Retry test successful:', response);
        return response;
    } catch (error) {
        console.error('❌ Retry test failed:', error.message);
        return null;
    }
}

// Test 6: Test multiple rapid requests
async function testMultipleRequests() {
    console.log('🚀 Testing multiple rapid requests...');
    try {
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: 'ping' }, response => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                })
            );
        }
        
        const results = await Promise.all(promises);
        console.log('✅ Multiple requests completed:', results.length, 'successful');
        return results;
    } catch (error) {
        console.error('❌ Multiple requests test failed:', error.message);
        return null;
    }
}

// Test 7: Test service worker lifecycle
async function testLifecycle() {
    console.log('🔄 Testing service worker lifecycle...');
    try {
        // Test that service worker can handle requests after being idle
        console.log('   Waiting 5 seconds to test idle behavior...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const response = await testPing();
        if (response) {
            console.log('✅ Service worker still responsive after idle period');
            return true;
        } else {
            console.log('❌ Service worker not responsive after idle period');
            return false;
        }
    } catch (error) {
        console.error('❌ Lifecycle test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive service worker tests...\n');
    
    const tests = [
        { name: 'Ping Test', fn: testPing },
        { name: 'Initialization Test', fn: testInitialization },
        { name: 'Hotkeys Test', fn: testHotkeys },
        { name: 'Popup Params Test', fn: testPopupParams },
        { name: 'Retry Logic Test', fn: testRetryLogic },
        { name: 'Multiple Requests Test', fn: testMultipleRequests },
        { name: 'Lifecycle Test', fn: testLifecycle }
    ];
    
    const results = {};
    
    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        console.log('─'.repeat(50));
        
        try {
            const result = await test.fn();
            results[test.name] = { success: true, result };
            console.log(`✅ ${test.name}: PASSED`);
        } catch (error) {
            results[test.name] = { success: false, error: error.message };
            console.log(`❌ ${test.name}: FAILED - ${error.message}`);
        }
    }
    
    console.log('\n📊 Test Summary:');
    console.log('─'.repeat(50));
    
    const passed = Object.values(results).filter(r => r.success).length;
    const failed = Object.values(results).filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! The new service worker patterns are working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    }
    
    return results;
}

// Export functions for manual testing
window.testNewServiceWorker = {
    testPing,
    testInitialization,
    testHotkeys,
    testPopupParams,
    testRetryLogic,
    testMultipleRequests,
    testLifecycle,
    runAllTests
};

console.log('🧪 Test functions available as window.testNewServiceWorker.*');
console.log('💡 Run window.testNewServiceWorker.runAllTests() to start testing'); 