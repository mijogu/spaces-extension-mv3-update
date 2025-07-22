// Event listeners for popup-test-new-sw.html
// This file contains the event listener setup for the new service worker tests

// Setup event listeners for buttons
function setupEventListeners() {
    // New service worker buttons
    document.getElementById('new-ping-btn')?.addEventListener('click', () => {
        if (window.testNewServiceWorkerPing) window.testNewServiceWorkerPing();
    });
    
    document.getElementById('new-wake-up-btn')?.addEventListener('click', () => {
        if (window.testServiceWorkerWakeUp) window.testServiceWorkerWakeUp();
    });
    
    document.getElementById('new-init-speed-btn')?.addEventListener('click', () => {
        if (window.testInitializationSpeed) window.testInitializationSpeed();
    });
    
    document.getElementById('new-hotkeys-btn')?.addEventListener('click', () => {
        if (window.testHotkeysWithNewSW) window.testHotkeysWithNewSW();
    });
    
    document.getElementById('new-popup-params-btn')?.addEventListener('click', () => {
        if (window.testGeneratePopupParamsWithNewSW) window.testGeneratePopupParamsWithNewSW();
    });
    
    document.getElementById('new-retry-logic-btn')?.addEventListener('click', () => {
        if (window.testRetryLogic) window.testRetryLogic();
    });
    
    document.getElementById('new-lifecycle-btn')?.addEventListener('click', () => {
        if (window.testServiceWorkerLifecycle) window.testServiceWorkerLifecycle();
    });
    
    document.getElementById('new-run-all-btn')?.addEventListener('click', () => {
        if (window.runNewServiceWorkerTests) window.runNewServiceWorkerTests();
    });
    
    // Integration test buttons
    document.getElementById('integration-tests-btn')?.addEventListener('click', async () => {
        if (window.IntegrationTestRunner) {
            const runner = new window.IntegrationTestRunner();
            await runner.runAllTests();
        }
    });
    
    document.getElementById('session-tests-btn')?.addEventListener('click', async () => {
        if (window.IntegrationTestRunner) {
            const runner = new window.IntegrationTestRunner();
            await runner.sessionTests.testSessionCreation();
            await runner.sessionTests.testSessionMatching();
            await runner.sessionTests.testSessionPersistence();
            runner.printResults();
        }
    });
    
    document.getElementById('database-tests-btn')?.addEventListener('click', async () => {
        if (window.IntegrationTestRunner) {
            const runner = new window.IntegrationTestRunner();
            await runner.databaseTests.testDatabaseConnection();
            await runner.databaseTests.testDatabaseErrorHandling();
            runner.printResults();
        }
    });
    
    document.getElementById('tab-tests-btn')?.addEventListener('click', async () => {
        if (window.IntegrationTestRunner) {
            const runner = new window.IntegrationTestRunner();
            await runner.tabTests.testTabEventHandling();
            await runner.tabTests.testTabHistoryTracking();
            runner.printResults();
        }
    });
    
    document.getElementById('lifecycle-tests-btn')?.addEventListener('click', async () => {
        if (window.IntegrationTestRunner) {
            const runner = new window.IntegrationTestRunner();
            await runner.lifecycleTests.testLazyInitialization();
            await runner.lifecycleTests.testMessageHandling();
            await runner.lifecycleTests.testErrorRecovery();
            runner.printResults();
        }
    });
    
    // Storage button
    document.getElementById('storage-btn')?.addEventListener('click', () => {
        if (window.testStorage) window.testStorage();
    });
}

// Setup event listeners on page load
window.addEventListener('load', () => {
    setupEventListeners();
}); 