# Testing New Service Worker Patterns

This guide explains how to test the new MV3 service worker implementation that uses proper lifecycle management and lazy initialization.

## 🎯 What We're Testing

The new service worker implementation addresses the "Receiving end does not exist" errors by:

1. **Lazy Initialization** - Only initializes when first needed
2. **Proper Wake-Up Handling** - Handles service worker termination/restart
3. **Event-Driven Architecture** - Responds to events rather than staying persistent
4. **State Persistence** - Uses chrome.storage for state management

## 🧪 Testing Setup

chrome-extension://cenkmofngpohdnkbjdpilgpmbiiljjim/service-worker-test.html

### Option 1: Test with Current Extension (Recommended)

1. **Load the test script** in the extension context:

   ```javascript
   // Copy and paste the contents of test-new-sw.js into the browser console
   // when viewing popup-test.html or popup-test-new-sw.html
   ```
2. **Run the tests**:

   ```javascript
   // Run all tests
   window.testNewServiceWorker.runAllTests()

   // Or run individual tests
   window.testNewServiceWorker.testPing()
   window.testNewServiceWorker.testInitialization()
   window.testNewServiceWorker.testHotkeys()
   ```

### Option 2: Test with Test Manifest

1. **Temporarily replace manifest.json**:

   ```bash
   cp manifest.json manifest-backup.json
   cp manifest-test.json manifest.json
   ```
2. **Reload the extension** in Chrome
3. **Test the new service worker** using the test pages
4. **Restore original manifest**:

   ```bash
   cp manifest-backup.json manifest.json
   ```

## 📋 Test Cases

### 1. Ping Test

- **Purpose**: Verify basic communication
- **Expected**: Service worker responds with `{ status: 'ready', initialized: false/true }`

### 2. Initialization Test

- **Purpose**: Verify lazy initialization works
- **Expected**: First ping triggers initialization, second shows `initialized: true`

### 3. Hotkeys Test

- **Purpose**: Verify command handling
- **Expected**: Returns keyboard shortcuts for spaces commands

### 4. Popup Params Test

- **Purpose**: Verify popup parameter generation
- **Expected**: Returns URL parameters for popup windows

### 5. Retry Logic Test

- **Purpose**: Verify error handling
- **Expected**: Handles failed requests gracefully

### 6. Multiple Requests Test

- **Purpose**: Verify concurrent request handling
- **Expected**: Handles multiple simultaneous requests

### 7. Lifecycle Test

- **Purpose**: Verify service worker stays responsive
- **Expected**: Responds after idle periods

## 🔍 What to Look For

### ✅ Success Indicators

- No "Receiving end does not exist" errors
- Service worker initializes on first request
- All tests pass consistently
- Console shows proper initialization logs

### ❌ Failure Indicators

- Persistent connection errors
- Service worker not responding after idle
- Initialization failures
- Missing functionality

## 📊 Expected Results

### Console Logs

```
Test service worker starting up...
Test service worker activated...
Starting test service worker initialization...
Test service worker initialization complete
Test SW message received: ping
```

### Test Results

```
✅ Passed: 7
❌ Failed: 0
📈 Success Rate: 100%
```

## 🚀 Next Steps

If all tests pass:

1. **Replace the current service worker** with the new implementation
2. **Update popup.js** to use the service-worker-client.js utility
3. **Test the full extension** functionality
4. **Deploy the changes**

If tests fail:

1. **Check console logs** for specific error messages
2. **Verify manifest.json** configuration
3. **Check Chrome extension permissions**
4. **Debug specific failing test cases**

## 🛠️ Debugging Tips

### Check Service Worker Status

```javascript
// In Chrome DevTools > Application > Service Workers
// Look for the extension's service worker and check its status
```

### Monitor Console Logs

```javascript
// Watch for these key messages:
// - "Test service worker starting up..."
// - "Test service worker initialization complete"
// - "Test SW message received: ping"
```

### Test Individual Components

```javascript
// Test just the ping functionality
window.testNewServiceWorker.testPing()

// Test initialization specifically
window.testNewServiceWorker.testInitialization()
```

## 📝 Notes

- The test service worker (`service-worker-test.js`) is a simplified version focused on testing the patterns
- The full implementation (`service-worker.js`) includes all the original functionality
- Tests should be run in the extension context (not regular web pages)
- Service worker termination and restart is normal behavior in MV3
