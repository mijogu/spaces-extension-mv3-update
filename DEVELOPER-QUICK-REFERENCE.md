# Developer Quick Reference - MV3 Extension

## 🚀 Quick Start

### **Running Tests**
```bash
# Open test page in Chrome
chrome-extension://[extension-id]/service-worker-reliability-test.html

# Or load the HTML file directly in the extension directory
```

### **Checking Service Worker Status**
```javascript
// Send ping to check service worker health
chrome.runtime.sendMessage({ action: 'ping' }, response => {
    console.log('Service worker status:', response);
    // Expected response:
    // { status: 'ready', initialized: true, lastActivity: timestamp, monitoring: true }
});
```

## 🔧 Key MV3 Patterns

### **Service Worker Message Handling**
```javascript
// ✅ Correct MV3 pattern
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Update activity on every message
    updateActivity();
    
    // Handle simple messages immediately
    if (request.action === 'ping') {
        sendResponse({ status: 'ready', initialized: isInitialized });
        return false; // Don't keep channel open
    }
    
    // Handle complex messages with initialization
    handleMessageWithInitialization(request, sender, sendResponse);
    return true; // Keep channel open for async response
});
```

### **Lazy Initialization**
```javascript
// ✅ Service worker should initialize only when needed
let isInitialized = false;
let initializationPromise = null;

async function initializeServiceWorker() {
    if (isInitialized) return;
    if (initializationPromise) return initializationPromise;
    
    initializationPromise = (async () => {
        // Heavy initialization here
        await spacesService.initialiseSpaces();
        isInitialized = true;
    })();
    
    return initializationPromise;
}
```

### **CSP Compliant Event Handling**
```html
<!-- ❌ Don't do this (CSP violation) -->
<button onclick="runTest()">Test</button>

<!-- ✅ Do this (CSP compliant) -->
<button id="test-btn" data-test="basic">Test</button>
```

```javascript
// ✅ Add event listeners programmatically
document.getElementById('test-btn')?.addEventListener('click', () => {
    runTest();
});
```

## 🏥 Health Monitoring

### **Monitoring Status**
```javascript
// Check if monitoring is active
const response = await sendMessage({ action: 'ping' });
if (response.monitoring) {
    console.log('✅ Health monitoring active');
} else {
    console.log('❌ Health monitoring not active');
}
```

### **Monitoring Logs**
Look for these console messages:
- `📡 Service worker monitoring started`
- `💓 Service worker heartbeat - last activity: ...`
- `📊 Activity check - service worker status: ...`

### **Manual Monitoring Check**
```javascript
// Force activity update
chrome.runtime.sendMessage({ action: 'ping' }, response => {
    console.log('Current activity:', new Date(response.lastActivity));
    console.log('Monitoring active:', response.monitoring);
});
```

## 🧪 Testing

### **Run Individual Test**
```javascript
const tester = new ServiceWorkerReliabilityTester();
const result = await tester.runTest('basic');
console.log('Test result:', result);
```

### **Run All Tests**
```javascript
const tester = new ServiceWorkerReliabilityTester();
await tester.runAllTests();
const results = tester.getResults();
console.log('All results:', results);
```

### **Test Results Format**
```javascript
{
    test: 'Basic Communication',
    passed: true,
    details: 'Service worker responds to ping',
    timestamp: '2024-01-01T12:00:00.000Z'
}
```

## 🔍 Troubleshooting

### **Service Worker "Going Dark"**
**Symptoms**: Extension unresponsive after a few minutes
**Check**: Look for heartbeat logs in console
**Fix**: Monitoring system should prevent this automatically

### **CSP Violations**
**Symptoms**: Console errors about inline scripts
**Check**: Look for `onclick=""` or `<script>` tags in HTML
**Fix**: Move all JavaScript to external files

### **Test Failures**
**Symptoms**: Reliability tests failing
**Check**: Service worker logs and monitoring status
**Fix**: Ensure service worker is properly initialized

### **Message Sending Failures**
**Symptoms**: "Receiving end does not exist" errors
**Check**: Service worker status with ping
**Fix**: Service worker may have terminated, will restart automatically

## 📊 Performance Monitoring

### **Key Metrics to Watch**
- **Initialization Time**: Should be < 1 second
- **Message Response Time**: Should be < 100ms
- **Heartbeat Frequency**: Every 25 seconds
- **Activity Check Frequency**: Every 30 seconds

### **Console Monitoring**
```javascript
// Monitor service worker activity
setInterval(() => {
    chrome.runtime.sendMessage({ action: 'ping' }, response => {
        console.log('SW Health Check:', {
            initialized: response.initialized,
            monitoring: response.monitoring,
            lastActivity: new Date(response.lastActivity).toISOString()
        });
    });
}, 60000); // Check every minute
```

## 🔧 Configuration

### **Monitoring Intervals**
```javascript
// Current settings (in service-worker.js)
const HEARTBEAT_INTERVAL = 25000;    // 25 seconds
const ACTIVITY_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_INACTIVE_TIME = 300000;    // 5 minutes
```

### **Test Timeouts**
```javascript
// Current settings (in test suite)
const TEST_TIMEOUT = 30000;          // 30 seconds per test
const IDLE_TEST_DURATION = 180000;   // 3 minutes for idle test
const STABILITY_TEST_DURATION = 300000; // 5 minutes for stability test
```

## 📁 Important Files

### **Core Files**
- `js/service-worker.js` - Main service worker
- `manifest.json` - MV3 manifest
- `service-worker-reliability-test.html` - Test page

### **Test Files**
- `js/tests/service-worker-reliability-test.js` - Test suite
- `js/tests/reliability-test-ui.js` - Test UI handler

### **Backup Files**
- `js/service-worker-improved.js` - Enhanced version with monitoring
- `js/service-worker-client.js` - Client communication utility

## 🚨 Emergency Procedures

### **Service Worker Not Responding**
1. Check console for error messages
2. Reload extension in chrome://extensions
3. Run reliability tests to diagnose
4. Check if monitoring is active

### **Tests Failing**
1. Check service worker logs
2. Verify CSP compliance
3. Ensure all external scripts are loading
4. Check for console errors

### **Extension Not Working**
1. Verify manifest.json is valid
2. Check service worker is registered
3. Run basic communication test
4. Check for permission issues

## 📞 Getting Help

### **Debugging Steps**
1. Open test page: `service-worker-reliability-test.html`
2. Run "Basic Communication" test
3. Check console for detailed logs
4. Review this quick reference

### **Common Solutions**
- **CSP errors**: Move inline scripts to external files
- **Service worker issues**: Check monitoring logs
- **Test failures**: Verify service worker initialization
- **Performance issues**: Monitor heartbeat frequency

---

**Last Updated**: 2024  
**Extension Version**: 1.1.3  
**MV3 Status**: ✅ Fully migrated and tested 