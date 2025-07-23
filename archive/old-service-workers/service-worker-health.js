// Service Worker Health Monitor for MV3
// Monitors service worker status and provides recovery mechanisms

class ServiceWorkerHealthMonitor {
    constructor() {
        this.checkInterval = 30000; // Check every 30 seconds
        this.maxInactiveTime = 300000; // 5 minutes
        this.lastCheck = Date.now();
        this.isMonitoring = false;
    }

    // Start monitoring service worker health
    startMonitoring() {
        if (this.isMonitoring) return;
        
        console.log('🔍 Starting service worker health monitoring...');
        this.isMonitoring = true;
        this.monitorHealth();
    }

    // Stop monitoring
    stopMonitoring() {
        console.log('🛑 Stopping service worker health monitoring...');
        this.isMonitoring = false;
    }

    // Monitor service worker health
    async monitorHealth() {
        while (this.isMonitoring) {
            try {
                await this.checkServiceWorkerHealth();
                await this.wait(this.checkInterval);
            } catch (error) {
                console.error('❌ Health monitoring error:', error);
                await this.wait(5000); // Wait 5 seconds on error
            }
        }
    }

    // Check if service worker is healthy
    async checkServiceWorkerHealth() {
        try {
            const response = await this.pingServiceWorker();
            const now = Date.now();
            
            if (response && response.lastActivity) {
                const inactiveTime = now - response.lastActivity;
                console.log(`💓 Service worker health check - inactive for ${inactiveTime}ms`);
                
                if (inactiveTime > this.maxInactiveTime) {
                    console.warn('⚠️ Service worker has been inactive too long, attempting recovery...');
                    await this.recoverServiceWorker();
                }
            }
            
            this.lastCheck = now;
            
        } catch (error) {
            console.error('❌ Service worker health check failed:', error);
            await this.recoverServiceWorker();
        }
    }

    // Ping service worker
    async pingServiceWorker() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Ping timeout'));
            }, 2000);

            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(`Ping failed: ${chrome.runtime.lastError.message}`));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Attempt to recover service worker
    async recoverServiceWorker() {
        console.log('🔄 Attempting service worker recovery...');
        
        try {
            // Send a simple message to wake up the service worker
            await this.pingServiceWorker();
            console.log('✅ Service worker recovery successful');
        } catch (error) {
            console.error('❌ Service worker recovery failed:', error);
            
            // Notify user that extension needs to be refreshed
            this.notifyUserOfIssue();
        }
    }

    // Notify user of service worker issues
    notifyUserOfIssue() {
        // Create a notification or update extension icon to indicate issues
        console.warn('⚠️ Service worker is unresponsive - user should refresh the extension');
        
        // You could also update the extension icon or show a notification here
        if (chrome.action && chrome.action.setBadgeText) {
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        }
    }

    // Wait utility
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get service worker status
    async getStatus() {
        try {
            const response = await this.pingServiceWorker();
            return {
                healthy: true,
                initialized: response.initialized,
                lastActivity: response.lastActivity,
                inactiveTime: Date.now() - response.lastActivity
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export for use in other modules
export const serviceWorkerHealth = new ServiceWorkerHealthMonitor(); 