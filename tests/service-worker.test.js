// Service Worker Tests for Spaces Extension MV3
// Tests the service worker functionality and message handling

describe('Service Worker', () => {
    let serviceWorker;
    let backgroundScript;
    
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
        };
        
        chrome.storage = {
            local: {
                get: jest.fn(),
                set: jest.fn(),
            },
        };
    });
    
    describe('Service Worker Lifecycle', () => {
        test('should register lifecycle event listeners', () => {
            // Import the service worker (this will execute the code)
            require('../js/service-worker.js');
            
            // Check that lifecycle listeners are registered
            expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled();
            expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
            expect(global.self.addEventListener).toHaveBeenCalledWith('activate', expect.any(Function));
            expect(global.self.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        });
        
        test('should initialize when onStartup is triggered', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            require('../js/service-worker.js');
            
            // Get the startup listener
            const startupListener = chrome.runtime.onStartup.addListener.mock.calls[0][0];
            
            // Trigger the startup
            startupListener();
            
            expect(consoleSpy).toHaveBeenCalledWith('Service worker starting up...');
            expect(consoleSpy).toHaveBeenCalledWith('Initializing service worker...');
            expect(consoleSpy).toHaveBeenCalledWith('Service worker initialization complete');
        });
        
        test('should initialize when onInstalled is triggered', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            require('../js/service-worker.js');
            
            // Get the installed listener
            const installedListener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
            
            // Trigger the install
            installedListener();
            
            expect(consoleSpy).toHaveBeenCalledWith('Service worker installed...');
            expect(consoleSpy).toHaveBeenCalledWith('Initializing service worker...');
            expect(consoleSpy).toHaveBeenCalledWith('Service worker initialization complete');
        });
        
        test('should handle activation event', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            require('../js/service-worker.js');
            
            // Get the activate listener
            const activateListener = global.self.addEventListener.mock.calls.find(
                call => call[0] === 'activate'
            )[1];
            
            // Mock event.waitUntil
            const event = {
                waitUntil: jest.fn(),
            };
            
            // Trigger the activation
            activateListener(event);
            
            expect(consoleSpy).toHaveBeenCalledWith('Service worker activated...');
            expect(event.waitUntil).toHaveBeenCalled();
        });
    });
    
    describe('Message Handling', () => {
        test('should register message listener', () => {
            require('../js/service-worker.js');
            
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
        });
        
        test('should handle ping message', () => {
            require('../js/service-worker.js');
            
            // Get the message listener
            const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
            
            // Mock sendResponse
            const sendResponse = jest.fn();
            
            // Send ping message
            const result = messageListener(
                { action: 'ping' },
                { tab: { id: 1 } },
                sendResponse
            );
            
            expect(result).toBe(false);
            expect(sendResponse).toHaveBeenCalledWith({ status: 'ready' });
        });
        
        test('should handle invalid messages', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            require('../js/service-worker.js');
            
            // Get the message listener
            const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
            
            // Mock sendResponse
            const sendResponse = jest.fn();
            
            // Send invalid message
            const result = messageListener(
                { invalid: 'message' },
                { tab: { id: 1 } },
                sendResponse
            );
            
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Invalid message received:', { invalid: 'message' });
            expect(sendResponse).toHaveBeenCalledWith({ error: 'Invalid message format' });
        });
        
        test('should handle requestHotkeys message', () => {
            require('../js/service-worker.js');
            
            // Get the message listener
            const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
            
            // Mock sendResponse
            const sendResponse = jest.fn();
            
            // Mock chrome.commands.getAll
            chrome.commands.getAll = jest.fn((callback) => {
                callback([
                    { name: 'spaces-switch', shortcut: 'Ctrl+Shift+S' },
                    { name: 'spaces-move', shortcut: 'Ctrl+Shift+M' }
                ]);
            });
            
            // Send requestHotkeys message
            const result = messageListener(
                { action: 'requestHotkeys' },
                { tab: { id: 1 } },
                sendResponse
            );
            
            expect(result).toBe(true);
            expect(chrome.commands.getAll).toHaveBeenCalled();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle unhandled promise rejections', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            require('../js/service-worker.js');
            
            // Get the unhandledrejection listener
            const rejectionListener = global.self.addEventListener.mock.calls.find(
                call => call[0] === 'unhandledrejection'
            )[1];
            
            // Mock rejection event
            const event = {
                reason: new Error('Test rejection'),
            };
            
            // Trigger the rejection
            rejectionListener(event);
            
            expect(consoleSpy).toHaveBeenCalledWith('Unhandled promise rejection in service worker:', event.reason);
        });
        
        test('should handle initialization errors', () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            // Mock a failure in the initialization
            jest.doMock('../js/spacesService.js', () => ({
                initialiseSpaces: jest.fn().mockRejectedValue(new Error('Init failed')),
                initialiseTabHistory: jest.fn(),
            }));
            
            require('../js/service-worker.js');
            
            // Get the startup listener
            const startupListener = chrome.runtime.onStartup.addListener.mock.calls[0][0];
            
            // Trigger the startup
            startupListener();
            
            expect(consoleSpy).toHaveBeenCalledWith('Service worker initialization failed:', expect.any(Error));
        });
    });
    
    describe('Integration Tests', () => {
        test('should initialize all required services', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            require('../js/service-worker.js');
            
            // Check that all the required listeners are registered
            expect(chrome.tabs.onCreated.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onMoved.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
            expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
            expect(chrome.windows.onFocusChanged.addListener).toHaveBeenCalled();
            expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
            expect(chrome.contextMenus.create).toHaveBeenCalled();
            expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
        });
        
        test('should handle context menu creation errors', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Mock context menu creation error
            chrome.contextMenus.create.mockImplementation((options, callback) => {
                if (callback) {
                    callback();
                }
            });
            
            chrome.runtime.lastError = { message: 'Context menu creation failed' };
            
            require('../js/service-worker.js');
            
            // The error should be handled gracefully
            expect(consoleSpy).toHaveBeenCalledWith('Context menu creation error:', 'Context menu creation failed');
        });
    });
}); 