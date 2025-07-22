// Proper MV3 Service Worker Implementation
// Following Chrome's recommended patterns for service worker lifecycle management

// Import modules statically (required for service workers)
import spacesService from './spacesService.js';
import { utils } from './utils.js';
import { dbService } from './dbService.js';

// State management - use chrome.storage for persistence
let isInitialized = false;
let initializationPromise = null;

// Window tracking for internal spaces windows
let spacesOpenWindowId = false;
let spacesPopupWindowId = false;

// Service worker lifecycle events
chrome.runtime.onStartup.addListener(() => {
    console.log('Service worker starting up...');
    // Initialize on startup to ensure service worker is ready
    initializeServiceWorker();
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Service worker installed...', details.reason);
    // Initialize on both install and update to ensure service worker is ready
    initializeServiceWorker();
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
            console.log('Service worker received requestSpaceDetail:', request);
            const spaceDetail = await requestSpaceDetail(request.windowId, request.sessionId);
            console.log('Service worker returning spaceDetail:', spaceDetail);
            sendResponse(spaceDetail);
            return true; // Keep message channel open for async response
            
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
            
        case 'requestAllSpaces':
            requestAllSpaces(sendResponse);
            break;
            
        case 'requestTabDetail':
            requestTabDetail(request.tabId, sendResponse);
            break;
            
        case 'updateSessionName':
            handleUpdateSessionName(request.sessionId, request.sessionName, sendResponse);
            break;
            
        case 'saveNewSession':
            handleSaveNewSession(request.windowId, request.sessionName, sendResponse);
            break;
            
        case 'switchToSpace':
            handleSwitchToSpace(request.sessionId, request.windowId, sendResponse);
            break;
            
        case 'moveTabToSession':
            handleMoveTabToSession(request.tabId, request.sessionId, sendResponse);
            break;
            
        case 'moveTabToWindow':
            handleMoveTabToWindow(request.tabId, request.windowId, sendResponse);
            break;
            
        case 'addLinkToSession':
            handleAddLinkToSession(request.url, request.sessionId, sendResponse);
            break;
            
        case 'addLinkToWindow':
            handleAddLinkToWindow(request.url, request.windowId, sendResponse);
            break;
            
        case 'requestShowKeyboardShortcuts':
            createShortcutsWindow();
            sendResponse(true);
            break;
            
        case 'requestClose':
            closePopupWindow();
            sendResponse(true);
            break;
            
        case 'loadSession':
            const loadSessionId = _cleanParameter(request.sessionId);
            if (loadSessionId) {
                handleLoadSession(loadSessionId, request.tabUrl);
                sendResponse(true);
            }
            break;
            
        case 'loadWindow':
            const loadWindowId = _cleanParameter(request.windowId);
            if (loadWindowId) {
                handleLoadWindow(loadWindowId, request.tabUrl);
                sendResponse(true);
            }
            break;
            
        case 'loadTabInSession':
            const loadTabSessionId = _cleanParameter(request.sessionId);
            if (loadTabSessionId && request.tabUrl) {
                handleLoadSession(loadTabSessionId, request.tabUrl);
                sendResponse(true);
            }
            break;
            
        case 'loadTabInWindow':
            const loadTabWindowId = _cleanParameter(request.windowId);
            if (loadTabWindowId && request.tabUrl) {
                handleLoadWindow(loadTabWindowId, request.tabUrl);
                sendResponse(true);
            }
            break;
            
        case 'importNewSession':
            if (request.urlList) {
                handleImportNewSession(request.urlList, sendResponse);
            }
            break;
            
        case 'restoreFromBackup':
            if (request.spaces) {
                handleRestoreFromBackup(request.spaces, sendResponse);
            }
            break;
            
        case 'deleteSession':
            const deleteSessionId = _cleanParameter(request.sessionId);
            if (deleteSessionId) {
                handleDeleteSession(deleteSessionId, false, sendResponse);
            }
            break;
            
        case 'addLinkToNewSession':
            const addLinkTabId = _cleanParameter(request.tabId);
            if (request.sessionName && request.url) {
                handleAddLinkToNewSession(request.url, request.sessionName, result => {
                    if (result) updateSpacesWindow('addLinkToNewSession');
                    sendResponse(result);
                });
            }
            break;
            
        case 'moveTabToNewSession':
            const moveTabToNewSessionId = _cleanParameter(request.tabId);
            if (request.sessionName && moveTabToNewSessionId) {
                handleMoveTabToNewSession(moveTabToNewSessionId, request.sessionName, result => {
                    if (result) updateSpacesWindow('moveTabToNewSession');
                    sendResponse(result);
                });
            }
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
}

// Utility functions
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
        // First check for an existing session matching this windowId
        const session = spacesService.getSessionByWindowId(windowId);
        
        if (session) {
            return {
                sessionId: session.id,
                windowId: session.windowId,
                name: session.name,
                tabs: session.tabs,
                history: session.history,
            };
        } else {
            // Otherwise build a space object out of the actual window
            return new Promise((resolve) => {
                chrome.windows.get(parseInt(windowId, 10), { populate: true }, window => {
                    if (chrome.runtime.lastError) {
                        resolve(false);
                    } else {
                        resolve({
                            sessionId: false,
                            windowId: window.id,
                            name: false,
                            tabs: window.tabs,
                            history: false,
                        });
                    }
                });
            });
        }
    } else if (sessionId) {
        console.log('Looking up session by ID:', sessionId, 'Type:', typeof sessionId);
        
        // Debug: Check what sessions are available
        const allSessions = spacesService.getAllSessions();
        console.log('All available sessions:', allSessions);
        console.log('Session IDs in array:', allSessions.map(s => ({ id: s.id, name: s.name })));
        console.log('Session ID values:', allSessions.map(s => s.id));
        console.log('Session names:', allSessions.map(s => s.name));
        console.log('First session object keys:', Object.keys(allSessions[0] || {}));
        console.log('First session object:', allSessions[0]);
        
        const session = spacesService.getSessionBySessionId(sessionId);
        console.log('Session found:', session);
        if (session) {
            return {
                sessionId: session.id,
                windowId: session.windowId,
                name: session.name,
                tabs: session.tabs,
                history: session.history,
            };
        }
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

    // Create a new window for spaces management
    chrome.windows.create(
        {
            type: 'popup',
            url,
            height: 500,
            width: 1000,
            top: 50,
            left: 50,
        },
        window => {
            spacesOpenWindowId = window.id;
            console.log('Spaces management window created:', window.id);
        }
    );
}

function showSpacesMoveWindow(tabUrl) {
    // Generate popup params for move action
    generatePopupParams('move', tabUrl).then(params => {
        const popupUrl = `${chrome.runtime.getURL('popup.html')}#opener=bg&${params}`;
        
        chrome.windows.create(
            {
                type: 'popup',
                url: popupUrl,
                height: 400,
                width: 500,
                top: 100,
                left: 100,
            },
            window => {
                spacesPopupWindowId = window.id;
                console.log('Move window created:', window.id);
            }
        );
    });
}

function showSpacesSwitchWindow() {
    // Generate popup params for switch action
    generatePopupParams('switch').then(params => {
        const popupUrl = `${chrome.runtime.getURL('popup.html')}#opener=bg&${params}`;
        
        chrome.windows.create(
            {
                type: 'popup',
                url: popupUrl,
                height: 400,
                width: 500,
                top: 100,
                left: 100,
            },
            window => {
                spacesPopupWindowId = window.id;
                console.log('Switch window created:', window.id);
            }
        );
    });
}

// Additional utility functions for popup operations
function requestAllSpaces(callback) {
    const sessions = spacesService.getAllSessions();
    const allSpaces = sessions
        .map(session => {
            return { sessionId: session.id, ...session };
        })
        .filter(session => {
            return session && session.tabs && session.tabs.length > 0;
        });
    
    // Sort results by last access
    allSpaces.sort((a, b) => {
        if (a.windowId && !b.windowId) return -1;
        if (!a.windowId && b.windowId) return 1;
        return (b.lastAccess || 0) - (a.lastAccess || 0);
    });
    
    callback(allSpaces);
}

function requestTabDetail(tabId, callback) {
    chrome.tabs.get(tabId, callback);
}

function handleUpdateSessionName(sessionId, sessionName, callback) {
    const session = spacesService.getSessionBySessionId(sessionId);
    if (session) {
        session.name = sessionName;
        dbService.updateSession(session, callback);
    } else {
        callback(false);
    }
}

function handleSaveNewSession(windowId, sessionName, callback) {
    console.log('handleSaveNewSession called with:', { windowId, sessionName });
    
    chrome.windows.get(windowId, { populate: true }, window => {
        if (chrome.runtime.lastError) {
            console.error('Error getting window:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        
        console.log('Window data retrieved:', window);
        
        const session = {
            name: sessionName,
            tabs: window.tabs,
            sessionHash: spacesService.generateSessionHash(window.tabs),
            lastAccess: Date.now(),
            windowId: window.id
        };
        
        console.log('Creating session:', session);
        
        dbService.createSession(session, (result) => {
            console.log('dbService.createSession callback result:', result);
            
            // Refresh the sessions in spacesService after creating a new session
            if (result) {
                dbService.fetchAllSessions(sessions => {
                    spacesService.sessions = sessions;
                    console.log('Refreshed spacesService sessions:', sessions);
                    callback(result);
                });
            } else {
                callback(result);
            }
        });
    });
}

function handleSwitchToSpace(sessionId, windowId, callback) {
    if (sessionId) {
        const session = spacesService.getSessionBySessionId(sessionId);
        if (session) {
            spacesService.loadSession(session.id);
        }
    } else if (windowId) {
        chrome.windows.update(parseInt(windowId, 10), { focused: true });
    }
    callback(true);
}

function handleMoveTabToSession(tabId, sessionId, callback) {
    const session = spacesService.getSessionBySessionId(sessionId);
    if (session) {
        spacesService.moveTabToSession(tabId, session.id, callback);
    } else {
        callback(false);
    }
}

function handleMoveTabToWindow(tabId, windowId, callback) {
    chrome.tabs.move(tabId, { windowId: parseInt(windowId, 10) }, callback);
}

function handleAddLinkToSession(url, sessionId, callback) {
    const session = spacesService.getSessionBySessionId(sessionId);
    if (session) {
        spacesService.addLinkToSession(url, session.id, callback);
    } else {
        callback(false);
    }
}

function handleAddLinkToWindow(url, windowId, callback) {
    chrome.tabs.create({ url, windowId: parseInt(windowId, 10) }, callback);
}

function createShortcutsWindow() {
    // Implementation would go here
    console.log('Creating shortcuts window');
}

function closePopupWindow() {
    // Implementation would go here
    console.log('Closing popup window');
}

// Additional utility functions from background.js
function _cleanParameter(param) {
    if (typeof param === 'number') {
        return param;
    }
    if (param === 'false') {
        return false;
    }
    if (param === 'true') {
        return true;
    }
    return parseInt(param, 10);
}

function handleLoadSession(sessionId, tabUrl) {
    const session = spacesService.getSessionBySessionId(sessionId);
    
    if (!session) {
        console.error('Session not found:', sessionId);
        return;
    }

    // If space is already open, then give it focus
    if (session.windowId) {
        handleLoadWindow(session.windowId, tabUrl);
    } else {
        // Load space in new window
        const urls = session.tabs.map(curTab => {
            return curTab.url;
        });
        
        chrome.windows.create(
            {
                url: urls,
                height: 800,
                width: 1000,
                top: 50,
                left: 50,
            },
            newWindow => {
                // Force match this new window to the session
                spacesService.matchSessionToWindow(session, newWindow);

                // After window has loaded try to pin any previously pinned tabs
                session.tabs.forEach(curSessionTab => {
                    if (curSessionTab.pinned) {
                        let pinnedTabId = false;
                        newWindow.tabs.some(curNewTab => {
                            if (
                                curNewTab.url === curSessionTab.url ||
                                curNewTab.pendingUrl === curSessionTab.url
                            ) {
                                pinnedTabId = curNewTab.id;
                                return true;
                            }
                            return false;
                        });
                        if (pinnedTabId) {
                            chrome.tabs.update(pinnedTabId, {
                                pinned: true,
                            });
                        }
                    }
                });

                // If tabUrl is defined, then focus this tab
                if (tabUrl) {
                    focusOrLoadTabInWindow(newWindow, tabUrl);
                }
            }
        );
    }
}

function handleLoadWindow(windowId, tabUrl) {
    chrome.windows.get(windowId, { populate: true }, window => {
        if (chrome.runtime.lastError) {
            return;
        }
        focusOrLoadTabInWindow(window, tabUrl);
    });
}

function focusOrLoadTabInWindow(window, tabUrl) {
    if (tabUrl) {
        chrome.tabs.create({ url: tabUrl, windowId: window.id });
    }
    chrome.windows.update(window.id, { focused: true });
}

function handleImportNewSession(urlList, callback) {
    const session = {
        name: 'Imported Session',
        tabs: urlList.map(url => ({ url })),
        sessionHash: spacesService.generateSessionHash(urlList.map(url => ({ url }))),
        lastAccess: Date.now(),
        windowId: false
    };
    
    dbService.createSession(session, callback);
}

function handleRestoreFromBackup(spaces, callback) {
    // Clear existing sessions and restore from backup
    dbService.fetchAllSessions(sessions => {
        sessions.forEach(session => {
            dbService.removeSession(session.id);
        });
        
        // Add restored sessions
        spaces.forEach(space => {
            dbService.createSession(space);
        });
        
        callback(true);
    });
}

function handleDeleteSession(sessionId, force, callback) {
    const session = spacesService.getSessionBySessionId(sessionId);
    if (session) {
        dbService.removeSession(sessionId, (result) => {
            if (result) {
                // Refresh the sessions in spacesService after deleting
                dbService.fetchAllSessions(sessions => {
                    // Clear any previously saved windowIds
                    sessions.forEach(session => {
                        session.windowId = false;
                    });
                    
                    // Re-evaluate which windows are actually open
                    chrome.windows.getAll({ populate: true }, windows => {
                        // Update sessions array
                        spacesService.sessions = sessions;
                        
                        // Match current open windows with saved sessions
                        windows.forEach(curWindow => {
                            if (!spacesService.filterInternalWindows(curWindow)) {
                                spacesService.checkForSessionMatch(curWindow);
                            }
                        });
                        
                        console.log('Refreshed and re-evaluated spacesService sessions after delete:', spacesService.sessions);
                        callback(result);
                    });
                });
            } else {
                callback(result);
            }
        });
    } else {
        callback(false);
    }
}

function handleAddLinkToNewSession(url, sessionName, callback) {
    const session = {
        name: sessionName,
        tabs: [{ url }],
        sessionHash: spacesService.generateSessionHash([{ url }]),
        lastAccess: Date.now(),
        windowId: false
    };
    
    dbService.createSession(session, callback);
}

function handleMoveTabToNewSession(tabId, sessionName, callback) {
    chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) {
            callback(false);
            return;
        }
        
        const session = {
            name: sessionName,
            tabs: [tab],
            sessionHash: spacesService.generateSessionHash([tab]),
            lastAccess: Date.now(),
            windowId: false
        };
        
        dbService.createSession(session, result => {
            if (result) {
                chrome.tabs.remove(tabId);
            }
            callback(result);
        });
    });
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in service worker:', event.reason);
});

// Keep service worker alive with minimal heartbeat
setInterval(() => {
    console.log('Service worker heartbeat');
}, 30000); 