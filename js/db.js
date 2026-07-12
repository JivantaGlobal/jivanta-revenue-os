/**
 * @file db.js
 * @description IndexedDB persistence layer for Jivanta Global Revenue OS with live Firebase Cloud Sync.
 * Provides a complete data backbone with generic CRUD, bulk operations,
 * index-based queries, and field-level full-text search across all stores.
 *
 * @module DB
 * @version 1.3.0
 */

/** @type {string} Database name */
const DB_NAME = 'jivanta_revenue_os';

/** @type {number} Database schema version */
const DB_VERSION = 3;

/** @type {IDBDatabase|null} Cached database connection */
let dbInstance = null;

// Firebase State Variables
let firestoreDb = null;
let isFirebaseEnabled = false;
let firebaseConfig = null;
let unsubscribes = [];

// In-Memory Database Fallback (for locked or private browser sessions where IndexedDB hangs/fails)
let useMemoryStorage = false;
const memoryDb = {
  leads: [],
  activities: [],
  tasks: [],
  calls: [],
  quotations: [],
  documents: [],
  users: [],
  notifications: [],
  settings: []
};

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBkKf3fjufq6BmpKT-Y0jXPsaRr-Nvu-SQ",
  authDomain: "abs-hrm-cloud.firebaseapp.com",
  projectId: "abs-hrm-cloud",
  storageBucket: "abs-hrm-cloud.firebasestorage.app",
  messagingSenderId: "230994753587",
  appId: "1:230994753587:web:26bc86e7df3911425a8b46"
};

/**
 * Schema definition for all object stores.
 * Each entry defines the keyPath and index configurations.
 *
 * @typedef {Object} StoreSchema
 * @property {string} keyPath - Primary key path
 * @property {Array<{name: string, keyPath: string, options?: IDBIndexParameters}>} indexes
 */

/** @type {Record<string, StoreSchema>} */
const SCHEMA = {
  leads: {
    keyPath: 'id',
    indexes: [
      { name: 'companyName', keyPath: 'companyName', options: { unique: false } },
      { name: 'country', keyPath: 'country', options: { unique: false } },
      { name: 'productInterest', keyPath: 'productInterest', options: { unique: false } },
      { name: 'leadStatus', keyPath: 'leadStatus', options: { unique: false } },
      { name: 'leadOwner', keyPath: 'leadOwner', options: { unique: false } },
      { name: 'priority', keyPath: 'priority', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
      { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
    ],
  },
  activities: {
    keyPath: 'id',
    indexes: [
      { name: 'leadId', keyPath: 'leadId', options: { unique: false } },
      { name: 'userId', keyPath: 'userId', options: { unique: false } },
      { name: 'type', keyPath: 'type', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  tasks: {
    keyPath: 'id',
    indexes: [
      { name: 'leadId', keyPath: 'leadId', options: { unique: false } },
      { name: 'assignedTo', keyPath: 'assignedTo', options: { unique: false } },
      { name: 'dueDate', keyPath: 'dueDate', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'priority', keyPath: 'priority', options: { unique: false } },
    ],
  },
  calls: {
    keyPath: 'id',
    indexes: [
      { name: 'leadId', keyPath: 'leadId', options: { unique: false } },
      { name: 'userId', keyPath: 'userId', options: { unique: false } },
      { name: 'date', keyPath: 'date', options: { unique: false } },
      { name: 'outcome', keyPath: 'outcome', options: { unique: false } },
    ],
  },
  quotations: {
    keyPath: 'id',
    indexes: [
      { name: 'leadId', keyPath: 'leadId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  documents: {
    keyPath: 'id',
    indexes: [
      { name: 'leadId', keyPath: 'leadId', options: { unique: false } },
      { name: 'category', keyPath: 'category', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  users: {
    keyPath: 'id',
    indexes: [
      { name: 'email', keyPath: 'email', options: { unique: true } },
      { name: 'role', keyPath: 'role', options: { unique: false } },
      { name: 'passwordHash', keyPath: 'passwordHash', options: { unique: false } },
      { name: 'isActive', keyPath: 'isActive', options: { unique: false } },
      { name: 'failedAttempts', keyPath: 'failedAttempts', options: { unique: false } },
    ],
  },
  notifications: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId', options: { unique: false } },
      { name: 'read', keyPath: 'read', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  settings: {
    keyPath: 'key',
    indexes: [],
  },
};

/**
 * Validates if the store name is defined in the schema.
 * @param {string} storeName - Store name to validate
 * @throws {Error} If store name is invalid
 */
function validateStoreName(storeName) {
  if (!SCHEMA[storeName]) {
    throw new Error(`[DB] Invalid object store: "${storeName}". Valid stores: ${Object.keys(SCHEMA).join(', ')}`);
  }
}

/**
 * Wraps an IDBRequest in a Promise.
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wraps an IDBTransaction in a Promise for transaction completion.
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function promisifyTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('[DB] Transaction aborted'));
  });
}

/**
 * Generate a random unique ID with prefix.
 * @param {string} prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'REC') {
  const randomChars = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}_${randomChars}`;
}

/**
 * Database access module.
 */
export const DB = {
  /**
   * Initializes the IndexedDB database.
   * Also connects to Firebase Firestore if online.
   *
   * @returns {Promise<IDBDatabase>} Resolves with the active database instance
   */
  init() {
    if (typeof indexedDB === 'undefined') {
      console.warn('[DB] IndexedDB not supported. Falling back to in-memory database.');
      useMemoryStorage = true;
      this.initFirebase();
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      // 3-second safety timeout to prevent page hangs on browser IndexedDB locks
      const safetyTimeout = setTimeout(() => {
        console.warn('[DB] IndexedDB initialization timed out after 3 seconds. Falling back to in-memory database.');
        useMemoryStorage = true;
        this.initFirebase();
        resolve(null);
      }, 3000);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;

        for (const [storeName, schema] of Object.entries(SCHEMA)) {
          let store;
          if (db.objectStoreNames.contains(storeName)) {
            store = transaction.objectStore(storeName);
            for (const index of schema.indexes) {
              if (!store.indexNames.contains(index.name)) {
                store.createIndex(index.name, index.keyPath, index.options);
                console.info(`[DB] Created missing index '${index.name}' for store '${storeName}'`);
              }
            }
          } else {
            store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
            for (const index of schema.indexes) {
              store.createIndex(index.name, index.keyPath, index.options);
            }
          }
        }
      };

      request.onsuccess = (event) => {
        clearTimeout(safetyTimeout);
        dbInstance = event.target.result;

        dbInstance.onclose = () => {
          console.warn('[DB] Database connection closed unexpectedly.');
          dbInstance = null;
        };

        dbInstance.onversionchange = () => {
          if (dbInstance) {
            dbInstance.close();
            dbInstance = null;
          }
          console.warn('[DB] Database version changed in another tab. Connection closed.');
        };

        console.info(`[DB] Database "${DB_NAME}" v${DB_VERSION} initialized.`);
        
        // Setup Firebase Live Sync (non-blocking)
        this.initFirebase();

        resolve(dbInstance);
      };

      request.onerror = (event) => {
        clearTimeout(safetyTimeout);
        console.warn('[DB] Failed to open IndexedDB. Falling back to in-memory database.', event.target.error);
        useMemoryStorage = true;
        this.initFirebase();
        resolve(null);
      };

      request.onblocked = () => {
        clearTimeout(safetyTimeout);
        console.warn('[DB] IndexedDB open blocked. Falling back to in-memory database.');
        useMemoryStorage = true;
        this.initFirebase();
        resolve(null);
      };
    });
  },

  /**
   * Connects to Firebase Firestore and starts real-time listeners.
   */
  async initFirebase() {
    try {
      const firebase = window.firebase;
      if (!firebase) {
        throw new Error('Firebase global SDK object not found on window.');
      }

      const savedConfig = localStorage.getItem('jivanta_firebase_config');
      firebaseConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

      let app;
      if (firebase.apps.length === 0) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.app();
      }
      
      firestoreDb = firebase.firestore(app);
      isFirebaseEnabled = true;
      console.info(`[Firebase] Syncing live to project: ${firebaseConfig.projectId}`);

      // Start Real-time sync listeners
      this.setupFirebaseListeners();

      // Check if Firestore is completely empty (new cloud database setup)
      setTimeout(async () => {
        try {
          const leadsRef = firestoreDb.collection('jivanta_crm_leads');
          const leadsSnap = await leadsRef.limit(1).get();
          if (leadsSnap.empty) {
            console.info('[Firebase] Cloud database is empty. Force-uploading local backup...');
            await this.forcePushLocalToCloud();
          }
        } catch (e) {
          console.warn('[Firebase] Setup validation check bypassed:', e);
        }
      }, 2000);

    } catch (err) {
      console.warn('[Firebase] Live cloud sync initialization bypassed:', err);
      isFirebaseEnabled = false;
      firestoreDb = null;
    }
  },

  /**
   * Real-time listeners for database changes across all collections.
   */
  setupFirebaseListeners() {
    if (!isFirebaseEnabled || !firestoreDb) return;

    // Clear any previous listeners
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];

    const storesToSync = ['leads', 'tasks', 'calls', 'activities', 'users', 'quotations', 'documents', 'settings'];
    
    storesToSync.forEach(storeName => {
      const colRef = firestoreDb.collection(`jivanta_crm_${storeName}`);
      
      const unsub = colRef.onSnapshot(async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const record = change.doc.data();
          const docId = change.doc.id;

          if (change.type === 'removed') {
            await this.deleteLocal(storeName, docId);
            window.dispatchEvent(new CustomEvent('db-update', { detail: { storeName } }));
          } else {
            const localRecord = await this.getLocal(storeName, docId);
            // Write only if local does not exist or local is older
            if (!localRecord || localRecord.updatedAt !== record.updatedAt) {
              await this.putLocal(storeName, record);
              window.dispatchEvent(new CustomEvent('db-update', { detail: { storeName } }));
            }
          }
        }
      }, (err) => {
        console.warn(`[Firebase] Subscription error for ${storeName}:`, err);
      });
      
      unsubscribes.push(unsub);
    });
  },

  /**
   * Returns Firebase status information.
   * @returns {{enabled: boolean, projectId: string|null}}
   */
  getFirebaseStatus() {
    return {
      enabled: isFirebaseEnabled,
      projectId: firebaseConfig ? firebaseConfig.projectId : null
    };
  },

  /**
   * Configures a custom Firebase project configuration.
   * @param {Object} config - Firebase Config credentials
   */
  async setFirebaseConfig(config) {
    localStorage.setItem('jivanta_firebase_config', JSON.stringify(config));
    await this.initFirebase();
  },

  /**
   * Disables Firebase cloud sync, returning to offline-only IndexedDB.
   */
  disableFirebase() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    isFirebaseEnabled = false;
    firestoreDb = null;
    localStorage.removeItem('jivanta_firebase_config');
    console.info('[Firebase] Cloud sync disabled. Running in offline-only mode.');
  },

  /**
   * Force pushes all local database entries to the Cloud Database.
   */
  async forcePushLocalToCloud() {
    if (!firestoreDb) return;
    console.info('[Firebase] Pushing all local records to Firestore...');
    const storesToSync = ['leads', 'tasks', 'calls', 'activities', 'users', 'quotations', 'documents', 'settings'];
    
    for (const storeName of storesToSync) {
      const records = await this.getAll(storeName);
      const batch = firestoreDb.batch();
      
      records.forEach(record => {
        const docId = record.id || record.key;
        if (docId) {
          const docRef = firestoreDb.collection(`jivanta_crm_${storeName}`).doc(docId);
          batch.set(docRef, record);
        }
      });
      
      if (records.length > 0) {
        await batch.commit();
      }
    }
    console.info('[Firebase] Sync complete: Local data pushed to cloud successfully!');
  },

  /**
   * Force pulls all records from the Cloud Database, replacing local contents.
   */
  async forcePullCloudToLocal() {
    if (!firestoreDb) return;
    console.info('[Firebase] Pulling all records from Firestore...');
    const storesToSync = ['leads', 'tasks', 'calls', 'activities', 'users', 'quotations', 'documents', 'settings'];
    
    for (const storeName of storesToSync) {
      const colRef = firestoreDb.collection(`jivanta_crm_${storeName}`);
      const snap = await colRef.get();
      
      // Clear local IndexedDB table
      await this.clear(storeName);
      
      // Populate with Firestore records
      for (const docSnap of snap.docs) {
        await this.putLocal(storeName, docSnap.data());
      }
      
      window.dispatchEvent(new CustomEvent('db-update', { detail: { storeName } }));
    }
    console.info('[Firebase] Sync complete: Cloud data pulled to local database successfully!');
  },

  /**
   * Returns the active database connection.
   */
  async _getDB() {
    if (useMemoryStorage) return null;
    if (!dbInstance) {
      return this.init();
    }
    return dbInstance;
  },

  /**
   * Retrieves all records locally.
   */
  async getAll(storeName) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      return Promise.resolve([...memoryDb[storeName]]);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return promisifyRequest(store.getAll());
  },

  /**
   * Retrieves a single record locally.
   */
  async get(storeName, id) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      return Promise.resolve(memoryDb[storeName].find(r => r[keyField] === id) || null);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return promisifyRequest(store.get(id));
  },

  // Helper local-only get bypass
  async getLocal(storeName, id) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      return Promise.resolve(memoryDb[storeName].find(r => r[keyField] === id) || null);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return promisifyRequest(store.get(id));
  },

  // Helper local-only write bypass
  async putLocal(storeName, record) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      const idx = memoryDb[storeName].findIndex(r => r[keyField] === record[keyField]);
      if (idx !== -1) {
        memoryDb[storeName][idx] = record;
      } else {
        memoryDb[storeName].push(record);
      }
      return Promise.resolve();
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await promisifyRequest(store.put(record));
    await promisifyTransaction(tx);
  },

  // Helper local-only delete bypass
  async deleteLocal(storeName, id) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      const idx = memoryDb[storeName].findIndex(r => r[keyField] === id);
      if (idx !== -1) {
        memoryDb[storeName].splice(idx, 1);
      }
      return Promise.resolve();
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await promisifyRequest(store.delete(id));
    await promisifyTransaction(tx);
  },

  /**
   * Inserts or updates (upserts) a record.
   * Auto-syncs to Firestore when online.
   */
  async put(storeName, record) {
    validateStoreName(storeName);

    const recordToSave = { ...record };
    const keyField = storeName === 'settings' ? 'key' : 'id';
    
    if (!recordToSave[keyField]) {
      recordToSave[keyField] = generateId(storeName.toUpperCase().slice(0, 3));
    }
    
    if (storeName !== 'settings') {
      const now = new Date().toISOString();
      if (!recordToSave.createdAt) {
        recordToSave.createdAt = now;
      }
      recordToSave.updatedAt = now;
    }

    const key = recordToSave[keyField];

    if (useMemoryStorage) {
      const idx = memoryDb[storeName].findIndex(r => r[keyField] === key);
      if (idx !== -1) {
        memoryDb[storeName][idx] = recordToSave;
      } else {
        memoryDb[storeName].push(recordToSave);
      }
    } else {
      // Save locally
      const db = await this._getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await promisifyRequest(store.put(recordToSave));
      await promisifyTransaction(tx);
    }

    // Sync to Firebase Firestore
    if (isFirebaseEnabled && firestoreDb) {
      try {
        const docRef = firestoreDb.collection(`jivanta_crm_${storeName}`).doc(String(key));
        await docRef.set(recordToSave);
      } catch (err) {
        console.warn(`[Firebase] Live Sync push failed for ${storeName}/${key}:`, err);
      }
    }

    return key;
  },

  /**
   * Deletes a record by key.
   */
  async delete(storeName, id) {
    validateStoreName(storeName);
    
    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      const idx = memoryDb[storeName].findIndex(r => r[keyField] === id);
      if (idx !== -1) {
        memoryDb[storeName].splice(idx, 1);
      }
    } else {
      const db = await this._getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await promisifyRequest(store.delete(id));
      await promisifyTransaction(tx);
    }

    // Sync deletion to Firebase
    if (isFirebaseEnabled && firestoreDb) {
      try {
        const docRef = firestoreDb.collection(`jivanta_crm_${storeName}`).doc(String(id));
        await docRef.delete();
      } catch (err) {
        console.warn(`[Firebase] Live Sync delete failed for ${storeName}/${id}:`, err);
      }
    }
  },

  /**
   * Removes all records from an object store.
   */
  async clear(storeName) {
    validateStoreName(storeName);
    
    if (useMemoryStorage) {
      memoryDb[storeName] = [];
    } else {
      const db = await this._getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await promisifyRequest(store.clear());
      await promisifyTransaction(tx);
    }

    // Sync clear to Firebase
    if (isFirebaseEnabled && firestoreDb) {
      try {
        const snap = await firestoreDb.collection(`jivanta_crm_${storeName}`).get();
        for (const docSnap of snap.docs) {
          await docSnap.ref.delete();
        }
      } catch (err) {
        console.warn(`[Firebase] Live Sync clear failed for ${storeName}:`, err);
      }
    }
  },

  /**
   * Returns record count.
   */
  async count(storeName) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      return Promise.resolve(memoryDb[storeName].length);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return promisifyRequest(store.count());
  },

  /**
   * Queries records by index.
   */
  async query(storeName, indexName, value) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      // Basic index simulation on arrays
      const filtered = memoryDb[storeName].filter(r => r[indexName] === value);
      return Promise.resolve(filtered);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    if (!store.indexNames.contains(indexName)) {
      throw new Error(`[DB] Index "${indexName}" does not exist on store "${storeName}".`);
    }

    const index = store.index(indexName);
    return promisifyRequest(index.getAll(value));
  },

  /**
   * Substring search using cursor.
   */
  async search(storeName, field, searchTerm) {
    validateStoreName(storeName);

    if (!searchTerm || typeof searchTerm !== 'string') {
      return this.getAll(storeName);
    }

    const normalizedTerm = searchTerm.toLowerCase().trim();
    if (normalizedTerm.length === 0) {
      return this.getAll(storeName);
    }

    if (useMemoryStorage) {
      const filtered = memoryDb[storeName].filter(r => {
        const val = r[field];
        return val != null && String(val).toLowerCase().includes(normalizedTerm);
      });
      return Promise.resolve(filtered);
    }

    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const results = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(results);
          return;
        }

        const record = cursor.value;
        const fieldValue = record[field];

        if (fieldValue != null) {
          const stringValue = String(fieldValue).toLowerCase();
          if (stringValue.includes(normalizedTerm)) {
            results.push(record);
          }
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Batch upsert.
   */
  async bulkPut(storeName, records) {
    validateStoreName(storeName);

    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const isSettings = storeName === 'settings';
    const keyField = storeName === 'settings' ? 'key' : 'id';
    
    const savedRecords = [];
    const keys = [];

    for (const record of records) {
      const recordToSave = { ...record };
      if (!recordToSave[keyField]) {
        recordToSave[keyField] = generateId(storeName.toUpperCase().slice(0, 3));
      }
      if (!isSettings) {
        if (!recordToSave.createdAt) {
          recordToSave.createdAt = now;
        }
        recordToSave.updatedAt = now;
      }
      savedRecords.push(recordToSave);
      keys.push(recordToSave[keyField]);
    }

    if (useMemoryStorage) {
      savedRecords.forEach(record => {
        const idx = memoryDb[storeName].findIndex(r => r[keyField] === record[keyField]);
        if (idx !== -1) {
          memoryDb[storeName][idx] = record;
        } else {
          memoryDb[storeName].push(record);
        }
      });
    } else {
      const db = await this._getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const keyPromises = savedRecords.map(record => promisifyRequest(store.put(record)));
      await Promise.all(keyPromises);
      await promisifyTransaction(tx);
    }

    // Sync batch to Firebase
    if (isFirebaseEnabled && firestoreDb) {
      try {
        const batch = firestoreDb.batch();
        savedRecords.forEach((record, index) => {
          const docId = String(keys[index]);
          const docRef = firestoreDb.collection(`jivanta_crm_${storeName}`).doc(docId);
          batch.set(docRef, record);
        });
        await batch.commit();
      } catch (err) {
        console.warn(`[Firebase] Live Sync bulkPut failed for ${storeName}:`, err);
      }
    }

    return keys;
  },

  /**
   * Batch deletion.
   */
  async bulkDelete(storeName, ids) {
    validateStoreName(storeName);

    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }

    if (useMemoryStorage) {
      const keyField = storeName === 'settings' ? 'key' : 'id';
      ids.forEach(id => {
        const idx = memoryDb[storeName].findIndex(r => r[keyField] === id);
        if (idx !== -1) {
          memoryDb[storeName].splice(idx, 1);
        }
      });
    } else {
      const db = await this._getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const deletePromises = ids.map((id) => promisifyRequest(store.delete(id)));
      await Promise.all(deletePromises);
      await promisifyTransaction(tx);
    }

    // Sync batch deletion to Firebase
    if (isFirebaseEnabled && firestoreDb) {
      try {
        const batch = firestoreDb.batch();
        ids.forEach(id => {
          const docRef = firestoreDb.collection(`jivanta_crm_${storeName}`).doc(String(id));
          batch.delete(docRef);
        });
        await batch.commit();
      } catch (err) {
        console.warn(`[Firebase] Live Sync bulkDelete failed for ${storeName}:`, err);
      }
    }
  },

  /**
   * Range query.
   */
  async queryRange(storeName, indexName, range) {
    validateStoreName(storeName);
    if (useMemoryStorage) {
      // Basic range query simulation
      const filtered = memoryDb[storeName].filter(r => {
        const val = r[indexName];
        if (val == null) return false;
        const lowerBound = range.lower == null || (range.lowerOpen ? val > range.lower : val >= range.lower);
        const upperBound = range.upper == null || (range.upperOpen ? val < range.upper : val <= range.upper);
        return lowerBound && upperBound;
      });
      return Promise.resolve(filtered);
    }
    const db = await this._getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    if (!store.indexNames.contains(indexName)) {
      throw new Error(`[DB] Index "${indexName}" does not exist on store "${storeName}".`);
    }

    const index = store.index(indexName);
    return promisifyRequest(index.getAll(range));
  },

  getStoreNames() {
    return Object.keys(SCHEMA);
  },

  getSchema(storeName) {
    validateStoreName(storeName);
    return SCHEMA[storeName];
  },

  async destroy() {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        console.info(`[DB] Database "${DB_NAME}" destroyed.`);
        resolve(undefined);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('[DB] Database deletion blocked.');
        reject(new Error('[DB] Database deletion blocked.'));
      };
    });
  },
};

export default DB;
