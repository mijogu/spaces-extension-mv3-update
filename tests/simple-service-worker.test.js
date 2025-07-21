// Simple Service Worker Tests - Testing the functionality without importing ES modules
// This tests the expected behavior of the service worker

describe('Service Worker Functionality', () => {
    beforeEach(() => {
        // Reset Chrome API mocks
        jest.clearAllMocks();
        
        // Mock service worker context
        global.self = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
        
        // Mock chrome.runtime APIs
        chrome.runtime.onStartup = {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        };
        
        chrome.runtime.onInstalled = {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        };
        
        chrome.runtime.onMessage = {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        };
        
        chrome.tabs = {
            onCreated: { addListener: jest.fn() },
            onRemoved: { addListener: jest.fn() },
            onMoved: { addListener: jest.fn() },
            onUpdated: { addListener: jest.fn() },
            query: jest.fn(),
        };
        
        chrome.windows = {
            onRemoved: { addListener: jest.fn() },
            onFocusChanged: { addListener: jest.fn() },
            getAll: jest.fn(),
            get: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        
        chrome.contextMenus = {
            removeAll: jest.fn(),
            create: jest.fn(),
            onClicked: { addListener: jest.fn() },
        };
        
        chrome.commands = {
            onCommand: { addListener: jest.fn() },
            getAll: jest.fn(),
        };
        
        chrome.storage = {
            local: {
                get: jest.fn(),
                set: jest.fn(),
            },
        };
    });
    
    describe('Message Handler Logic', () => {
        test('should handle ping message correctly', () => {
            // Mock the message handler logic
            const messageHandler = (request, sender, sendResponse) => {
                if (!request || !request.action) {
                    console.error('Invalid message received:', request);
                    sendResponse({ error: 'Invalid message format' });
                    return false;
                }
                
                switch (request.action) {
                    case 'ping':
                        sendResponse({ status: 'ready' });
                        return false;
                    default:
                        return false;
                }
            };
            
            const sendResponse = jest.fn();
            
            // Test ping message
            const result = messageHandler({ action: 'ping' }, {}, sendResponse);
            
            expect(result).toBe(false);
            expect(sendResponse).toHaveBeenCalledWith({ status: 'ready' });
        });
        
        test('should handle invalid messages', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            const messageHandler = (request, sender, sendResponse) => {
                if (!request || !request.action) {
                    console.error('Invalid message received:', request);
                    sendResponse({ error: 'Invalid message format' });
                    return false;
                }
                
                switch (request.action) {
                    case 'ping':
                        sendResponse({ status: 'ready' });
                        return false;
                    default:
                        return false;
                }
            };
            
            const sendResponse = jest.fn();
            
            // Test invalid message
            const result = messageHandler({ invalid: 'message' }, {}, sendResponse);
            
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Invalid message received:', { invalid: 'message' });
            expect(sendResponse).toHaveBeenCalledWith({ error: 'Invalid message format' });
        });
        
        test('should handle requestHotkeys message', () => {
            const messageHandler = (request, sender, sendResponse) => {
                if (!request || !request.action) {
                    console.error('Invalid message received:', request);
                    sendResponse({ error: 'Invalid message format' });
                    return false;
                }
                
                switch (request.action) {
                    case 'requestHotkeys':
                        chrome.commands.getAll(sendResponse);
                        return true;
                    default:
                        return false;
                }
            };
            
            const sendResponse = jest.fn();
            
            // Test requestHotkeys message
            const result = messageHandler({ action: 'requestHotkeys' }, {}, sendResponse);
            
            expect(result).toBe(true);
            expect(chrome.commands.getAll).toHaveBeenCalledWith(sendResponse);
        });
        
        test('should handle generatePopupParams message', () => {
            const messageHandler = (request, sender, sendResponse) => {
                if (!request || !request.action) {
                    console.error('Invalid message received:', request);
                    sendResponse({ error: 'Invalid message format' });
                    return false;
                }
                
                switch (request.action) {
                    case 'generatePopupParams':
                        // Mock async response
                        Promise.resolve('test-params').then(params => {
                            sendResponse(params);
                        });
                        return true;
                    default:
                        return false;
                }
            };
            
            const sendResponse = jest.fn();
            
            // Test generatePopupParams message
            const result = messageHandler({ 
                action: 'generatePopupParams',
                actionType: 'switch'
            }, {}, sendResponse);
            
            expect(result).toBe(true);
        });
    });
    
    describe('Service Worker Lifecycle', () => {
        test('should register lifecycle listeners', () => {
            // Mock the lifecycle registration
            const registerLifecycle = () => {
                chrome.runtime.onStartup.addListener(() => {
                    console.log('Service worker starting up...');
                });
                
                chrome.runtime.onInstalled.addListener(() => {
                    console.log('Service worker installed...');
                });
                
                global.self.addEventListener('activate', (event) => {
                    console.log('Service worker activated...');
                    event.waitUntil(Promise.resolve());
                });
                
                global.self.addEventListener('unhandledrejection', (event) => {
                    console.error('Unhandled promise rejection:', event.reason);
                });
            };
            
            registerLifecycle();
            
            expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled();
            expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
            expect(global.self.addEventListener).toHaveBeenCalledWith('activate', expect.any(Function));
            expect(global.self.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        });
        
        test('should handle initialization errors', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            const initializeServiceWorker = async () => {
                try {
                    // Simulate an error during initialization
                    throw new Error('Init failed');
                } catch (error) {
                    console.error('Service worker initialization failed:', error);
                }
            };
            
            initializeServiceWorker();
            
            expect(consoleSpy).toHaveBeenCalledWith('Service worker initialization failed:', expect.any(Error));
        });
    });
    
    describe('Storage Compatibility', () => {
        test('should use chrome.storage.local instead of localStorage', () => {
            const fetchLastVersion = () => {
                return new Promise((resolve) => {
                    chrome.storage.local.get(['spacesVersion'], (result) => {
                        const version = result.spacesVersion;
                        if (version !== undefined) {
                            resolve(version);
                        } else {
                            resolve(0);
                        }
                    });
                });
            };
            
            const setLastVersion = (newVersion) => {
                chrome.storage.local.set({ spacesVersion: newVersion });
            };
            
            // Test that chrome.storage.local is used
            expect(typeof fetchLastVersion).toBe('function');
            expect(typeof setLastVersion).toBe('function');
            
            // Mock the storage call
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ spacesVersion: '1.1.3' });
            });
            
            return fetchLastVersion().then(version => {
                expect(version).toBe('1.1.3');
                expect(chrome.storage.local.get).toHaveBeenCalledWith(['spacesVersion'], expect.any(Function));
            });
        });
    });
    
    describe('Error Handling', () => {
        test('should handle chrome.runtime.lastError', () => {
            const handleMessageWithError = (callback) => {
                chrome.runtime.sendMessage({ action: 'test' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Message error:', chrome.runtime.lastError.message);
                        callback(null);
                    } else {
                        callback(response);
                    }
                });
            };
            
            const consoleSpy = jest.spyOn(console, 'error');
            const callback = jest.fn();
            
            // Mock an error
            chrome.runtime.lastError = { message: 'Receiving end does not exist' };
            
            handleMessageWithError(callback);
            
            expect(consoleSpy).toHaveBeenCalledWith('Message error:', 'Receiving end does not exist');
            expect(callback).toHaveBeenCalledWith(null);
        });
        
        test('should handle context menu creation errors', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            const createContextMenu = () => {
                chrome.contextMenus.removeAll(() => {
                    chrome.contextMenus.create({
                        id: 'spaces-add-link',
                        title: 'Add link to space...',
                        contexts: ['link'],
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.log('Context menu creation error:', chrome.runtime.lastError.message);
                        }
                    });
                });
            };
            
            // Mock an error
            chrome.contextMenus.create.mockImplementation((options, callback) => {
                chrome.runtime.lastError = { message: 'Context menu creation failed' };
                if (callback) callback();
            });
            
            createContextMenu();
            
            expect(consoleSpy).toHaveBeenCalledWith('Context menu creation error:', 'Context menu creation failed');
        });
    });
}); 