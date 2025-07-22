// Service Worker Client Utility for MV3
// Provides proper message sending with service worker wake-up handling

class ServiceWorkerClient {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 100; // Start with 100ms
        this.maxRetryDelay = 2000; // Max 2 seconds
    }

    // Send message to service worker with proper wake-up handling
    async sendMessage(message, timeoutMs = 5000) {
        let retryCount = 0;
        let currentDelay = this.retryDelay;

        while (retryCount < this.maxRetries) {
            try {
                console.log(`Sending message to service worker (attempt ${retryCount + 1}):`, message.action);
                
                const response = await this._sendMessageWithTimeout(message, timeoutMs);
                
                // Check if service worker responded with initialization status
                if (response && response.initialized === false) {
                    console.log('Service worker not initialized, waiting for initialization...');
                    await this._wait(currentDelay);
                    retryCount++;
                    currentDelay = Math.min(currentDelay * 2, this.maxRetryDelay);
                    continue;
                }
                
                return response;
                
            } catch (error) {
                console.log(`Message send attempt ${retryCount + 1} failed:`, error.message);
                retryCount++;
                
                if (retryCount >= this.maxRetries) {
                    throw new Error(`Failed to send message after ${this.maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry with exponential backoff
                await this._wait(currentDelay);
                currentDelay = Math.min(currentDelay * 2, this.maxRetryDelay);
            }
        }
    }

    // Send message with timeout
    _sendMessageWithTimeout(message, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, timeoutMs);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Wait utility
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if service worker is ready
    async isReady() {
        try {
            const response = await this.sendMessage({ action: 'ping' }, 2000);
            return response && response.status === 'ready';
        } catch (error) {
            console.log('Service worker not ready:', error.message);
            return false;
        }
    }

    // Wait for service worker to be ready
    async waitForReady(maxWaitMs = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            if (await this.isReady()) {
                return true;
            }
            await this._wait(500);
        }
        
        throw new Error('Service worker not ready within timeout');
    }

    // Convenience methods for common operations
    async getHotkeys() {
        return this.sendMessage({ action: 'requestHotkeys' });
    }

    async generatePopupParams(actionType, tabUrl) {
        return this.sendMessage({ 
            action: 'generatePopupParams',
            actionType,
            tabUrl
        });
    }

    async getSpaceDetail(windowId, sessionId) {
        return this.sendMessage({
            action: 'requestSpaceDetail',
            windowId,
            sessionId
        });
    }

    async showSpaces(windowId, editMode) {
        return this.sendMessage({
            action: 'requestShowSpaces',
            windowId,
            edit: editMode
        });
    }

    async showSwitcher() {
        return this.sendMessage({ action: 'requestShowSwitcher' });
    }

    async showMover() {
        return this.sendMessage({ action: 'requestShowMover' });
    }
}

// Create global instance
const serviceWorkerClient = new ServiceWorkerClient();

// Export for use in other modules
export { ServiceWorkerClient, serviceWorkerClient }; 