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
                  }, resolve);
              })
            : new Promise(resolve => {
                  chrome.runtime.sendMessage({
                      action: 'requestSpaceDetail'
                  }, resolve);
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
        // Request hotkeys from service worker
        chrome.runtime.sendMessage({ action: 'requestHotkeys' }, hotkeys => {
            document.querySelector(
                '#switcherLink .hotkey'
            ).innerHTML = hotkeys.switchCode ? hotkeys.switchCode : NO_HOTKEY;
            document.querySelector(
                '#moverLink .hotkey'
            ).innerHTML = hotkeys.moveCode ? hotkeys.moveCode : NO_HOTKEY;
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

        document
            .querySelector('#allSpacesLink .optionText')
            .addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    action: 'requestShowSpaces',
                });
                window.close();
            });
        document
            .querySelector('#switcherLink .optionText')
            .addEventListener('click', () => {
                // Request popup params from service worker
                chrome.runtime.sendMessage({
                    action: 'generatePopupParams',
                    actionType: 'switch'
                }, params => {
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                });
            });
        document
            .querySelector('#moverLink .optionText')
            .addEventListener('click', () => {
                // Request popup params from service worker
                chrome.runtime.sendMessage({
                    action: 'generatePopupParams',
                    actionType: 'move'
                }, params => {
                    if (!params) return;
                    window.location.hash = params;
                    window.location.reload();
                });
            });
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
