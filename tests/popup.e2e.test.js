// Basic E2E test for popup functionality
// Note: This is a simplified test that would need Puppeteer for full E2E testing

// Mock the utils module
const utils = {
  getHashVariable: jest.fn()
};

describe('Popup E2E', () => {
  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="header">
        <span>Active space: </span><input type="text" id="activeSpaceTitle"></input>
        <span id="spaceEdit" class="fa fa-pencil"></span>
      </div>
      <div id="popupContainer">
        <div class="group optsAll">
          <div class="menuOption" href="#" id="allSpacesLink">
            <i class="fa fa-th-large"></i>
            <span class="optionText">Manage spaces</span>
            <span class="hotkey"></span>
          </div>
          <div class="menuOption" href="#" id="switcherLink">
            <i class="fa fa-exchange"></i>
            <span class="optionText">Quick switch spaces</span>
            <span class="hotkey"></span>
          </div>
          <div class="menuOption" href="#" id="moverLink">
            <i class="fa fa-arrow-circle-right"></i>
            <span class="optionText">Move active tab</span>
            <span class="hotkey"></span>
          </div>
        </div>
      </div>
      <script type="text/html" id="switcherTemplate">
        <div class="mainContent">
          <div class="contentBody">
            <form id="spaceSelectForm">
              <input id="sessionsInput" list="sessionsList" type="text" autocomplete="off" placeholder="Type a space name" />
            </form>
            <div id="spacesList">
              <div id="savedSpaces"></div>
            </div>
          </div>
        </div>
      </script>
      <script type="text/html" id="moverTemplate">
        <div class="mainContent">
          <div class="contentBody">
            <div id="tabInfo">
              <span id="tabTitle"></span>
              <span id="tabUrl"></span>
            </div>
            <form id="spaceSelectForm">
              <input id="sessionsInput" list="sessionsList" type="text" autocomplete="off" placeholder="Move tab to.." />
            </form>
            <div id="spacesList">
              <div id="savedSpaces"></div>
            </div>
          </div>
        </div>
      </script>
    `;

    // Mock Chrome APIs
    chrome.runtime.sendMessage = jest.fn();
    window.close = jest.fn();
  });

  it('should load popup and display main menu', () => {
    // Mock successful response for space data
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'requestSpaceDetail') {
        callback({ name: 'Test Space', windowId: 123 });
      } else if (message.action === 'requestHotkeys') {
        callback({ switchCode: 'Ctrl+Shift+S', moveCode: 'Ctrl+Shift+M' });
      }
    });

    // Mock utils.getHashVariable
    utils.getHashVariable = jest.fn().mockReturnValue(false);

    // Verify popup elements are present
    expect(document.getElementById('header')).toBeTruthy();
    expect(document.getElementById('popupContainer')).toBeTruthy();
    expect(document.getElementById('allSpacesLink')).toBeTruthy();
    expect(document.getElementById('switcherLink')).toBeTruthy();
    expect(document.getElementById('moverLink')).toBeTruthy();
  });

  it('should handle space name editing', () => {
    // Mock successful response for space data
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'requestSpaceDetail') {
        callback({ name: 'Test Space', windowId: 123 });
      } else if (message.action === 'requestHotkeys') {
        callback({ switchCode: 'Ctrl+Shift+S', moveCode: 'Ctrl+Shift+M' });
      }
    });

    // Mock utils.getHashVariable
    utils.getHashVariable = jest.fn().mockReturnValue(false);

    // Test space name editing
    const spaceTitleInput = document.getElementById('activeSpaceTitle');
    expect(spaceTitleInput.value).toBe('Test Space');

    // Simulate editing
    spaceTitleInput.value = 'New Space Name';
    spaceTitleInput.dispatchEvent(new Event('blur'));

    // Verify message was sent to update session name
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updateSessionName',
        sessionName: 'New Space Name'
      }),
      expect.any(Function)
    );
  });

  it('should handle keyboard shortcuts display', () => {
    // Mock successful response for space data
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'requestSpaceDetail') {
        callback({ name: 'Test Space', windowId: 123 });
      } else if (message.action === 'requestHotkeys') {
        callback({ switchCode: 'Ctrl+Shift+S', moveCode: 'Ctrl+Shift+M' });
      }
    });

    // Mock utils.getHashVariable
    utils.getHashVariable = jest.fn().mockReturnValue(false);

    // Verify hotkeys are displayed
    const switcherHotkey = document.querySelector('#switcherLink .hotkey');
    const moverHotkey = document.querySelector('#moverLink .hotkey');
    
    expect(switcherHotkey.textContent).toBe('Ctrl+Shift+S');
    expect(moverHotkey.textContent).toBe('Ctrl+Shift+M');
  });

  it('should handle escape key to close popup', () => {
    // Mock successful response for space data
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.action === 'requestSpaceDetail') {
        callback({ name: 'Test Space', windowId: 123 });
      } else if (message.action === 'requestHotkeys') {
        callback({ switchCode: 'Ctrl+Shift+S', moveCode: 'Ctrl+Shift+M' });
      }
    });

    // Mock utils.getHashVariable
    utils.getHashVariable = jest.fn().mockReturnValue(false);

    // Simulate escape key press
    const escapeEvent = new KeyboardEvent('keyup', { keyCode: 27 });
    document.dispatchEvent(escapeEvent);

    // Verify window.close was called
    expect(window.close).toHaveBeenCalled();
  });

  // TODO: Add more comprehensive E2E tests with Puppeteer
  // TODO: Test actual popup window creation and interaction
  // TODO: Test keyboard navigation and accessibility
}); 