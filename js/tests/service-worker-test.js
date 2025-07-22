// Test Service Worker Implementation for MV3
// Simplified version focused on testing the new patterns

// State management
let isInitialized = false;
let initializationPromise = null;
let spacesOpenWindowId = false;
let spacesPopupWindowId = false;

// Service worker lifecycle events
chrome.runtime.onStartup.addListener(() => {
    console.log('Test service worker starting up...');
    // Don't initialize immediately - wait for first request
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Test service worker installed...', details.reason);
    // Only initialize on first install, not updates
    if (details.reason === 'install') {
        initializeServiceWorker();
    }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
    console.log('Test service worker activated...');
    // Don't block activation with heavy initialization
    event.waitUntil(Promise.resolve());
});

// Lazy initialization - only initialize when first needed
async function initializeServiceWorker() {
    if (isInitialized) {
        console.log('Test service worker already initialized');
        return;
    }
    
    if (initializationPromise) {
        console.log('Test service worker initialization in progress...');
        return initializationPromise;
    }
    
    console.log('Starting test service worker initialization...');
    
    initializationPromise = (async () => {
        try {
            // Import modules only when needed
            const { default: spacesService } = await import('./spacesService.js');
            
            // Initialize core services
            await spacesService.initialiseSpaces();
            spacesService.initialiseTabHistory();
            
            // Set up basic event listeners
            setupBasicEventListeners(spacesService);
            
            isInitialized = true;
            console.log('Test service worker initialization complete');
            
            // Store initialization state
            chrome.storage.local.set({ 
                testServiceWorkerInitialized: true,
                lastInitialized: Date.now()
            });
            
        } catch (error) {
            console.error('Test service worker initialization failed:', error);
            isInitialized = false;
            initializationPromise = null;
            throw error;
        }
    })();
    
    return initializationPromise;
}

// Setup basic event listeners
function setupBasicEventListeners(spacesService) {
    // Basic tab event listeners
    chrome.tabs.onCreated.addListener(tab => {
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        console.log('Tab created:', tab.id);
    });
    
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        if (checkInternalSpacesWindows(removeInfo.windowId, false)) return;
        spacesService.handleTabRemoved(tabId, removeInfo, () => {
            console.log('Tab removed:', tabId);
        });
    });
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        spacesService.handleTabUpdated(tab, changeInfo, () => {
            console.log('Tab updated:', tabId);
        });
    });
    
    // Basic window event listeners
    chrome.windows.onRemoved.addListener(windowId => {
        if (checkInternalSpacesWindows(windowId, true)) return;
        spacesService.handleWindowRemoved(windowId, true, () => {
            console.log('Window removed:', windowId);
        });
    });
    
    chrome.windows.onFocusChanged.addListener(windowId => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) return;
        spacesService.handleWindowFocussed(windowId);
    });
    
    // Keyboard shortcuts
    chrome.commands.onCommand.addListener(command => {
        console.log('Command received:', command);
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
    console.log('Test SW message received:', request.action);
    
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
            console.log('Test service worker not initialized, initializing now...');
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
    const { default: spacesService } = await import('./spacesService.js');
    
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
            
        case 'testRetry':
            // Test message for retry logic
            sendResponse({ success: true, message: 'Retry test successful', initialized: isInitialized });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
}

// Utility functions with actual implementations
function checkInternalSpacesWindows(windowId, windowClosed) {
    if (windowId === spacesOpenWindowId) {
        if (windowClosed) spacesOpenWindowId = false;
        return true;
    }
    if (windowId === spacesPopupWindowId) {
        if (windowClosed) spacesPopupWindowId = false;
        return true;
    }
    return false;
}

function requestHotkeys(callback) {
    chrome.commands.getAll(commands => {
        let switchStr;
        let moveStr;
        let spacesStr;

        commands.forEach(command => {
            if (command.name === 'spaces-switch') {
                switchStr = command.shortcut;
            } else if (command.name === 'spaces-move') {
                moveStr = command.shortcut;
            } else if (command.name === 'spaces-open') {
                spacesStr = command.shortcut;
            }
        });

        callback({
            switchCode: switchStr,
            moveCode: moveStr,
            spacesCode: spacesStr,
        });
    });
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
    
    // Get session info
    const { default: spacesService } = await import('./spacesService.js');
    const session = spacesService.getSessionByWindowId(activeTab.windowId);
    const name = session ? session.name : '';
    
    let params = `action=${action}&windowId=${activeTab.windowId}&sessionName=${name}`;
    
    if (tabUrl) {
        params += `&url=${encodeURIComponent(tabUrl)}`;
    } else {
        params += `&tabId=${activeTab.id}`;
    }
    
    return params;
}

async function requestSpaceDetail(windowId, sessionId) {
    const { default: spacesService } = await import('./spacesService.js');
    
    if (windowId) {
        return spacesService.getSessionByWindowId(windowId);
    } else if (sessionId) {
        return spacesService.getSessionBySessionId(sessionId);
    }
    
    return null;
}

function showSpacesOpenWindow(windowId, editMode) {
    let url;

    if (editMode && windowId) {
        url = chrome.runtime.getURL(
            `spaces.html#windowId=${windowId}&editMode=true`
        );
    } else {
        url = chrome.runtime.getURL('spaces.html');
    }

    // if spaces open window already exists then just give it focus
    if (spacesOpenWindowId) {
        chrome.windows.get(
            spacesOpenWindowId,
            { populate: true },
            window => {
                chrome.windows.update(spacesOpenWindowId, {
                    focused: true,
                });
                if (window.tabs[0].id) {
                    chrome.tabs.update(window.tabs[0].id, { url });
                }
            }
        );
    } else {
        chrome.windows.create(
            {
                type: 'popup',
                url,
                height: screen.height - 100,
                width: Math.min(screen.width, 1000),
                top: 0,
                left: 0,
            },
            window => {
                spacesOpenWindowId = window.id;
            }
        );
    }
}

function showSpacesMoveWindow(tabUrl) {
    createOrShowSpacesPopupWindow('move', tabUrl);
}

function showSpacesSwitchWindow() {
    createOrShowSpacesPopupWindow('switch');
}

function createOrShowSpacesPopupWindow(action, tabUrl) {
    generatePopupParams(action, tabUrl).then(params => {
        const popupUrl = `${chrome.runtime.getURL(
            'popup.html'
        )}#opener=bg&${params}`;
        
        // if spaces window already exists
        if (spacesPopupWindowId) {
            chrome.windows.get(
                spacesPopupWindowId,
                { populate: true },
                window => {
                    chrome.windows.update(spacesPopupWindowId, {
                        focused: true,
                    });
                    if (window.tabs[0].id) {
                        chrome.tabs.update(window.tabs[0].id, {
                            url: popupUrl,
                        });
                    }
                }
            );
        } else {
            chrome.windows.create(
                {
                    type: 'popup',
                    url: popupUrl,
                    height: 400,
                    width: 300,
                },
                window => {
                    spacesPopupWindowId = window.id;
                }
            );
        }
    });
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in test service worker:', event.reason);
});

// Keep service worker alive with minimal heartbeat
setInterval(() => {
    console.log('Test service worker heartbeat');
}, 30000); 