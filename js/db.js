//The MIT License
//Copyright (c) 2012 Aaron Powell

// Convert to ES module for MV3
(function(window, undefined) {
    'use strict';

    var indexedDB,
        IDBKeyRange = (typeof window !== 'undefined' ? window.IDBKeyRange : null) || (typeof self !== 'undefined' ? self.IDBKeyRange : null) || (typeof globalThis !== 'undefined' ? globalThis.IDBKeyRange : null),
        transactionModes = {
            readonly: 'readonly',
            readwrite: 'readwrite',
        };

    var hasOwn = Object.prototype.hasOwnProperty;

    var getIndexedDB = function() {
        if (!indexedDB) {
            // Try different global objects for service worker compatibility
            const globalObj = typeof window !== 'undefined' ? window : 
                             typeof self !== 'undefined' ? self : 
                             typeof globalThis !== 'undefined' ? globalThis : null;
            
            if (globalObj) {
                indexedDB =
                    globalObj.indexedDB ||
                    globalObj.webkitIndexedDB ||
                    globalObj.mozIndexedDB ||
                    globalObj.oIndexedDB ||
                    globalObj.msIndexedDB;
            }

            if (!indexedDB) {
                throw 'IndexedDB required';
            }
        }
        return indexedDB;
    };

    var defaultMapper = function(value) {
        return value;
    };

    var CallbackList = function() {
        var state,
            list = [];

        var exec = function(context, args) {
            if (list) {
                args = args || [];
                state = state || [context, args];

                for (var i = 0, il = list.length; i < il; i++) {
                    list[i].apply(state[0], state[1]);
                }

                list = [];
            }
        };

        this.add = function() {
            for (var i = 0, il = arguments.length; i < il; i++) {
                list.push(arguments[i]);
            }

            if (state) {
                exec();
            }

            return this;
        };

        this.execute = function() {
            exec(this, arguments);
            return this;
        };
    };

    var Server = function(db, name) {
        var that = this,
            closed = false;

        this.add = function(table) {
            if (closed) {
                throw 'Database has been closed';
            }

            var records = [];
            var counter = 0;

            for (var i = 0; i < arguments.length - 1; i++) {
                if (Array.isArray(arguments[i + 1])) {
                    for (var j = 0; j < arguments[i + 1].length; j++) {
                        records[counter] = arguments[i + 1][j];
                        counter++;
                    }
                } else {
                    records[counter] = arguments[i + 1];
                    counter++;
                }
            }

            var transaction = db.transaction(table, transactionModes.readwrite),
                store = transaction.objectStore(table);

            return new Promise(function(resolve, reject) {
                records.forEach(function(record) {
                    var req;
                    if (record.item && record.key) {
                        var key = record.key;
                        record = record.item;
                        req = store.add(record, key);
                    } else {
                        req = store.add(record);
                    }

                    req.onsuccess = function(e) {
                        var target = e.target;
                        var keyPath = target.source.keyPath;
                        if (keyPath === null) {
                            keyPath = '__id__';
                        }
                        Object.defineProperty(record, keyPath, {
                            value: target.result,
                            enumerable: true,
                        });
                    };
                });

                transaction.oncomplete = function() {
                    resolve(records, that);
                };
                transaction.onerror = function(e) {
                    reject(e);
                };
                transaction.onabort = function(e) {
                    reject(e);
                };
            });
        };

        this.update = function(table) {
            if (closed) {
                throw 'Database has been closed';
            }

            var records = [];
            for (var i = 0; i < arguments.length - 1; i++) {
                records[i] = arguments[i + 1];
            }

            var transaction = db.transaction(table, transactionModes.readwrite),
                store = transaction.objectStore(table),
                keyPath = store.keyPath;

            return new Promise(function(resolve, reject) {
                records.forEach(function(record) {
                    var req;
                    var count;
                    if (record.item && record.key) {
                        var key = record.key;
                        record = record.item;
                        req = store.put(record, key);
                    } else {
                        req = store.put(record);
                    }

                    req.onsuccess = function(e) {
                        // deferred.notify(); es6 promise can't notify
                    };
                });

                transaction.oncomplete = function() {
                    resolve(records, that);
                };
                transaction.onerror = function(e) {
                    reject(e);
                };
                transaction.onabort = function(e) {
                    reject(e);
                };
            });
        };

        this.remove = function(table, key) {
            if (closed) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction(table, transactionModes.readwrite),
                store = transaction.objectStore(table);

            return new Promise(function(resolve, reject) {
                var req = store['delete'](key);
                transaction.oncomplete = function() {
                    resolve(key);
                };
                transaction.onerror = function(e) {
                    reject(e);
                };
            });
        };

        this.clear = function(table) {
            if (closed) {
                throw 'Database has been closed';
            }
            var transaction = db.transaction(table, transactionModes.readwrite),
                store = transaction.objectStore(table);

            return new Promise(function(resolve, reject) {
                var req = store.clear();
                transaction.oncomplete = function() {
                    resolve();
                };
                transaction.onerror = function(e) {
                    reject(e);
                };
            });
        };

        this.query = function(table, index) {
            if (closed) {
                throw 'Database has been closed';
            }

            var transaction = db.transaction(table, transactionModes.readonly),
                store = transaction.objectStore(table),
                query = new Query(store, index);

            return query;
        };

        this.close = function() {
            closed = true;
            db.close();
        };
    };

    var Query = function(store, index) {
        var that = this,
            keyRange = null,
            direction = 'next',
            limit = -1,
            offset = 0,
            filter = null,
            distinct = false,
            mapper = defaultMapper;

        this.only = function(value) {
            keyRange = IDBKeyRange.only(value);
            return this;
        };

        this.bound = function(lower, upper, lowerOpen, upperOpen) {
            keyRange = IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
            return this;
        };

        this.lowerBound = function(bound, open) {
            keyRange = IDBKeyRange.lowerBound(bound, open);
            return this;
        };

        this.upperBound = function(bound, open) {
            keyRange = IDBKeyRange.upperBound(bound, open);
            return this;
        };

        this.reverse = function() {
            direction = 'prev';
            return this;
        };

        this.asc = function() {
            direction = 'next';
            return this;
        };

        this.desc = function() {
            direction = 'prev';
            return this;
        };

        this.limit = function(count) {
            limit = count;
            return this;
        };

        this.offset = function(count) {
            offset = count;
            return this;
        };

        this.filter = function(fn) {
            filter = fn;
            return this;
        };

        this.distinct = function() {
            distinct = true;
            return this;
        };

        this.map = function(fn) {
            mapper = fn;
            return this;
        };

        this.all = function() {
            return this;
        };

        this.execute = function() {
            return new Promise(function(resolve, reject) {
                var results = [],
                    counter = 0,
                    skipped = 0;

                var request;
                if (index) {
                    var idx = store.index(index);
                    request = idx.openCursor(keyRange, direction);
                } else {
                    request = store.openCursor(keyRange, direction);
                }

                request.onsuccess = function(e) {
                    var cursor = e.target.result;

                    if (cursor) {
                        if (skipped < offset) {
                            skipped++;
                            cursor.continue();
                            return;
                        }

                        if (limit !== -1 && counter >= limit) {
                            resolve(results);
                            return;
                        }

                        var value = cursor.value;
                        var key = cursor.key;

                        if (filter && !filter(value, key)) {
                            cursor.continue();
                            return;
                        }

                        if (distinct) {
                            var exists = results.some(function(result) {
                                return hasOwn.call(result, key) && result[key] === value;
                            });

                            if (exists) {
                                cursor.continue();
                                return;
                            }
                        }

                        results.push(mapper(value, key));
                        counter++;

                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };

                request.onerror = function(e) {
                    reject(e);
                };
            });
        };
    };

    var db = {
        open: function(options) {
            return new Promise(function(resolve, reject) {
                var request = getIndexedDB().open(options.server, options.version);

                request.onerror = function(e) {
                    reject(e);
                };

                request.onsuccess = function(e) {
                    var database = e.target.result;
                    var server = new Server(database, options.server);

                    if (options.schema) {
                        var schema = options.schema();
                        for (var table in schema) {
                            if (hasOwn.call(schema, table)) {
                                var tableSchema = schema[table];
                                var store = database.createObjectStore(table, tableSchema.key);
                                var indexes = tableSchema.indexes || {};

                                for (var index in indexes) {
                                    if (hasOwn.call(indexes, index)) {
                                        var indexSchema = indexes[index];
                                        store.createIndex(index, index, indexSchema);
                                    }
                                }
                            }
                        }
                    }

                    resolve(server);
                };

                request.onupgradeneeded = function(e) {
                    var database = e.target.result;
                    var server = new Server(database, options.server);

                    if (options.schema) {
                        var schema = options.schema();
                        for (var table in schema) {
                            if (hasOwn.call(schema, table)) {
                                var tableSchema = schema[table];
                                var store = database.createObjectStore(table, tableSchema.key);
                                var indexes = tableSchema.indexes || {};

                                for (var index in indexes) {
                                    if (hasOwn.call(indexes, index)) {
                                        var indexSchema = indexes[index];
                                        store.createIndex(index, index, indexSchema);
                                    }
                                }
                            }
                        }
                    }

                    resolve(server);
                };
            });
        },
    };

    // Export for ES modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = db;
    } else if (typeof window !== 'undefined') {
        window.db = db;
    }

    // Export for ES modules in MV3
    if (typeof window !== 'undefined') {
        window.db = db;
    } else if (typeof self !== 'undefined') {
        self.db = db;
    } else if (typeof globalThis !== 'undefined') {
        globalThis.db = db;
    }
})(typeof window !== 'undefined' ? window : 
   typeof self !== 'undefined' ? self : 
   typeof globalThis !== 'undefined' ? globalThis : this);

// TODO: Add proper error handling for IndexedDB operations
// TODO: Consider adding database connection pooling for better performance
// TODO: Add database migration support for version updates

// Export for ES modules
export default db;
