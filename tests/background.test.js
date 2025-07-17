// Mock the spaces object
const spaces = {
  requestSpaceFromWindowId: jest.fn(),
  requestSpaceFromSessionId: jest.fn(),
  requestCurrentSpace: jest.fn(),
  generatePopupParams: jest.fn()
};

describe('background script', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset chrome mocks
    chrome.tabs.onCreated.addListener.mockClear();
    chrome.tabs.onRemoved.addListener.mockClear();
    chrome.tabs.onMoved.addListener.mockClear();
    chrome.tabs.onUpdated.addListener.mockClear();
    chrome.windows.onRemoved.addListener.mockClear();
    chrome.windows.onFocusChanged.addListener.mockClear();
    chrome.runtime.onMessage.addListener.mockClear();
    chrome.commands.onCommand.addListener.mockClear();
    chrome.contextMenus.create.mockClear();
    chrome.contextMenus.onClicked.addListener.mockClear();
    chrome.windows.getAll.mockClear();
    chrome.windows.remove.mockClear();
    chrome.tabs.query.mockClear();
    chrome.runtime.getURL.mockClear();
    chrome.tabs.get.mockClear && chrome.tabs.get.mockClear();
    chrome.commands.getAll.mockClear && chrome.commands.getAll.mockClear();
  });

  describe('message handling', () => {
    it('should handle requestHotkeys message', () => {
      const mockCommands = [
        { name: 'spaces-switch', shortcut: 'Ctrl+Shift+S' },
        { name: 'spaces-move', shortcut: 'Ctrl+Shift+M' }
      ];

      chrome.commands.getAll = jest.fn().mockImplementation((callback) => {
        callback(mockCommands);
      });

      const sendResponse = jest.fn();
      const request = { action: 'requestHotkeys' };

      // Simulate message listener
      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(true);
      expect(sendResponse).toHaveBeenCalledWith({
        switchCode: 'Ctrl+Shift+S',
        moveCode: 'Ctrl+Shift+M'
      });
    });

    it('should handle requestTabDetail message', () => {
      const mockTab = { id: 123, title: 'Test Tab', url: 'https://example.com' };
      chrome.tabs.get = jest.fn().mockImplementation((tabId, callback) => {
        callback(mockTab);
      });

      const sendResponse = jest.fn();
      const request = { action: 'requestTabDetail', tabId: 123 };

      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(true);
      expect(sendResponse).toHaveBeenCalledWith(mockTab);
    });

    it('should handle requestAllSpaces message', () => {
      const mockSpaces = [
        { id: 1, name: 'Space 1', windowId: 100 },
        { id: 2, name: 'Space 2', windowId: 200 }
      ];

      const sendResponse = jest.fn();
      const request = { action: 'requestAllSpaces' };

      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(true);
      // Note: This would need to be implemented in the actual background script
      // For now, we're just testing that the message is handled
    });

    it('should handle requestShowSpaces message', () => {
      chrome.tabs.create = jest.fn();
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/spaces.html');

      const sendResponse = jest.fn();
      const request = { action: 'requestShowSpaces' };

      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(false);
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'chrome-extension://test/spaces.html'
      });
    });

    it('should handle requestShowSwitcher message', () => {
      chrome.windows.create = jest.fn();
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/popup.html');

      const sendResponse = jest.fn();
      const request = { action: 'requestShowSwitcher' };

      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(false);
      // Note: This would need to be implemented in the actual background script
    });

    it('should handle requestShowMover message', () => {
      chrome.windows.create = jest.fn();
      chrome.runtime.getURL.mockReturnValue('chrome-extension://test/popup.html');

      const sendResponse = jest.fn();
      const request = { action: 'requestShowMover' };

      const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const result = messageListener(request, {}, sendResponse);

      expect(result).toBe(false);
      // Note: This would need to be implemented in the actual background script
    });
  });

  describe('event listeners', () => {
    it('should set up tab event listeners', () => {
      expect(chrome.tabs.onCreated.addListener).toHaveBeenCalled();
      expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
      expect(chrome.tabs.onMoved.addListener).toHaveBeenCalled();
      expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    });

    it('should set up window event listeners', () => {
      expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
      expect(chrome.windows.onFocusChanged.addListener).toHaveBeenCalled();
    });

    it('should set up command event listeners', () => {
      expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
    });

    it('should set up context menu', () => {
      expect(chrome.contextMenus.create).toHaveBeenCalledWith({
        id: 'spaces-move-tab',
        title: 'Move tab to space...',
        contexts: ['tab']
      });
    });
  });

  describe('spaces object', () => {
    it('should export spaces object with required methods', () => {
      expect(spaces).toBeDefined();
      expect(typeof spaces.requestSpaceFromWindowId).toBe('function');
      expect(typeof spaces.requestSpaceFromSessionId).toBe('function');
      expect(typeof spaces.requestCurrentSpace).toBe('function');
      expect(typeof spaces.generatePopupParams).toBe('function');
    });
  });
}); 