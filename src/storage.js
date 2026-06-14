// Storage priority: backend JSON DB first, then IndexedDB, then localStorage as the last fallback.
const DB_NAME = "supermarket-list-db";
const DB_VERSION = 1;
const STORE_NAME = "app-state";
const STATE_KEY = "current";
const LEGACY_STORAGE_KEY = "supermarket-list-state-v1";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Backend state is the source of truth when the app is used from multiple devices/browsers.
async function readFromBackend() {
  const response = await fetch(`${API_BASE_URL}/api/state`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error("Could not load backend state");
  }

  const payload = await response.json();
  return payload.state;
}

// Every list change is sent as a full state document to keep the API simple.
async function writeToBackend(state) {
  const response = await fetch(`${API_BASE_URL}/api/state`, {
    body: JSON.stringify({ state }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error("Could not save backend state");
  }
}

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

// IndexedDB gives us a durable browser cache when the backend is temporarily unavailable.
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFromIndexedDb() {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(STATE_KEY);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
      .catch(reject);
  });
}

function writeToIndexedDb(state) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(state, STATE_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
      .catch(reject);
  });
}

// localStorage is kept for old saved data and as a tiny emergency fallback.
function readFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
}

function writeToLocalStorage(state) {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
}

// Load order also migrates older local data up to the backend whenever possible.
export async function loadStoredState() {
  try {
    const backendState = await readFromBackend();

    if (backendState) {
      await writeToIndexedDb(backendState);
      writeToLocalStorage(backendState);
      return { source: "backend", state: backendState };
    }
  } catch {
    try {
      const indexedState = await readFromIndexedDb();

      if (indexedState) {
        return { source: "indexeddb", state: indexedState };
      }
    } catch {
      const localState = readFromLocalStorage();
      return { source: localState ? "localstorage" : "empty", state: localState };
    }
  }

  try {
    const indexedState = await readFromIndexedDb();

    if (indexedState) {
      await writeToBackend(indexedState);
      return { source: "indexeddb", state: indexedState };
    }

    const legacyState = readFromLocalStorage();

    if (legacyState) {
      await writeToIndexedDb(legacyState);
      await writeToBackend(legacyState);
      return { source: "localstorage", state: legacyState };
    }
  } catch {
    const localState = readFromLocalStorage();
    return { source: localState ? "localstorage" : "empty", state: localState };
  }

  return { source: "empty", state: undefined };
}

// Save order mirrors load order: backend first, browser caches second.
export async function saveStoredState(state) {
  try {
    await writeToBackend(state);
    await writeToIndexedDb(state);
    writeToLocalStorage(state);
    return "backend";
  } catch {
    try {
      await writeToIndexedDb(state);
      writeToLocalStorage(state);
      return "indexeddb";
    } catch {
      writeToLocalStorage(state);
      return "localstorage";
    }
  }
}

// Scanner lookup is read-only: it identifies a product, then App.jsx decides whether to add it.
export async function lookupProductCode(code) {
  const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(code)}`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return response.json();
  }

  if (!response.ok) {
    throw new Error("Could not look up product code");
  }

  return response.json();
}
