/* global db */

// Import dependencies as ES modules for MV3
import db from './db.js';

// Convert to ES module for MV3
export const dbService = {
    DB_SERVER: 'spaces',
    DB_VERSION: '1',
    DB_SESSIONS: 'ttSessions',

    noop() {},

    /**
     * INDEXEDDB FUNCTIONS
     */
    getDb() {
        return db.open({
            server: dbService.DB_SERVER,
            version: dbService.DB_VERSION,
            schema: dbService.getSchema,
        });
    },

    /**
     * Properties of a session object
     * session.id:           auto-generated indexedDb object id
     * session.sessionHash:  a hash formed from the combined urls in the session window
     * session.name:         the saved name of the session
     * session.tabs:         an array of chrome tab objects (often taken from the chrome window obj)
     * session.history:      an array of chrome tab objects that have been removed from the session
     * session.lastAccess:   timestamp that gets updated with every window focus
     */
    getSchema() {
        return {
            ttSessions: {
                key: {
                    keyPath: 'id',
                    autoIncrement: true,
                },
                indexes: {
                    id: {},
                },
            },
        };
    },

    _fetchAllSessions() {
        return dbService.getDb().then(s => {
            return s
                .query(dbService.DB_SESSIONS)
                .all()
                .execute()
                .then(sessions => {
                    console.log('_fetchAllSessions - raw database result:', sessions);
                    return sessions;
                });
        });
    },

    _fetchSessionById: id => {
        const _id = typeof id === 'string' ? parseInt(id, 10) : id;
        return dbService.getDb().then(s => {
            return s
                .query(dbService.DB_SESSIONS, 'id')
                .only(_id)
                .distinct()
                .desc()
                .execute()
                .then(results => {
                    return results.length > 0 ? results[0] : null;
                });
        });
    },

    fetchAllSessions: callback => {
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;
        dbService._fetchAllSessions().then(sessions => {
            console.log('dbService.fetchAllSessions - returned sessions:', sessions);
            _callback(sessions);
        });
    },

    fetchSessionById: (id, callback) => {
        const _id = typeof id === 'string' ? parseInt(id, 10) : id;
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;
        dbService._fetchSessionById(_id).then(session => {
            _callback(session);
        });
    },

    fetchSessionNames: callback => {
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;

        dbService._fetchAllSessions().then(sessions => {
            _callback(
                sessions.map(session => {
                    return session.name;
                })
            );
        });
    },

    fetchSessionByName: (sessionName, callback) => {
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;

        dbService._fetchAllSessions().then(sessions => {
            let matchIndex;
            const matchFound = sessions.some((session, index) => {
                if (session.name.toLowerCase() === sessionName.toLowerCase()) {
                    matchIndex = index;
                    return true;
                }
                return false;
            });

            if (matchFound) {
                _callback(sessions[matchIndex]);
            } else {
                _callback(false);
            }
        });
    },

    createSession: (session, callback) => {
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;

        // delete session id in case it already exists
        const { id, ..._session } = session;

        console.log('dbService.createSession - input session:', session);
        console.log('dbService.createSession - session without id:', _session);

        dbService
            .getDb()
            .then(s => {
                return s.add(dbService.DB_SESSIONS, _session);
            })
            .then(result => {
                console.log('dbService.createSession - database result:', result);
                if (result.length > 0) {
                    console.log('dbService.createSession - returning result[0]:', result[0]);
                    _callback(result[0]);
                } else {
                    console.error('dbService.createSession - no result returned');
                    _callback(false);
                }
            })
            .catch(error => {
                console.error('dbService.createSession - error:', error);
                _callback(false);
            });
    },

    updateSession: (session, callback) => {
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;

        // ensure session id is set
        if (!session.id) {
            _callback(false);
            return;
        }

        dbService
            .getDb()
            .then(s => {
                return s.update(dbService.DB_SESSIONS, session);
            })
            .then(result => {
                if (result.length > 0) {
                    _callback(result[0]);
                }
            });
    },

    removeSession: (id, callback) => {
        const _id = typeof id === 'string' ? parseInt(id, 10) : id;
        const _callback =
            typeof callback !== 'function' ? dbService.noop : callback;

        dbService
            .getDb()
            .then(s => {
                return s.remove(dbService.DB_SESSIONS, _id);
            })
            .then(_callback);
    },
};

// TODO: Add proper error handling for database operations
// TODO: Consider adding database migration logic for version updates
// TODO: Add database connection pooling for better performance
