// Spring backend storage: household state is loaded from the API, with a read-only browser cache per household.
import { normalizeState } from "./utils/state";

const DB_NAME = "supermarket-list-db";
const DB_VERSION = 2;
const STORE_NAME = "app-state";
const LEGACY_STORAGE_KEY = "supermarket-list-state-v1";
const ACTIVE_HOUSEHOLD_KEY = "supermarket-active-household-id";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let accessToken = "";

function householdStateKey(householdId) {
  return `household:${householdId}`;
}

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

function authHeaders(headers = {}) {
  return accessToken
    ? {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      }
    : headers;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: authHeaders(options.headers ?? {}),
  });

  if (response.status === 401 && path !== "/api/auth/refresh") {
    await refreshSession();
    return apiFetch(path, options);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "API request failed");
  }

  return response.status === 204 ? undefined : response.json();
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
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

function readFromIndexedDb(key) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

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

function writeToIndexedDb(key, payload) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(payload, key);

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

function readLocalCache(householdId) {
  try {
    const key = householdStateKey(householdId);
    const cached = localStorage.getItem(key) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return cached ? normalizeStoredPayload(JSON.parse(cached)) : undefined;
  } catch {
    return undefined;
  }
}

function writeLocalCache(householdId, payload) {
  try {
    localStorage.setItem(householdStateKey(householdId), JSON.stringify(payload));
  } catch {
    // Cache only; failed writes should not block the app.
  }
}

async function cachePayload(householdId, payload) {
  writeLocalCache(householdId, payload);

  try {
    await writeToIndexedDb(householdStateKey(householdId), payload);
  } catch {
    // localStorage cache is enough as a fallback.
  }
}

export function getActiveHouseholdId() {
  try {
    return localStorage.getItem(ACTIVE_HOUSEHOLD_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveHouseholdId(householdId) {
  try {
    if (householdId) {
      localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
    } else {
      localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
    }
  } catch {
    // Local UI preference only.
  }
}

export function hasAccessToken() {
  return Boolean(accessToken);
}

export async function refreshSession() {
  const payload = await apiFetch("/api/auth/refresh", { method: "POST" });
  accessToken = payload.accessToken || accessToken;
  return payload;
}

export async function joinGuestHousehold({ deviceLabel, inviteCode }) {
  const payload = await apiFetch("/api/auth/guest/join", {
    body: JSON.stringify({ deviceLabel, inviteCode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  accessToken = payload.accessToken || "";
  return payload;
}

export async function logoutSession() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    accessToken = "";
    setActiveHouseholdId("");
  }
}

export async function loadCurrentUser() {
  const payload = await apiFetch("/api/me");
  accessToken = payload.accessToken || accessToken;
  return payload;
}

export async function createHousehold(name) {
  return apiFetch("/api/households", {
    body: JSON.stringify({ name }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function joinHousehold(inviteCode) {
  return apiFetch("/api/households/join", {
    body: JSON.stringify({ inviteCode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function rotateHouseholdInvite(householdId) {
  return apiFetch(`/api/households/${encodeURIComponent(householdId)}/invite/rotate`, { method: "POST" });
}

export async function loadStoredState(householdId) {
  if (!householdId) {
    return { source: "empty", state: undefined };
  }

  try {
    const payload = await apiFetch(`/api/households/${encodeURIComponent(householdId)}/state`);
    const storedPayload = normalizeStoredPayload({ state: payload.state, updatedAt: payload.updatedAt });
    await cachePayload(householdId, storedPayload);
    return { source: "backend", state: storedPayload.state, updatedAt: storedPayload.updatedAt };
  } catch {
    let indexedState;

    try {
      indexedState = await readFromIndexedDb(householdStateKey(householdId));
    } catch {
      // localStorage is the last fallback below.
    }

    const localState = readLocalCache(householdId);
    const payload = indexedState ?? localState;
    return { source: payload ? "cache" : "empty", state: payload?.state, updatedAt: payload?.updatedAt };
  }
}

export async function saveStoredState(householdId, state, summary = "Η λίστα ενημερώθηκε") {
  if (!householdId) {
    throw new Error("No active household");
  }

  const payload = await apiFetch(`/api/households/${encodeURIComponent(householdId)}/state`, {
    body: JSON.stringify({ state: normalizeState(state), summary }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const storedPayload = normalizeStoredPayload({ state: payload.state, updatedAt: payload.updatedAt });
  await cachePayload(householdId, storedPayload);
  return { source: "backend", state: storedPayload.state, updatedAt: storedPayload.updatedAt };
}

export async function fetchActivity(householdId) {
  if (!householdId) {
    return [];
  }

  return apiFetch(`/api/households/${encodeURIComponent(householdId)}/activity?limit=50`);
}

export async function lookupProductCode(code) {
  const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(code)}`, {
    credentials: "include",
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
