const CART_SESSION_KEY = "supermarket-cart-session-ids";
const VIEW_BY_HASH = {
  "#/": "all",
  "#/have": "have",
  "#/needed": "needed",
  "#/not-needed": "notNeeded",
};

export function getRouteFromHash() {
  return window.location.hash === "#/cart" ? "cart" : "dashboard";
}

export function getViewFromHash() {
  return VIEW_BY_HASH[window.location.hash] ?? null;
}

export function readCartSessionIds() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CART_SESSION_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeCartSessionIds(itemIds) {
  try {
    sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(itemIds));
  } catch {
    // The cart still works for the current render even if sessionStorage is blocked.
  }
}

export function navigateToHash(hash) {
  if (window.location.hash === hash) {
    window.dispatchEvent(new Event("hashchange"));
    return;
  }

  window.location.hash = hash;
}

export function clearAuthCallbackRoute() {
  if (window.location.pathname !== "/auth/callback") {
    return;
  }

  window.history.replaceState({}, "", `/${window.location.hash || ""}`);
}
