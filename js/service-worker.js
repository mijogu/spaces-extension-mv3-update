// Proper MV3 Service Worker Implementation
// Following Chrome's recommended patterns for service worker lifecycle management

// Import modules statically (required for service workers)
import spacesService from './spacesService.js';
import { utils } from './utils.js';
import { dbService } from './dbService.js';

// State management - use chrome.storage for persistence
let isInitialized = false;
let initializationPromise = null;

// Service worker lifecycle events
chrome.runtime.onStartup.addListener(() => {
    console.log('Service worker starting up...');
    // Don't initialize immediately - wait for first request
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Service worker installed...', details.reason);
    // Only initialize on first install, not updates
    if (details.reason === 'install') {
        initializeServiceWorker();
    }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
    console.log('Service worker activated...');
    // Don't block activation with heavy initialization
    event.waitUntil(Promise.resolve());
});

// Lazy initialization - only initialize when first needed
async function initializeServiceWorker() {
    if (isInitialized) {
        console.log('Service worker already initialized');
        return;
    }
    
    if (initializationPromise) {
        console.log('Service worker initialization in progress...');
        return initializationPromise;
    }
    
    console.log('Starting service worker initialization...');
    
    initializationPromise = (async () => {
        try {
            // Initialize core services (modules already imported statically)
            await spacesService.initialiseSpaces();
            spacesService.initialiseTabHistory();
            
            // Set up event listeners
            setupEventListeners(spacesService, utils);
            
            isInitialized = true;
            console.log('Service worker initialization complete');
            
            // Store initialization state
            chrome.storage.local.set({ 
                serviceWorkerInitialized: true,
                lastInitialized: Date.now()
            });
            
        } catch (error) {
            console.error('Service worker initialization failed:', error);
            isInitialized = false;
            initializationPromise = null;
            throw error;
        }
    })();
    
    return initializationPromise;
}

// Setup event listeners only after initialization
function setupEventListeners(spacesService, utils) {
    // Tab event listeners
    chrome.tabs.onCreated.addListener(tab => {
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        updateSpacesWindow('tabs.onCreated');
    });
    
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        if (checkInternalSpacesWindows(removeInfo.windowId, false)) return;
        spacesService.handleTabRemoved(tabId, removeInfo, () => {
            updateSpacesWindow('tabs.onRemoved');
        });
    });
    
    chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
        if (checkInternalSpacesWindows(moveInfo.windowId, false)) return;
        spacesService.handleTabMoved(tabId, moveInfo, () => {
            updateSpacesWindow('tabs.onMoved');
        });
    });
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        spacesService.handleTabUpdated(tab, changeInfo, () => {
            updateSpacesWindow('tabs.onUpdated');
        });
    });
    
    // Window event listeners
    chrome.windows.onRemoved.addListener(windowId => {
        if (checkInternalSpacesWindows(windowId, true)) return;
        spacesService.handleWindowRemoved(windowId, true, () => {
            updateSpacesWindow('windows.onRemoved');
        });
    });
    
    chrome.windows.onFocusChanged.addListener(windowId => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) return;
        spacesService.handleWindowFocussed(windowId);
    });
    
    // Keyboard shortcuts
    chrome.commands.onCommand.addListener(command => {
        if (command === 'spaces-move') {
            showSpacesMoveWindow();
        } else if (command === 'spaces-switch') {
            showSpacesSwitchWindow();
        }
    });
    
    // Context menu
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
    
    chrome.contextMenus.onClicked.addListener(info => {
        if (info.menuItemId === 'spaces-add-link') {
            showSpacesMoveWindow(info.linkUrl);
        }
    });
}

// Message handling with proper initialization
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request.action);
    
    // Handle simple messages that don't need initialization
    if (request.action === 'ping') {
        sendResponse({ status: 'ready', initialized: isInitialized });
        return false;
    }
    
    // For other messages, ensure service worker is initialized
    handleMessageWithInitialization(request, sender, sendResponse);
    return true; // Keep message channel open for async response
});

// Handle messages with proper initialization
async function handleMessageWithInitialization(request, sender, sendResponse) {
    try {
        // Ensure service worker is initialized
        if (!isInitialized) {
            console.log('Service worker not initialized, initializing now...');
            await initializeServiceWorker();
        }
        
        // Now handle the actual message
        await handleMessage(request, sender, sendResponse);
        
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
    }
}

// Handle specific messages
async function handleMessage(request, sender, sendResponse) {
    // Modules already imported statically
    
    switch (request.action) {
        case 'requestHotkeys':
            requestHotkeys(sendResponse);
            break;
            
        case 'generatePopupParams':
            const params = await generatePopupParams(request.actionType, request.tabUrl);
            sendResponse(params);
            break;
            
        case 'requestSpaceDetail':
            const spaceDetail = await requestSpaceDetail(request.windowId, request.sessionId);
            sendResponse(spaceDetail);
            break;
            
        case 'requestShowSpaces':
            showSpacesOpenWindow(request.windowId, request.edit);
            sendResponse(true);
            break;
            
        case 'requestShowSwitcher':
            showSpacesSwitchWindow();
            sendResponse(true);
            break;
            
        case 'requestShowMover':
            showSpacesMoveWindow();
            sendResponse(true);
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
}

// Utility functions
function checkInternalSpacesWindows(windowId, windowClosed) {
    // Implementation would go here
    return false;
}

function updateSpacesWindow(source) {
    // Implementation would go here
    console.log('Updating spaces window:', source);
}

function requestHotkeys(callback) {
    chrome.commands.getAll(callback);
}

async function generatePopupParams(action, tabUrl) {
    const tabs = await new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    if (tabs.length === 0) return '';
    
    const activeTab = tabs[0];
    if (checkInternalSpacesWindows(activeTab.windowId, false)) {
        return '';
    }
    
    // Get session info (module already imported statically)
    const session = spacesService.getSessionByWindowId(activeTab.windowId);
    const name = session ? session.name : '';
    
    let params = `action=${action}&windowId=${activeTab.windowId}&sessionName=${name}`;
    
    if (tabUrl) {
        params += `&url=${encodeURIComponent(tabUrl)}`;
    } else {
        params += `&url=${encodeURIComponent(activeTab.url)}`;
    }
    
    return params;
}

async function requestSpaceDetail(windowId, sessionId) {
    // Module already imported statically
    
    if (windowId) {
        return spacesService.getSessionByWindowId(windowId);
    } else if (sessionId) {
        return spacesService.getSessionBySessionId(sessionId);
    }
    
    return null;
}

function showSpacesOpenWindow(windowId, editMode) {
    // Implementation would go here
    console.log('Showing spaces open window:', { windowId, editMode });
}

function showSpacesMoveWindow(tabUrl) {
    // Implementation would go here
    console.log('Showing spaces move window:', tabUrl);
}

function showSpacesSwitchWindow() {
    // Implementation would go here
    console.log('Showing spaces switch window');
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in service worker:', event.reason);
});

// Keep service worker alive with minimal heartbeat
setInterval(() => {
    console.log('Service worker heartbeat');
}, 30000); 