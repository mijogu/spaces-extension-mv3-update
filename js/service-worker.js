// Service Worker for Spaces Extension - Manifest V3
// Import all background scripts as ES modules
import './db.js';
import './dbService.js';
import './spacesService.js';
import './utils.js';

// Import the main background logic
import './background.js';

// TODO: Consider optimizing module loading and error handling
// TODO: Add service worker lifecycle management for better performance 