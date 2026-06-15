import { DEFAULT_CATEGORIES, STARTER_ITEMS } from "../data/catalog";

export function isValidState(value) {
  return (
    value &&
    Array.isArray(value.categories) &&
    Array.isArray(value.items) &&
    value.items.every((item) =>
      item.id &&
      item.name &&
      item.category &&
      (item.status === "needed" || item.status === "notNeeded" || item.status === "have") &&
      (item.quantity === undefined || typeof item.quantity === "string"),
    )
  );
}

export function buildInitialState() {
  return {
    categories: DEFAULT_CATEGORIES,
    items: STARTER_ITEMS,
  };
}
