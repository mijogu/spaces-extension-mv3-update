// Manual Service Worker Test Script
// Run this in the browser console to test the service worker functionality

console.log('=== Manual Service Worker Test ===');

// Test 1: Basic ping test
async function testPing() {
    console.log('Testing ping...');
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
        return true;
    } catch (error) {
        console.error('❌ Ping failed:', error.message);
        return false;
    }
}

// Test 2: Hotkeys test
async function testHotkeys() {
    console.log('Testing hotkeys...');
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
        console.log('✅ Hotkeys successful:', response);
        return true;
    } catch (error) {
        console.error('❌ Hotkeys failed:', error.message);
        return false;
    }
}

// Test 3: Generate popup params test
async function testGeneratePopupParams() {
    console.log('Testing generatePopupParams...');
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
        console.log('✅ GeneratePopupParams successful:', response);
        return true;
    } catch (error) {
        console.error('❌ GeneratePopupParams failed:', error.message);
        return false;
    }
}

// Test 4: Service worker status check
async function checkServiceWorkerStatus() {
    console.log('Checking service worker status...');
    
    // Check if we can access the service worker
    if (typeof chrome.runtime.getBackgroundPage === 'function') {
        console.log('⚠️  getBackgroundPage is available (MV2 mode)');
    } else {
        console.log('✅ getBackgroundPage not available (MV3 mode)');
    }
    
    // Check if we can send messages
    try {
        await testPing();
        console.log('✅ Service worker is responsive');
    } catch (error) {
        console.error('❌ Service worker is not responsive');
    }
}

// Test 5: Extension info
function checkExtensionInfo() {
    console.log('Checking extension info...');
    const manifest = chrome.runtime.getManifest();
    console.log('Manifest version:', manifest.manifest_version);
    console.log('Extension version:', manifest.version);
    console.log('Extension ID:', chrome.runtime.id);
    
    if (manifest.manifest_version === 3) {
        console.log('✅ Running in Manifest V3 mode');
    } else {
        console.log('⚠️  Running in Manifest V2 mode');
    }
}

// Test 6: Storage test
async function testStorage() {
    console.log('Testing storage...');
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
        console.log('✅ Storage test successful:', response);
        return true;
    } catch (error) {
        console.error('❌ Storage test failed:', error.message);
        return false;
    }
}

// Test 7: Tabs API test
async function testTabsAPI() {
    console.log('Testing tabs API...');
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(tabs);
                }
            });
        });
        console.log('✅ Tabs API test successful:', response.length, 'tabs found');
        return true;
    } catch (error) {
        console.error('❌ Tabs API test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting comprehensive service worker test...\n');
    
    checkExtensionInfo();
    console.log('');
    
    await checkServiceWorkerStatus();
    console.log('');
    
    const tests = [
        { name: 'Ping', fn: testPing },
        { name: 'Hotkeys', fn: testHotkeys },
        { name: 'GeneratePopupParams', fn: testGeneratePopupParams },
        { name: 'Storage', fn: testStorage },
        { name: 'Tabs API', fn: testTabsAPI },
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`--- ${test.name} Test ---`);
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
        console.log('');
    }
    
    // Summary
    console.log('=== Test Summary ===');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    });
    
    console.log(`\n${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Service worker is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the service worker implementation.');
    }
}

// Export functions for manual testing
window.serviceWorkerTests = {
    testPing,
    testHotkeys,
    testGeneratePopupParams,
    checkServiceWorkerStatus,
    checkExtensionInfo,
    testStorage,
    testTabsAPI,
    runAllTests
};

console.log('Service worker test functions available as window.serviceWorkerTests');
console.log('Run window.serviceWorkerTests.runAllTests() to execute all tests'); 