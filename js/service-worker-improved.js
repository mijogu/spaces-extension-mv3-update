// Improved MV3 Service Worker Implementation
// Based on Chrome's recommended patterns and community solutions for service worker reliability

// Import modules statically (required for service workers)
import spacesService from './spacesService.js';
import { utils } from './utils.js';
import { dbService } from './dbService.js';

// State management with proper persistence
let isInitialized = false;
let initializationPromise = null;
let lastActivityTime = Date.now();
let heartbeatInterval = null;
let activityCheckInterval = null;

// Window tracking for internal spaces windows
let spacesOpenWindowId = false;
let spacesPopupWindowId = false;

// Configuration
const CONFIG = {
    HEARTBEAT_INTERVAL: 25000, // 25 seconds - more frequent than before
    ACTIVITY_CHECK_INTERVAL: 30000, // 30 seconds
    MAX_INACTIVE_TIME: 120000, // 2 minutes - shorter than before
    INITIALIZATION_TIMEOUT: 10000, // 10 seconds
    MAX_RETRY_ATTEMPTS: 3
};

// Enhanced activity tracking
function updateActivity() {
    lastActivityTime = Date.now();
    // Persist activity time to storage for recovery
    chrome.storage.local.set({ 
        lastActivityTime: lastActivityTime,
        serviceWorkerActive: true
    }).catch(err => console.warn('Failed to persist activity:', err));
}

// Improved inactivity detection
function checkInactivity() {
    const now = Date.now();
    const inactiveTime = now - lastActivityTime;
    
    console.log(`💓 Activity check - inactive for ${inactiveTime}ms`);
    
    if (inactiveTime > CONFIG.MAX_INACTIVE_TIME) {
        console.warn('⚠️ Service worker inactive too long, reinitializing...');
        resetServiceWorker();
    }
}

// Reset service worker state
function resetServiceWorker() {
    console.log('🔄 Resetting service worker state...');
    isInitialized = false;
    initializationPromise = null;
    
    // Clear intervals
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
        activityCheckInterval = null;
    }
    
    // Restart monitoring
    startMonitoring();
}

// Start monitoring intervals
function startMonitoring() {
    // Clear any existing intervals
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (activityCheckInterval) clearInterval(activityCheckInterval);
    
    // Start heartbeat (keeps service worker alive)
    heartbeatInterval = setInterval(() => {
        updateActivity();
        console.log('💓 Service worker heartbeat');
    }, CONFIG.HEARTBEAT_INTERVAL);
    
    // Start activity monitoring
    activityCheckInterval = setInterval(() => {
        checkInactivity();
    }, CONFIG.ACTIVITY_CHECK_INTERVAL);
    
    console.log('📡 Service worker monitoring started');
}

// Stop monitoring
function stopMonitoring() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
        activityCheckInterval = null;
    }
    console.log('📡 Service worker monitoring stopped');
}

// Service worker lifecycle events - IMPROVED PATTERNS
chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Service worker starting up...');
    // Don't initialize immediately - wait for first request
    startMonitoring();
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Service worker installed...', details.reason);
    // Only initialize on fresh install, not updates
    if (details.reason === 'install') {
        startMonitoring();
    } else {
        // For updates, just start monitoring
        startMonitoring();
    }
});

// Handle service worker activation - NON-BLOCKING
self.addEventListener('activate', (event) => {
    console.log('⚡ Service worker activated...');
    // Don't block activation with heavy initialization
    event.waitUntil(Promise.resolve());
});

// Handle service worker termination - SAVE STATE
self.addEventListener('beforeunload', (event) => {
    console.log('💀 Service worker being terminated...');
    stopMonitoring();
    
    // Save critical state
    chrome.storage.local.set({
        serviceWorkerTerminated: true,
        lastTermination: Date.now(),
        wasInitialized: isInitialized
    }).catch(err => console.warn('Failed to save termination state:', err));
});

// Improved lazy initialization with timeout and retry
async function initializeServiceWorker() {
    if (isInitialized) {
        console.log('Service worker already initialized');
        return;
    }
    
    if (initializationPromise) {
        console.log('Service worker initialization in progress...');
        return initializationPromise;
    }
    
    console.log('🚀 Starting service worker initialization...');
    
    initializationPromise = (async () => {
        let attempts = 0;
        
        while (attempts < CONFIG.MAX_RETRY_ATTEMPTS) {
            try {
                attempts++;
                console.log(`Initialization attempt ${attempts}/${CONFIG.MAX_RETRY_ATTEMPTS}`);
                
                // Set timeout for initialization
                const initPromise = performInitialization();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Initialization timeout')), CONFIG.INITIALIZATION_TIMEOUT)
                );
                
                await Promise.race([initPromise, timeoutPromise]);
                
                isInitialized = true;
                console.log('✅ Service worker initialization complete');
                
                // Store initialization state
                await chrome.storage.local.set({ 
                    serviceWorkerInitialized: true,
                    lastInitialized: Date.now(),
                    initializationAttempts: attempts
                });
                
                return;
                
            } catch (error) {
                console.error(`❌ Initialization attempt ${attempts} failed:`, error);
                
                if (attempts >= CONFIG.MAX_RETRY_ATTEMPTS) {
                    console.error('❌ All initialization attempts failed');
                    isInitialized = false;
                    initializationPromise = null;
                    throw error;
                }
                
                // Wait before retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    })();
    
    return initializationPromise;
}

// Separate initialization logic
async function performInitialization() {
    // Initialize core services
    await spacesService.initialiseSpaces();
    spacesService.initialiseTabHistory();
    
    // Set up event listeners
    setupEventListeners(spacesService, utils);
    
    // Restore any saved state
    await restoreState();
}

// Restore state from storage
async function restoreState() {
    try {
        const result = await chrome.storage.local.get([
            'spacesOpenWindowId', 
            'spacesPopupWindowId',
            'lastActivityTime'
        ]);
        
        if (result.spacesOpenWindowId) spacesOpenWindowId = result.spacesOpenWindowId;
        if (result.spacesPopupWindowId) spacesPopupWindowId = result.spacesPopupWindowId;
        if (result.lastActivityTime) lastActivityTime = result.lastActivityTime;
        
        console.log('📦 State restored from storage');
    } catch (error) {
        console.warn('Failed to restore state:', error);
    }
}

// Setup event listeners only after initialization
function setupEventListeners(spacesService, utils) {
    // Tab event listeners
    chrome.tabs.onCreated.addListener(tab => {
        updateActivity();
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        updateSpacesWindow('tabs.onCreated');
    });
    
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        updateActivity();
        if (checkInternalSpacesWindows(removeInfo.windowId, false)) return;
        spacesService.handleTabRemoved(tabId, removeInfo, () => {
            updateSpacesWindow('tabs.onRemoved');
        });
    });
    
    chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
        updateActivity();
        if (checkInternalSpacesWindows(moveInfo.windowId, false)) return;
        spacesService.handleTabMoved(tabId, moveInfo, () => {
            updateSpacesWindow('tabs.onMoved');
        });
    });
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        updateActivity();
        if (checkInternalSpacesWindows(tab.windowId, false)) return;
        spacesService.handleTabUpdated(tab, changeInfo, () => {
            updateSpacesWindow('tabs.onUpdated');
        });
    });
    
    // Window event listeners
    chrome.windows.onRemoved.addListener(windowId => {
        updateActivity();
        if (checkInternalSpacesWindows(windowId, true)) return;
        spacesService.handleWindowRemoved(windowId, true, () => {
            updateSpacesWindow('windows.onRemoved');
        });
    });
    
    chrome.windows.onFocusChanged.addListener(windowId => {
        updateActivity();
        if (windowId === chrome.windows.WINDOW_ID_NONE) return;
        spacesService.handleWindowFocussed(windowId);
    });
    
    // Keyboard shortcuts
    chrome.commands.onCommand.addListener(command => {
        updateActivity();
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
            title: 'Add link to new space',
            contexts: ['link']
        });
    });
    
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        updateActivity();
        if (info.menuItemId === 'spaces-add-link') {
            showSpacesMoveWindow(info.linkUrl);
        }
    });
}

// Enhanced message handling with better error recovery
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action, 'from:', sender.tab?.url || 'service worker');
    
    // Update activity on every message
    updateActivity();
    
    // Handle simple messages that don't need initialization
    if (request.action === 'ping') {
        console.log('🏓 Ping received - service worker status:', { 
            initialized: isInitialized, 
            lastActivity: new Date(lastActivityTime).toISOString(),
            monitoring: !!(heartbeatInterval && activityCheckInterval)
        });
        sendResponse({ 
            status: 'ready', 
            initialized: isInitialized, 
            lastActivity: lastActivityTime,
            monitoring: !!(heartbeatInterval && activityCheckInterval)
        });
        return false;
    }
    
    // For other messages, ensure service worker is initialized
    handleMessageWithInitialization(request, sender, sendResponse);
    return true; // Keep message channel open for async response
});

// Improved message handling with initialization
async function handleMessageWithInitialization(request, sender, sendResponse) {
    try {
        // Check for inactivity and reinitialize if needed
        checkInactivity();
        
        // Ensure service worker is initialized
        if (!isInitialized) {
            console.log('Service worker not initialized, initializing now...');
            await initializeServiceWorker();
        }
        
        // Now handle the actual message
        await handleMessage(request, sender, sendResponse);
        
    } catch (error) {
        console.error('❌ Error handling message:', error);
        
        // If initialization failed, try to reset and reinitialize
        if (!isInitialized) {
            console.log('🔄 Attempting to recover from initialization failure...');
            resetServiceWorker();
            
            try {
                await initializeServiceWorker();
                await handleMessage(request, sender, sendResponse);
            } catch (recoveryError) {
                console.error('❌ Recovery failed:', recoveryError);
                sendResponse({ 
                    error: recoveryError.message,
                    recoveryFailed: true,
                    serviceWorkerState: { isInitialized, monitoring: !!(heartbeatInterval && activityCheckInterval) }
                });
            }
        } else {
            sendResponse({ 
                error: error.message,
                serviceWorkerState: { isInitialized, monitoring: !!(heartbeatInterval && activityCheckInterval) }
            });
        }
    }
}

// Handle specific messages (same as before, but with activity updates)
async function handleMessage(request, sender, sendResponse) {
    // Update activity for all message handling
    updateActivity();
    
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
            return true;
            
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
            
        case 'importSessions':
            if (request.spaces) {
                handleImportSessions(request.spaces, sendResponse);
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

// Utility functions (same as before)
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
    console.log('🔄 Updating spaces window from source:', source);
    
    // Send a message to the Manage Spaces window to refresh its data
    if (spacesOpenWindowId) {
        chrome.tabs.query({ windowId: spacesOpenWindowId }, tabs => {
            if (tabs.length > 0) {
                // Send refresh message to the Manage Spaces window
                chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshSpacesData' }, response => {
                    if (chrome.runtime.lastError) {
                        console.log('Manage Spaces window not ready for refresh:', chrome.runtime.lastError.message);
                    } else {
                        console.log('✅ Manage Spaces window refreshed successfully');
                    }
                });
            }
        });
    }
}

// Handler functions from original service worker
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
    
    // Get session info (module already imported statically)
    const session = spacesService.getSessionByWindowId(activeTab.windowId);
    const name = session ? session.name : '';
    
    let params = `action=${action}&windowId=${activeTab.windowId}&sessionName=${name}`;
    
    // For move action, include the tabId
    if (action === 'move') {
        params += `&tabId=${activeTab.id}`;
    }
    
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
    // Check if the Manage Spaces window is already open
    if (spacesOpenWindowId) {
        chrome.windows.get(spacesOpenWindowId, window => {
            if (chrome.runtime.lastError) {
                // Window doesn't exist anymore, clear the ID and create a new one
                console.log('Manage Spaces window no longer exists, creating new one');
                spacesOpenWindowId = null;
                createSpacesWindow(windowId, editMode);
            } else {
                // Window exists, focus it
                console.log('Focusing existing Manage Spaces window:', spacesOpenWindowId);
                chrome.windows.update(spacesOpenWindowId, { focused: true });
            }
        });
    } else {
        // No window tracked, create a new one
        createSpacesWindow(windowId, editMode);
    }
}

function createSpacesWindow(windowId, editMode) {
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
    
    // Also include currently open unnamed windows
    chrome.windows.getAll({ populate: true }, windows => {
        const openUnnamedWindows = windows
            .filter(window => {
                // Filter out internal extension windows and windows that already have sessions
                return !checkInternalSpacesWindows(window.id, false) && 
                       !spacesService.getSessionByWindowId(window.id);
            })
            .map(window => ({
                sessionId: '', // Use empty string instead of false to avoid "false" string
                windowId: window.id,
                name: false, // This will show as "(unnamed window)" in the renderer
                tabs: window.tabs,
                history: false,
                lastAccess: Date.now() // Put open windows at the top
            }));
        
        // Combine saved sessions and open unnamed windows
        const combinedSpaces = [...openUnnamedWindows, ...allSpaces];
        
        // Sort results by last access
        combinedSpaces.sort((a, b) => {
            if (a.windowId && !b.windowId) return -1;
            if (!a.windowId && b.windowId) return 1;
            return (b.lastAccess || 0) - (a.lastAccess || 0);
        });
        
        callback(combinedSpaces);
    });
}

function requestTabDetail(tabId, callback) {
    // Convert tabId to integer
    const numericTabId = parseInt(tabId, 10);
    chrome.tabs.get(numericTabId, callback);
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
                    
                    // Update the Manage Spaces window if it's open
                    updateSpacesWindow('saveNewSession');
                    
                    callback(result);
                });
            } else {
                callback(result);
            }
        });
    });
}

function handleSwitchToSpace(sessionId, windowId, callback) {
    console.log('=== handleSwitchToSpace called ===');
    console.log('Parameters:', { sessionId, windowId, sessionIdType: typeof sessionId, windowIdType: typeof windowId });
    
    // Check if sessionId is a valid session ID (not empty or 'false')
    if (sessionId && sessionId !== 'false' && sessionId !== '' && sessionId !== 'null') {
        console.log('Processing sessionId:', sessionId);
        const session = spacesService.getSessionBySessionId(sessionId);
        console.log('Session found:', session);
        if (session) {
            console.log('Calling handleLoadSession with session.id:', session.id);
            handleLoadSession(session.id);
        } else {
            console.log('No session found for sessionId:', sessionId);
        }
    } else if (windowId) {
        console.log('Processing windowId:', windowId);
        const numericWindowId = parseInt(windowId, 10);
        console.log('Converting windowId to number:', numericWindowId);
        
        chrome.windows.update(numericWindowId, { focused: true }, (result) => {
            if (chrome.runtime.lastError) {
                console.error('Error focusing window:', chrome.runtime.lastError);
            } else {
                console.log('Successfully focused window:', numericWindowId);
            }
        });
    } else {
        console.log('Neither valid sessionId nor windowId provided');
    }
    
    console.log('Calling callback with true');
    callback(true);
}

function handleMoveTabToSession(tabId, sessionId, callback) {
    console.log('=== handleMoveTabToSession called ===');
    console.log('Parameters:', { tabId, sessionId });
    
    // Convert tabId to integer
    const numericTabId = parseInt(tabId, 10);
    console.log('Converted tabId to number:', numericTabId);
    
    // Get tab details first
    chrome.tabs.get(numericTabId, tab => {
        if (chrome.runtime.lastError) {
            console.error('Error getting tab details:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        
        console.log('Tab details:', tab);
        
        const session = spacesService.getSessionBySessionId(sessionId);
        console.log('Session found:', session);
        
        if (!session) {
            console.log('No session found for sessionId:', sessionId);
            callback(false);
            return;
        }
        
        // If session is currently open, move tab directly to that window
        if (session.windowId) {
            console.log('Moving tab to open session window:', session.windowId);
            moveTabToWindow(tab, session.windowId, callback);
            return;
        }
        
        // If session is not open, remove tab from current window and add to saved session
        console.log('Session not open, removing tab and updating saved session');
        
        // Remove tab from current window
        chrome.tabs.remove(tab.id, () => {
            if (chrome.runtime.lastError) {
                console.error('Error removing tab:', chrome.runtime.lastError);
                callback(false);
                return;
            }
            
            console.log('Tab removed from current window');
            
            // Add tab to saved session in database
            const newTabs = [tab];
            session.tabs = session.tabs.concat(newTabs);
            
            spacesService.updateSessionTabs(session.id, session.tabs, (result) => {
                console.log('Session updated in database:', result);
                callback(result);
            });
        });
    });
}

function moveTabToWindow(tab, windowId, callback) {
    console.log('=== moveTabToWindow called ===');
    console.log('Moving tab:', tab.id, 'to window:', windowId);
    
    chrome.tabs.move(tab.id, { windowId: parseInt(windowId, 10), index: -1 }, (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error moving tab:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        
        console.log('Tab moved successfully:', result);
        
        // Queue window events to update sessions manually
        // (tab move doesn't always trigger tab event listeners)
        spacesService.queueWindowEvent(tab.windowId);
        spacesService.queueWindowEvent(windowId);
        
        callback(true);
    });
}

function handleMoveTabToWindow(tabId, windowId, callback) {
    console.log('=== handleMoveTabToWindow called ===');
    console.log('Parameters:', { tabId, windowId });
    
    // Convert tabId to integer
    const numericTabId = parseInt(tabId, 10);
    console.log('Converted tabId to number:', numericTabId);
    
    // Get tab details first
    chrome.tabs.get(numericTabId, tab => {
        if (chrome.runtime.lastError) {
            console.error('Error getting tab details:', chrome.runtime.lastError);
            callback(false);
            return;
        }
        
        console.log('Tab details:', tab);
        moveTabToWindow(tab, windowId, callback);
    });
}

function handleAddLinkToSession(url, sessionId, callback) {
    console.log('=== handleAddLinkToSession called ===');
    console.log('Parameters:', { url, sessionId });
    
    const session = spacesService.getSessionBySessionId(sessionId);
    console.log('Session found:', session);
    
    if (!session) {
        console.log('No session found for sessionId:', sessionId);
        callback(false);
        return;
    }
    
    // If session is currently open, add link directly to that window
    if (session.windowId) {
        console.log('Adding link to open session window:', session.windowId);
        handleAddLinkToWindow(url, session.windowId, callback);
        return;
    }
    
    // If session is not open, add link to saved session in database
    console.log('Adding link to saved session in database');
    const newTabs = [{ url }];
    session.tabs = session.tabs.concat(newTabs);
    
    spacesService.updateSessionTabs(session.id, session.tabs, (result) => {
        console.log('Session updated in database:', result);
        callback(result);
    });
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
    console.log('🔄 Starting backup restore with', spaces.length, 'spaces');
    
    // Clear existing sessions and restore from backup
    dbService.fetchAllSessions(sessions => {
        console.log('🗑️ Clearing', sessions.length, 'existing sessions');
        sessions.forEach(session => {
            dbService.removeSession(session.id);
        });
        
        // Add restored sessions with proper formatting
        let restoredCount = 0;
        spaces.forEach((space, index) => {
            // Ensure imported space has all required fields
            const formattedSpace = {
                name: space.name || `Imported Session ${index + 1}`,
                tabs: space.tabs || [],
                sessionHash: space.sessionHash || spacesService.generateSessionHash(space.tabs || []),
                lastAccess: space.lastAccess || Date.now(),
                windowId: false, // Imported sessions should not be associated with any window
                history: space.history || [] // Optional history field
            };
            
            console.log('📦 Creating imported session:', formattedSpace.name, 'with', formattedSpace.tabs.length, 'tabs');
            
            dbService.createSession(formattedSpace, (result) => {
                restoredCount++;
                console.log('✅ Restored session', restoredCount, 'of', spaces.length, ':', result ? 'success' : 'failed');
                
                // When all sessions are processed, refresh spacesService and callback
                if (restoredCount === spaces.length) {
                    console.log('🔄 Refreshing spacesService after restore...');
                    dbService.fetchAllSessions(sessions => {
                        spacesService.sessions = sessions;
                        console.log('✅ Backup restore complete. Total sessions:', sessions.length);
                        
                        // Update the Manage Spaces window if it's open
                        updateSpacesWindow('restoreFromBackup');
                        
                        callback(true);
                    });
                }
            });
        });
    });
}

function handleImportSessions(spaces, callback) {
    console.log('📥 Starting session import with', spaces.length, 'spaces');
    
    // Get current sessions to check for duplicates
    dbService.fetchAllSessions(existingSessions => {
        console.log('📊 Found', existingSessions.length, 'existing sessions');
        
        // Add new sessions without deleting existing ones
        let importedCount = 0;
        let skippedCount = 0;
        
        spaces.forEach((space, index) => {
            // Check if session with same name already exists
            const existingSession = existingSessions.find(s => s.name === space.name);
            if (existingSession) {
                console.log('⚠️ Skipping duplicate session:', space.name);
                skippedCount++;
                return;
            }
            
            // Ensure imported space has all required fields
            const formattedSpace = {
                name: space.name || `Imported Session ${index + 1}`,
                tabs: space.tabs || [],
                sessionHash: space.sessionHash || spacesService.generateSessionHash(space.tabs || []),
                lastAccess: space.lastAccess || Date.now(),
                windowId: false, // Imported sessions should not be associated with any window
                history: space.history || [] // Optional history field
            };
            
            console.log('📦 Creating imported session:', formattedSpace.name, 'with', formattedSpace.tabs.length, 'tabs');
            
            dbService.createSession(formattedSpace, (result) => {
                importedCount++;
                console.log('✅ Imported session', importedCount, 'of', spaces.length, ':', result ? 'success' : 'failed');
                
                // When all sessions are processed, refresh spacesService and callback
                if (importedCount + skippedCount === spaces.length) {
                    console.log('🔄 Refreshing spacesService after import...');
                    dbService.fetchAllSessions(sessions => {
                        spacesService.sessions = sessions;
                        console.log('✅ Session import complete. Total sessions:', sessions.length, 'Imported:', importedCount, 'Skipped:', skippedCount);
                        
                        // Update the Manage Spaces window if it's open
                        updateSpacesWindow('importSessions');
                        
                        callback({ success: true, imported: importedCount, skipped: skippedCount, total: sessions.length });
                    });
                }
            });
        });
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
                        
                        // Update the Manage Spaces window if it's open
                        updateSpacesWindow('deleteSession');
                        
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
    
    dbService.createSession(session, (result) => {
        if (result) {
            // Update the Manage Spaces window if it's open
            updateSpacesWindow('addLinkToNewSession');
        }
        callback(result);
    });
}

function handleMoveTabToNewSession(tabId, sessionName, callback) {
    // Convert tabId to integer
    const numericTabId = parseInt(tabId, 10);
    chrome.tabs.get(numericTabId, tab => {
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
                chrome.tabs.remove(numericTabId);
                // Update the Manage Spaces window if it's open
                updateSpacesWindow('moveTabToNewSession');
            }
            callback(result);
        });
    });
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection in service worker:', event.reason);
    updateActivity(); // Keep service worker alive even on errors
});

// Start monitoring immediately
startMonitoring();

console.log('🚀 Improved MV3 service worker loaded with enhanced reliability patterns'); 