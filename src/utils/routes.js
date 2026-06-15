const CART_SESSION_KEY = "supermarket-cart-session-ids";

export function getRouteFromHash() {
  return window.location.hash === "#/cart" ? "cart" : "dashboard";
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
