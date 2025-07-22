/* global chrome */

// Import utils for hash variable parsing
import { utils } from './utils.js';
import { serviceWorkerClient } from './service-worker-client.js';
import { spacesRenderer } from './spacesRenderer.js';

(() => {
    const UNSAVED_SESSION = '(unnamed window)';
    const NO_HOTKEY = 'no hotkey set';

    const nodes = {};
    let globalCurrentSpace;
    let globalTabId;
    let globalUrl;
    let globalWindowId;
    let globalSessionName;

    /*
     * POPUP INIT
     */

    document.addEventListener('DOMContentLoaded', async () => {
        // BREAKING_CHANGE: chrome.extension.getBackgroundPage() is not supported in MV3
        // Using chrome.runtime.sendMessage instead to communicate with service worker
        
        // Add service worker connection check with retry logic
        try {
            console.log('Checking service worker readiness...');
            await serviceWorkerClient.waitForReady(10000); // Wait up to 10 seconds
            console.log('Service worker is ready');
        } catch (error) {
            console.error('Service worker not ready:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Extension is initializing, please try again in a moment.';
            errorDiv.style.cssText = 'color: red; padding: 10px; text-align: center;';
            document.body.insertBefore(errorDiv, document.body.firstChild);
            return;
        }
        const url = utils.getHashVariable('url', window.location.href);
        globalUrl = url !== '' ? decodeURIComponent(url) : false;
        const windowId = utils.getHashVariable(
            'windowId',
            window.location.href
        );
        globalWindowId = windowId !== '' ? windowId : false;
        globalTabId = utils.getHashVariable('tabId', window.location.href);
        const sessionName = utils.getHashVariable(
            'sessionName',
            window.location.href
        );
        globalSessionName =
            sessionName && sessionName !== 'false' ? sessionName : false;
        const action = utils.getHashVariable('action', window.location.href);

        // Request space data from service worker with robust error handling
        let space = null;
        try {
            if (globalWindowId) {
                space = await serviceWorkerClient.sendMessage({
                    action: 'requestSpaceDetail',
                    windowId: parseInt(globalWindowId, 10)
                }, 5000); // 5 second timeout
            } else {
                space = await serviceWorkerClient.sendMessage({
                    action: 'requestSpaceDetail'
                }, 5000); // 5 second timeout
            }
        } catch (error) {
            console.error('Failed to get space details:', error);
            space = null;
        }

        globalCurrentSpace = space;
        console.log('Space details received:', globalCurrentSpace);
        renderCommon();
        routeView(action);
    });

    async function routeView(action) {
        if (action === 'move') {
            await renderMoveCard();
        } else if (action === 'switch') {
            await renderSwitchCard();
        } else {
            await renderMainCard();
        }
    }

    /*
     * COMMON
     */

    function renderCommon() {
        document.getElementById(
            'activeSpaceTitle'
        ).value = globalCurrentSpace && globalCurrentSpace.name
            ? globalCurrentSpace.name
            : UNSAVED_SESSION;

        document.querySelector('body').onkeyup = e => {
            // listen for escape key
            if (e.keyCode === 27) {
                handleCloseAction();
                // } else if (e.keyCode === 13) {
                //     handleNameSave();
            }
        };
        document.getElementById('spaceEdit').addEventListener('click', () => {
            handleNameEdit();
        });
        document
            .getElementById('activeSpaceTitle')
            .addEventListener('focus', () => {
                handleNameEdit();
            });
        document.getElementById('activeSpaceTitle').onkeyup = e => {
            // listen for enter key
            if (e.keyCode === 13) {
                document.getElementById('activeSpaceTitle').blur();
            }
        };
        document
            .getElementById('activeSpaceTitle')
            .addEventListener('blur', () => {
                handleNameSave();
            });
    }

    async function handleCloseAction() {
        const opener = utils.getHashVariable('opener', window.location.href);
        if (opener && opener === 'bg') {
            try {
                await serviceWorkerClient.sendMessage({
                    action: 'requestClose',
                }, 2000);
            } catch (error) {
                console.error('Failed to send close request:', error);
            }
        } else {
            window.close();
        }
    }

    /*
     * MAIN POPUP VIEW
     */

    async function renderMainCard() {
        console.log('renderMainCard called');
        
        // Request hotkeys from service worker with robust error handling
        try {
            const hotkeys = await serviceWorkerClient.sendMessage({ action: 'requestHotkeys' }, 3000);
            console.log('Hotkeys received:', hotkeys);
            
            const switcherHotkey = document.querySelector('#switcherLink .hotkey');
            const moverHotkey = document.querySelector('#moverLink .hotkey');
            
            if (switcherHotkey) {
                switcherHotkey.innerHTML = hotkeys.switchCode ? hotkeys.switchCode : NO_HOTKEY;
            }
            if (moverHotkey) {
                moverHotkey.innerHTML = hotkeys.moveCode ? hotkeys.moveCode : NO_HOTKEY;
            }
        } catch (error) {
            console.error('Failed to get hotkeys:', error);
            // Set default values on error
            const switcherHotkey = document.querySelector('#switcherLink .hotkey');
            const moverHotkey = document.querySelector('#moverLink .hotkey');
            
            if (switcherHotkey) {
                switcherHotkey.innerHTML = NO_HOTKEY;
            }
            if (moverHotkey) {
                moverHotkey.innerHTML = NO_HOTKEY;
            }
        }

        const hotkeyEls = document.querySelectorAll('.hotkey');
        for (let i = 0; i < hotkeyEls.length; i += 1) {
            hotkeyEls[i].addEventListener('click', async () => {
                try {
                    await serviceWorkerClient.sendMessage({
                        action: 'requestShowKeyboardShortcuts',
                    }, 2000);
                } catch (error) {
                    console.error('Failed to show keyboard shortcuts:', error);
                }
                window.close();
            });
        }

        const allSpacesLink = document.querySelector('#allSpacesLink .optionText');
        console.log('allSpacesLink element:', allSpacesLink);
        if (allSpacesLink) {
            allSpacesLink.addEventListener('click', async () => {
                console.log('allSpacesLink clicked');
                try {
                    await serviceWorkerClient.sendMessage({
                        action: 'requestShowSpaces',
                    }, 3000);
                } catch (error) {
                    console.error('Failed to show spaces:', error);
                }
                window.close();
            });
        }
        const switcherLink = document.querySelector('#switcherLink .optionText');
        console.log('switcherLink element:', switcherLink);
        if (switcherLink) {
            switcherLink.addEventListener('click', async () => {
                console.log('switcherLink clicked');
                // Request popup params from service worker
                try {
                    const params = await serviceWorkerClient.sendMessage({
                        action: 'generatePopupParams',
                        actionType: 'switch'
                    }, 3000);
                    
                    console.log('generatePopupParams response:', params);
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to generate popup params for switch:', error);
                }
            });
        }
        const moverLink = document.querySelector('#moverLink .optionText');
        console.log('moverLink element:', moverLink);
        if (moverLink) {
            moverLink.addEventListener('click', async () => {
                console.log('moverLink clicked');
                // Request popup params from service worker
                try {
                    const params = await serviceWorkerClient.sendMessage({
                        action: 'generatePopupParams',
                        actionType: 'move'
                    }, 3000);
                    
                    console.log('generatePopupParams response:', params);
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to generate popup params for move:', error);
                }
            });
        }
    }

    function handleNameEdit() {
        const inputEl = document.getElementById('activeSpaceTitle');
        inputEl.focus();
        if (inputEl.value === UNSAVED_SESSION) {
            inputEl.value = '';
        }
    }

    async function handleNameSave() {
        const inputEl = document.getElementById('activeSpaceTitle');
        const newName = inputEl.value;

        if (
            newName === UNSAVED_SESSION ||
            (globalCurrentSpace && newName === globalCurrentSpace.name)
        ) {
            return;
        }

        try {
            if (globalCurrentSpace && globalCurrentSpace.sessionId) {
                await serviceWorkerClient.sendMessage(
                    {
                        action: 'updateSessionName',
                        sessionName: newName,
                        sessionId: globalCurrentSpace.sessionId,
                    },
                    5000
                );
            } else if (globalCurrentSpace && globalCurrentSpace.windowId) {
                await serviceWorkerClient.sendMessage(
                    {
                        action: 'saveNewSession',
                        sessionName: newName,
                        windowId: globalCurrentSpace.windowId,
                    },
                    5000
                );
            } else {
                console.warn('No valid session or window ID available for saving');
            }
        } catch (error) {
            console.error('Failed to save session name:', error);
        }
    }

    /*
     * SWITCHER VIEW
     */

    async function renderSwitchCard() {
        document.getElementById(
            'popupContainer'
        ).innerHTML = document.getElementById('switcherTemplate').innerHTML;
        
        try {
            const spaces = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' }, 5000);
            spacesRenderer.initialise(8, true);
            spacesRenderer.renderSpaces(spaces);

            document.getElementById('spaceSelectForm').onsubmit = e => {
                e.preventDefault();
                handleSwitchAction(getSelectedSpace());
            };

            const allSpaceEls = document.querySelectorAll('.space');
            Array.prototype.forEach.call(allSpaceEls, el => {
                // eslint-disable-next-line no-param-reassign
                el.onclick = () => {
                    handleSwitchAction(el);
                };
            });
        } catch (error) {
            console.error('Failed to get spaces for switch view:', error);
        }
    }

    function getSelectedSpace() {
        return document.querySelector('.space.selected');
    }

    async function handleSwitchAction(selectedSpaceEl) {
        try {
            await serviceWorkerClient.sendMessage({
                action: 'switchToSpace',
                sessionId: selectedSpaceEl.getAttribute('data-sessionId'),
                windowId: selectedSpaceEl.getAttribute('data-windowId'),
            }, 3000);
        } catch (error) {
            console.error('Failed to switch to space:', error);
        }
        window.close();
    }

    /*
     * MOVE VIEW
     */

    async function renderMoveCard() {
        document.getElementById(
            'popupContainer'
        ).innerHTML = document.getElementById('moverTemplate').innerHTML;

        await updateTabDetails();

        document.getElementById('spaceSelectForm').onsubmit = e => {
            e.preventDefault();
            handleSelectAction();
        };

        const allSpaceEls = document.querySelectorAll('.space');
        Array.prototype.forEach.call(allSpaceEls, el => {
            // eslint-disable-next-line no-param-reassign
            el.onclick = () => {
                handleSelectAction(el);
            };
        });
    }

    async function updateTabDetails() {
        if (globalTabId) {
            try {
                const tab = await serviceWorkerClient.sendMessage(
                    { action: 'requestTabDetail', tabId: globalTabId },
                    3000
                );
                if (tab) {
                    document.getElementById('tabTitle').innerHTML = tab.title;
                    document.getElementById('tabUrl').innerHTML = tab.url;
                }
            } catch (error) {
                console.error('Failed to get tab details:', error);
            }
        }

        try {
            const spaces = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' }, 5000);
            spacesRenderer.initialise(8, true);
            spacesRenderer.renderSpaces(spaces);
        } catch (error) {
            console.error('Failed to get spaces for move view:', error);
        }
    }

    async function handleSelectAction(selectedSpaceEl) {
        if (!selectedSpaceEl) {
            selectedSpaceEl = getSelectedSpace();
        }

        if (!selectedSpaceEl) {
            return;
        }

        const sessionId = selectedSpaceEl.getAttribute('data-sessionId');
        const windowId = selectedSpaceEl.getAttribute('data-windowId');

        try {
            if (globalTabId) {
                if (sessionId) {
                    await serviceWorkerClient.sendMessage({
                        action: 'moveTabToSession',
                        tabId: globalTabId,
                        sessionId: sessionId,
                    }, 3000);
                } else if (windowId) {
                    await serviceWorkerClient.sendMessage({
                        action: 'moveTabToWindow',
                        tabId: globalTabId,
                        windowId: windowId,
                    }, 3000);
                }
            } else if (globalUrl) {
                if (sessionId) {
                    await serviceWorkerClient.sendMessage({
                        action: 'addLinkToSession',
                        url: globalUrl,
                        sessionId: sessionId,
                    }, 3000);
                } else if (windowId) {
                    await serviceWorkerClient.sendMessage({
                        action: 'addLinkToWindow',
                        url: globalUrl,
                        windowId: windowId,
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Failed to perform select action:', error);
        }

        window.close();
    }

    async function handleEditSpace() {
        if (!globalCurrentSpace || !globalCurrentSpace.windowId) {
            console.warn('No valid window ID available for editing');
            window.close();
            return;
        }
        
        try {
            await serviceWorkerClient.sendMessage({
                action: 'requestShowSpaces',
                windowId: globalCurrentSpace.windowId,
                edit: true,
            }, 3000);
        } catch (error) {
            console.error('Failed to show spaces for editing:', error);
        }
        window.close();
    }

    // ✅ MV3 Service Worker Integration Complete
    // ✅ Robust error handling with serviceWorkerClient
    // ✅ Retry logic and timeout handling implemented
    // ✅ Async/await patterns for better error handling
    // ✅ Service worker readiness checks implemented
})();
