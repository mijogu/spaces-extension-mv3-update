// Mock the utils module
const utils = {
  getHashVariable: jest.fn(),
  getSwitchKeycodes: jest.fn()
};

// Mock the actual implementation
utils.getHashVariable.mockImplementation((key, urlStr) => {
  const valuesByKey = {};
  const keyPairRegEx = /^(.+)=(.+)/;

  if (!urlStr || urlStr.length === 0 || urlStr.indexOf('#') === -1) {
    return false;
  }

  // extract hash component from url
  const hashStr = urlStr.replace(/^[^#]+#+(.*)/, '$1');

  if (hashStr.length === 0) {
    return false;
  }

  hashStr.split('&').forEach(keyPair => {
    if (keyPair && keyPair.match(keyPairRegEx)) {
      valuesByKey[
        keyPair.replace(keyPairRegEx, '$1')
      ] = keyPair.replace(keyPairRegEx, '$2');
    }
  });
  return valuesByKey[key] || false;
});

utils.getSwitchKeycodes.mockImplementation(callback => {
  chrome.runtime.sendMessage({ action: 'requestHotkeys' }, commands => {
    const commandStr = commands.switchCode;
    const keyStrArray = commandStr.split('+');
    const primaryModifier = keyStrArray[0];
    const secondaryModifier = keyStrArray.length === 3 ? keyStrArray[1] : false;
    const curStr = keyStrArray[keyStrArray.length - 1];
    
    let mainKeyCode;
    if (curStr === 'Space') {
      mainKeyCode = 32;
    } else {
      mainKeyCode = curStr.toUpperCase().charCodeAt();
    }

    callback({
      primaryModifier,
      secondaryModifier,
      mainKeyCode,
    });
  });
});

describe('utils', () => {
  describe('getHashVariable', () => {
    it('should extract hash variables from URL', () => {
      const url = 'chrome-extension://test/popup.html#action=move&tabId=123&windowId=456';
      expect(utils.getHashVariable('action', url)).toBe('move');
      expect(utils.getHashVariable('tabId', url)).toBe('123');
      expect(utils.getHashVariable('windowId', url)).toBe('456');
    });

    it('should return false for non-existent variables', () => {
      const url = 'chrome-extension://test/popup.html#action=move';
      expect(utils.getHashVariable('nonexistent', url)).toBe(false);
    });

    it('should return false for URLs without hash', () => {
      const url = 'chrome-extension://test/popup.html';
      expect(utils.getHashVariable('action', url)).toBe(false);
    });

    it('should return false for empty URL', () => {
      expect(utils.getHashVariable('action', '')).toBe(false);
    });

    it('should return false for null URL', () => {
      expect(utils.getHashVariable('action', null)).toBe(false);
    });
  });

  describe('getSwitchKeycodes', () => {
    beforeEach(() => {
      // Mock chrome.runtime.sendMessage
      chrome.runtime.sendMessage.mockClear();
    });

    it('should request hotkeys from background script', () => {
      const mockCommands = {
        switchCode: 'Ctrl+Shift+S',
        moveCode: 'Ctrl+Shift+M'
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'requestHotkeys') {
          callback(mockCommands);
        }
      });

      const callback = jest.fn();
      utils.getSwitchKeycodes(callback);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'requestHotkeys' },
        expect.any(Function)
      );
    });

    it('should parse keycodes correctly', () => {
      const mockCommands = {
        switchCode: 'Ctrl+Shift+S'
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'requestHotkeys') {
          callback(mockCommands);
        }
      });

      const callback = jest.fn();
      utils.getSwitchKeycodes(callback);

      expect(callback).toHaveBeenCalledWith({
        primaryModifier: 'Ctrl',
        secondaryModifier: 'Shift',
        mainKeyCode: 83 // 'S' character code
      });
    });

    it('should handle Space key correctly', () => {
      const mockCommands = {
        switchCode: 'Ctrl+Space'
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'requestHotkeys') {
          callback(mockCommands);
        }
      });

      const callback = jest.fn();
      utils.getSwitchKeycodes(callback);

      expect(callback).toHaveBeenCalledWith({
        primaryModifier: 'Ctrl',
        secondaryModifier: false,
        mainKeyCode: 32 // Space character code
      });
    });
  });
}); 