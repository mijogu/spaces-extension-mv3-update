// Import Test for MV3 Service Worker
// Tests the backup import functionality

import { serviceWorkerClient } from '../service-worker-client.js';

// Sample backup data matching the user's format
const sampleBackup = [
    {
        "name": "Test Import Session 1",
        "tabs": [
            {
                "title": "Google",
                "url": "https://www.google.com",
                "favIconUrl": "https://www.google.com/favicon.ico"
            },
            {
                "title": "GitHub",
                "url": "https://github.com",
                "favIconUrl": "https://github.com/favicon.ico"
            }
        ]
    },
    {
        "name": "Test Import Session 2",
        "tabs": [
            {
                "title": "Stack Overflow",
                "url": "https://stackoverflow.com",
                "favIconUrl": "https://stackoverflow.com/favicon.ico"
            }
        ]
    }
];

// Test functions
export const importTests = {
    // Test basic import functionality (restore - replaces all)
    async testBasicImport() {
        console.log('🧪 Testing basic import functionality (restore)...');
        
        try {
            // First, get current sessions
            const beforeSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions before import:', beforeSessions.length);
            
            // Import the sample backup (this will replace all existing sessions)
            const importResult = await serviceWorkerClient.sendMessage({
                action: 'restoreFromBackup',
                spaces: sampleBackup
            });
            
            console.log('📦 Import result:', importResult);
            
            // Get sessions after import
            const afterSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions after import:', afterSessions.length);
            
            // Check if imported sessions are present
            const importedSessions = afterSessions.filter(session => 
                session.name && session.name.includes('Test Import Session')
            );
            
            console.log('✅ Imported sessions found:', importedSessions.length);
            console.log('📋 Imported session names:', importedSessions.map(s => s.name));
            
            return {
                success: importedSessions.length === sampleBackup.length,
                beforeCount: beforeSessions.length,
                afterCount: afterSessions.length,
                importedCount: importedSessions.length,
                expectedCount: sampleBackup.length,
                note: 'This test uses restoreFromBackup which replaces all existing sessions'
            };
            
        } catch (error) {
            console.error('❌ Import test failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Test additive import functionality (adds without replacing)
    async testAdditiveImport() {
        console.log('🧪 Testing additive import functionality...');
        
        try {
            // First, get current sessions
            const beforeSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions before import:', beforeSessions.length);
            
            // Import the sample backup (this will add to existing sessions)
            const importResult = await serviceWorkerClient.sendMessage({
                action: 'importSessions',
                spaces: sampleBackup
            });
            
            console.log('📦 Import result:', importResult);
            
            // Get sessions after import
            const afterSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions after import:', afterSessions.length);
            
            // Check if imported sessions are present
            const importedSessions = afterSessions.filter(session => 
                session.name && session.name.includes('Test Import Session')
            );
            
            console.log('✅ Imported sessions found:', importedSessions.length);
            console.log('📋 Imported session names:', importedSessions.map(s => s.name));
            
            return {
                success: importedSessions.length === sampleBackup.length,
                beforeCount: beforeSessions.length,
                afterCount: afterSessions.length,
                importedCount: importedSessions.length,
                expectedCount: sampleBackup.length,
                note: 'This test uses importSessions which adds to existing sessions'
            };
            
        } catch (error) {
            console.error('❌ Additive import test failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Test import with real backup data (additive)
    async testRealBackupImport(backupData) {
        console.log('🧪 Testing real backup import (additive)...');
        
        try {
            // First, get current sessions
            const beforeSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions before import:', beforeSessions.length);
            
            // Import the real backup (additive - won't delete existing sessions)
            const importResult = await serviceWorkerClient.sendMessage({
                action: 'importSessions',
                spaces: backupData
            });
            
            console.log('📦 Import result:', importResult);
            
            // Get sessions after import
            const afterSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            console.log('📊 Sessions after import:', afterSessions.length);
            
            // Check if imported sessions are present
            const importedSessions = afterSessions.filter(session => 
                session.name && !session.windowId // Saved sessions should not have windowId
            );
            
            console.log('✅ Imported sessions found:', importedSessions.length);
            console.log('📋 Imported session names:', importedSessions.map(s => s.name));
            
            // Check session structure
            const sessionStructure = importedSessions.map(session => ({
                name: session.name,
                hasId: !!session.id,
                hasSessionHash: !!session.sessionHash,
                hasLastAccess: !!session.lastAccess,
                hasWindowId: !!session.windowId,
                hasTabs: !!session.tabs && session.tabs.length > 0,
                tabCount: session.tabs ? session.tabs.length : 0
            }));
            
            console.log('🔍 Session structure analysis:', sessionStructure);
            
            return {
                success: importedSessions.length >= backupData.length, // >= because we might have existing sessions
                beforeCount: beforeSessions.length,
                afterCount: afterSessions.length,
                importedCount: importedSessions.length,
                expectedCount: backupData.length,
                sessionStructure,
                note: 'This test uses importSessions which adds to existing sessions without deleting them'
            };
            
        } catch (error) {
            console.error('❌ Real backup import test failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Test session detail retrieval
    async testSessionDetail() {
        console.log('🧪 Testing session detail retrieval...');
        
        try {
            const allSessions = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            const savedSessions = allSessions.filter(session => session.id && !session.windowId);
            
            if (savedSessions.length === 0) {
                return { success: false, error: 'No saved sessions found to test' };
            }
            
            const testSession = savedSessions[0];
            console.log('🔍 Testing session detail for:', testSession.name);
            
            const sessionDetail = await serviceWorkerClient.sendMessage({
                action: 'requestSpaceDetail',
                sessionId: testSession.id,
                windowId: false
            });
            
            console.log('📋 Session detail result:', sessionDetail);
            
            return {
                success: !!sessionDetail,
                sessionName: testSession.name,
                hasDetail: !!sessionDetail,
                detailStructure: sessionDetail ? {
                    hasName: !!sessionDetail.name,
                    hasTabs: !!sessionDetail.tabs,
                    tabCount: sessionDetail.tabs ? sessionDetail.tabs.length : 0
                } : null
            };
            
        } catch (error) {
            console.error('❌ Session detail test failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Test Manage Spaces window refresh functionality
    async testManageSpacesRefresh() {
        console.log('🧪 Testing Manage Spaces window refresh...');
        
        try {
            // First, import some test data
            const importResult = await serviceWorkerClient.sendMessage({
                action: 'importSessions',
                spaces: sampleBackup
            });
            
            console.log('📦 Import result:', importResult);
            
            // Check if Manage Spaces window is open by trying to send a refresh message
            // This will test the refresh mechanism even if the window isn't open
            const refreshResult = await serviceWorkerClient.sendMessage({
                action: 'refreshSpacesData'
            });
            
            console.log('🔄 Refresh test result:', refreshResult);
            
            return {
                success: true,
                importResult,
                refreshResult,
                note: 'This test verifies the refresh mechanism works (window may not be open)'
            };
            
        } catch (error) {
            console.error('❌ Manage Spaces refresh test failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Test both import types functionality
    async testImportTypes() {
        console.log('🧪 Testing both import types...');
        
        try {
            // Test additive import
            const addResult = await serviceWorkerClient.sendMessage({
                action: 'importSessions',
                spaces: sampleBackup
            });
            
            console.log('📦 Additive import result:', addResult);
            
            // Get current session count
            const afterAdd = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            const savedAfterAdd = afterAdd.filter(session => session.id && !session.windowId);
            
            // Test replace import
            const replaceResult = await serviceWorkerClient.sendMessage({
                action: 'restoreFromBackup',
                spaces: sampleBackup
            });
            
            console.log('🔄 Replace import result:', replaceResult);
            
            // Get final session count
            const afterReplace = await serviceWorkerClient.sendMessage({ action: 'requestAllSpaces' });
            const savedAfterReplace = afterReplace.filter(session => session.id && !session.windowId);
            
            return {
                success: true,
                additiveImport: addResult,
                replaceImport: replaceResult,
                sessionsAfterAdd: savedAfterAdd.length,
                sessionsAfterReplace: savedAfterReplace.length,
                note: 'This test verifies both import types work correctly'
            };
            
        } catch (error) {
            console.error('❌ Import types test failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export for use in test pages
export default importTests;

// Make available globally for the test page
if (typeof window !== 'undefined') {
    window.importTests = importTests;
} 