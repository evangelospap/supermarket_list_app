// Storage priority: backend JSON DB first, then IndexedDB, then localStorage as the last fallback.
import { normalizeState } from "./utils/state";

const DB_NAME = "supermarket-list-db";
const DB_VERSION = 1;
const STORE_NAME = "app-state";
const STATE_KEY = "current";
const LEGACY_STORAGE_KEY = "supermarket-list-state-v1";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function buildStoredPayload(state, updatedAt = new Date().toISOString()) {
  return { state: normalizeState(state), updatedAt };
}

function normalizeStoredPayload(payload) {
  if (!payload) {
    return undefined;
  }

  if (payload.state) {
    return buildStoredPayload(payload.state, payload.updatedAt ?? "");
  }

  return buildStoredPayload(payload, "");
}

function isNewerPayload(candidate, current) {
  if (!candidate) {
    return false;
  }

  if (!current) {
    return true;
  }

  return String(candidate.updatedAt ?? "") > String(current.updatedAt ?? "");
}

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
  return normalizeStoredPayload(payload);
}

// Every list change is sent as a full state document to keep the API simple.
async function writeToBackend(payload) {
  const normalizedPayload = normalizeStoredPayload(payload);
  const response = await fetch(`${API_BASE_URL}/api/state`, {
    body: JSON.stringify(normalizedPayload),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error("Could not save backend state");
  }

  return normalizeStoredPayload(await response.json());
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

        request.onsuccess = () => resolve(normalizeStoredPayload(request.result));
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

function writeToIndexedDb(payload) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(payload, STATE_KEY);

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
    return stored ? normalizeStoredPayload(JSON.parse(stored)) : undefined;
  } catch {
    return undefined;
  }
}

function writeToLocalStorage(payload) {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
}

async function readFromBrowserCache() {
  let indexedState;

  try {
    indexedState = await readFromIndexedDb();
  } catch {
    // localStorage is the last fallback below.
  }

  const localState = readFromLocalStorage();

  if (isNewerPayload(localState, indexedState)) {
    return { source: "localstorage", payload: localState };
  }

  return { source: indexedState ? "indexeddb" : localState ? "localstorage" : "empty", payload: indexedState ?? localState };
}

// Load order also migrates older local data up to the backend whenever possible.
export async function loadStoredState() {
  try {
    const backendPayload = await readFromBackend();
    const browserResult = await readFromBrowserCache();
    const browserPayload = browserResult.payload;

    if (isNewerPayload(browserPayload, backendPayload)) {
      await writeToBackend(browserPayload);
      return { source: browserResult.source, state: browserPayload.state };
    }

    if (backendPayload) {
      await writeToIndexedDb(backendPayload);
      writeToLocalStorage(backendPayload);
      return { source: "backend", state: backendPayload.state };
    }
  } catch {
    const browserResult = await readFromBrowserCache();
    return { source: browserResult.source, state: browserResult.payload?.state };
  }

  try {
    const browserResult = await readFromBrowserCache();
    const browserPayload = browserResult.payload;

    if (browserPayload) {
      const backendPayload = await writeToBackend(browserPayload);
      await writeToIndexedDb(backendPayload);
      writeToLocalStorage(backendPayload);
      return { source: browserResult.source, state: browserPayload.state };
    }
  } catch {
    const browserResult = await readFromBrowserCache();
    return { source: browserResult.source, state: browserResult.payload?.state };
  }

  return { source: "empty", state: undefined };
}

// Save locally first so a quick refresh does not lose the latest checkbox/action.
export async function saveStoredState(state) {
  const localPayload = buildStoredPayload(state);

  writeToLocalStorage(localPayload);

  try {
    await writeToIndexedDb(localPayload);
  } catch {
    // localStorage already has the newest copy.
  }

  try {
    const backendPayload = await writeToBackend(localPayload);
    await writeToIndexedDb(backendPayload);
    writeToLocalStorage(backendPayload);
    return "backend";
  } catch {
    return "localstorage";
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
