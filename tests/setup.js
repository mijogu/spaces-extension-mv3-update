// Jest setup file for Chrome extension testing
const { chrome } = require('jest-chrome');

// Mock Chrome APIs
global.chrome = chrome;

// Mock IndexedDB for testing
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  databases: jest.fn(),
};

global.indexedDB = indexedDB;

// Mock window.location for popup testing
Object.defineProperty(window, 'location', {
  value: {
    href: 'chrome-extension://test/popup.html',
    hash: '',
    reload: jest.fn(),
  },
  writable: true,
});

// Mock document methods
document.getElementById = jest.fn();
document.querySelector = jest.fn();
document.querySelectorAll = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// TODO: Add more comprehensive Chrome API mocks as needed
// TODO: Consider adding test utilities for common extension operations 