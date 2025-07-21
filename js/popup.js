/* global chrome spacesRenderer */

// Import utils for hash variable parsing
import { utils } from './utils.js';

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
        
        // Add service worker connection check
        try {
            // Test service worker connection
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'ping' }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
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

        // Request space data from service worker
        const requestSpacePromise = globalWindowId
            ? new Promise(resolve => {
                  chrome.runtime.sendMessage({
                      action: 'requestSpaceDetail',
                      windowId: parseInt(globalWindowId, 10)
                  }, response => {
                      if (chrome.runtime.lastError) {
                          console.log('Service worker connection error:', chrome.runtime.lastError.message);
                          resolve(null);
                      } else {
                          resolve(response);
                      }
                  });
              })
            : new Promise(resolve => {
                  chrome.runtime.sendMessage({
                      action: 'requestSpaceDetail'
                  }, response => {
                      if (chrome.runtime.lastError) {
                          console.log('Service worker connection error:', chrome.runtime.lastError.message);
                          resolve(null);
                      } else {
                          resolve(response);
                      }
                  });
              });

        requestSpacePromise.then(space => {
            globalCurrentSpace = space;
            renderCommon();
            routeView(action);
        });
    });

    function routeView(action) {
        if (action === 'move') {
            renderMoveCard();
        } else if (action === 'switch') {
            renderSwitchCard();
        } else {
            renderMainCard();
        }
    }

    /*
     * COMMON
     */

    function renderCommon() {
        document.getElementById(
            'activeSpaceTitle'
        ).value = globalCurrentSpace.name
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

    function handleCloseAction() {
        const opener = utils.getHashVariable('opener', window.location.href);
        if (opener && opener === 'bg') {
            chrome.runtime.sendMessage({
                action: 'requestClose',
            });
        } else {
            window.close();
        }
    }

    /*
     * MAIN POPUP VIEW
     */

    function renderMainCard() {
        console.log('renderMainCard called');
        
        // Request hotkeys from service worker
        chrome.runtime.sendMessage({ action: 'requestHotkeys' }, hotkeys => {
            if (chrome.runtime.lastError) {
                console.log('Hotkeys request error:', chrome.runtime.lastError.message);
                return;
            }
            console.log('Hotkeys received:', hotkeys);
            const switcherHotkey = document.querySelector('#switcherLink .hotkey');
            const moverHotkey = document.querySelector('#moverLink .hotkey');
            
            if (switcherHotkey) {
                switcherHotkey.innerHTML = hotkeys.switchCode ? hotkeys.switchCode : NO_HOTKEY;
            }
            if (moverHotkey) {
                moverHotkey.innerHTML = hotkeys.moveCode ? hotkeys.moveCode : NO_HOTKEY;
            }
        });

        const hotkeyEls = document.querySelectorAll('.hotkey');
        for (let i = 0; i < hotkeyEls.length; i += 1) {
            hotkeyEls[i].addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    action: 'requestShowKeyboardShortcuts',
                });
                window.close();
            });
        }

        const allSpacesLink = document.querySelector('#allSpacesLink .optionText');
        console.log('allSpacesLink element:', allSpacesLink);
        if (allSpacesLink) {
            allSpacesLink.addEventListener('click', () => {
                console.log('allSpacesLink clicked');
                chrome.runtime.sendMessage({
                    action: 'requestShowSpaces',
                }, response => {
                    if (chrome.runtime.lastError) {
                        console.log('requestShowSpaces error:', chrome.runtime.lastError.message);
                    }
                });
                window.close();
            });
        }
        const switcherLink = document.querySelector('#switcherLink .optionText');
        console.log('switcherLink element:', switcherLink);
        if (switcherLink) {
            switcherLink.addEventListener('click', () => {
                console.log('switcherLink clicked');
                // Request popup params from service worker
                chrome.runtime.sendMessage({
                    action: 'generatePopupParams',
                    actionType: 'switch'
                }, params => {
                    if (chrome.runtime.lastError) {
                        console.log('generatePopupParams error:', chrome.runtime.lastError.message);
                        return;
                    }
                    console.log('generatePopupParams response:', params);
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                });
            });
        }
        const moverLink = document.querySelector('#moverLink .optionText');
        console.log('moverLink element:', moverLink);
        if (moverLink) {
            moverLink.addEventListener('click', () => {
                console.log('moverLink clicked');
                // Request popup params from service worker
                chrome.runtime.sendMessage({
                    action: 'generatePopupParams',
                    actionType: 'move'
                }, params => {
                    if (chrome.runtime.lastError) {
                        console.log('generatePopupParams error:', chrome.runtime.lastError.message);
                        return;
                    }
                    console.log('generatePopupParams response:', params);
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                });
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

    function handleNameSave() {
        const inputEl = document.getElementById('activeSpaceTitle');
        const newName = inputEl.value;

        if (
            newName === UNSAVED_SESSION ||
            newName === globalCurrentSpace.name
        ) {
            return;
        }

        if (globalCurrentSpace.sessionId) {
            chrome.runtime.sendMessage(
                {
                    action: 'updateSessionName',
                    sessionName: newName,
                    sessionId: globalCurrentSpace.sessionId,
                },
                () => {}
            );
        } else {
            chrome.runtime.sendMessage(
                {
                    action: 'saveNewSession',
                    sessionName: newName,
                    windowId: globalCurrentSpace.windowId,
                },
                () => {}
            );
        }
    }

    /*
     * SWITCHER VIEW
     */

    function renderSwitchCard() {
        document.getElementById(
            'popupContainer'
        ).innerHTML = document.getElementById('switcherTemplate').innerHTML;
        chrome.runtime.sendMessage({ action: 'requestAllSpaces' }, spaces => {
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
        });
    }

    function getSelectedSpace() {
        return document.querySelector('.space.selected');
    }

    function handleSwitchAction(selectedSpaceEl) {
        chrome.runtime.sendMessage({
            action: 'switchToSpace',
            sessionId: selectedSpaceEl.getAttribute('data-sessionId'),
            windowId: selectedSpaceEl.getAttribute('data-windowId'),
        });
        window.close();
    }

    /*
     * MOVE VIEW
     */

    function renderMoveCard() {
        document.getElementById(
            'popupContainer'
        ).innerHTML = document.getElementById('moverTemplate').innerHTML;

        updateTabDetails();

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

    function updateTabDetails() {
        if (globalTabId) {
            chrome.runtime.sendMessage(
                { action: 'requestTabDetail', tabId: globalTabId },
                tab => {
                    if (tab) {
                        document.getElementById('tabTitle').innerHTML = tab.title;
                        document.getElementById('tabUrl').innerHTML = tab.url;
                    }
                }
            );
        }

        chrome.runtime.sendMessage({ action: 'requestAllSpaces' }, spaces => {
            spacesRenderer.initialise(8, true);
            spacesRenderer.renderSpaces(spaces);
        });
    }

    function handleSelectAction(selectedSpaceEl) {
        if (!selectedSpaceEl) {
            selectedSpaceEl = getSelectedSpace();
        }

        if (!selectedSpaceEl) {
            return;
        }

        const sessionId = selectedSpaceEl.getAttribute('data-sessionId');
        const windowId = selectedSpaceEl.getAttribute('data-windowId');

        if (globalTabId) {
            if (sessionId) {
                chrome.runtime.sendMessage({
                    action: 'moveTabToSession',
                    tabId: globalTabId,
                    sessionId: sessionId,
                });
            } else if (windowId) {
                chrome.runtime.sendMessage({
                    action: 'moveTabToWindow',
                    tabId: globalTabId,
                    windowId: windowId,
                });
            }
        } else if (globalUrl) {
            if (sessionId) {
                chrome.runtime.sendMessage({
                    action: 'addLinkToSession',
                    url: globalUrl,
                    sessionId: sessionId,
                });
            } else if (windowId) {
                chrome.runtime.sendMessage({
                    action: 'addLinkToWindow',
                    url: globalUrl,
                    windowId: windowId,
                });
            }
        }

        window.close();
    }

    function handleEditSpace() {
        chrome.runtime.sendMessage({
            action: 'requestShowSpaces',
            windowId: globalCurrentSpace.windowId,
            edit: true,
        });
        window.close();
    }

    // TODO: Add proper error handling for message communication
    // TODO: Consider implementing retry logic for failed message requests
    // TODO: Add loading states for better user experience
})();
