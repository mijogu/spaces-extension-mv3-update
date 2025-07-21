// Service Worker for Spaces Extension - Manifest V3
// Import all background scripts as ES modules
import './db.js';
import './dbService.js';
import './spacesService.js';
import './utils.js';

// Import the main background logic
import './background.js';

// Service worker lifecycle management for MV3
let isInitialized = false;

// Handle service worker startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Service worker starting up...');
    initializeServiceWorker();
});

// Handle service worker installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Service worker installed...');
    initializeServiceWorker();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
    console.log('Service worker activated...');
    event.waitUntil(initializeServiceWorker());
});

// Initialize the service worker
async function initializeServiceWorker() {
    if (isInitialized) {
        console.log('Service worker already initialized');
        return;
    }
    
    try {
        console.log('Initializing service worker...');
        
        // Wait for the background script to initialize
        // The background.js import will handle the actual initialization
        isInitialized = true;
        
        console.log('Service worker initialization complete');
    } catch (error) {
        console.error('Service worker initialization failed:', error);
        isInitialized = false;
    }
}

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in service worker:', event.reason);
    // Don't prevent the default behavior, but log it for debugging
});

// TODO: Consider optimizing module loading and error handling
// TODO: Add service worker lifecycle management for better performance 