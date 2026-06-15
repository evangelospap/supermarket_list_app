import { DEFAULT_CATEGORIES, STARTER_ITEMS } from "../data/catalog";
import { normalizeEstimatedPrice } from "./price";
import { getQuantityNote, normalizeQuantityCount } from "./quantity";

function isValidLearnedProducts(value) {
  return (
    value === undefined ||
    (value &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      Object.entries(value).every(
        ([code, product]) =>
          typeof code === "string" &&
          code.trim() &&
          product &&
          !Array.isArray(product) &&
          typeof product === "object" &&
          typeof product.name === "string" &&
          product.name.trim() &&
          typeof product.category === "string" &&
          product.category.trim(),
      ))
  );
}

export function isValidState(value) {
  return (
    value &&
    Array.isArray(value.categories) &&
    Array.isArray(value.items) &&
    isValidLearnedProducts(value.learnedProducts) &&
    value.items.every((item) =>
      item.id &&
      item.name &&
      item.category &&
      (item.status === "needed" || item.status === "notNeeded" || item.status === "have") &&
      (item.quantityCount === undefined ||
        (Number.isFinite(item.quantityCount) && item.quantityCount >= 1)) &&
      (item.estimatedPrice === undefined || typeof item.estimatedPrice === "string") &&
      (item.quantityNote === undefined || typeof item.quantityNote === "string") &&
      (item.quantity === undefined || typeof item.quantity === "string"),
    )
  );
}

function normalizeItem(item) {
  const { quantity, ...rest } = item;

  return {
    ...rest,
    estimatedPrice: normalizeEstimatedPrice(item.estimatedPrice),
    quantityCount: normalizeQuantityCount(item.quantityCount),
    quantityNote: getQuantityNote(item),
  };
}

export function normalizeState(value) {
  return {
    ...value,
    items: Array.isArray(value?.items) ? value.items.map(normalizeItem) : [],
    learnedProducts: value?.learnedProducts ?? {},
  };
}

export function buildInitialState() {
  return {
    categories: DEFAULT_CATEGORIES,
    items: STARTER_ITEMS.map(normalizeItem),
    learnedProducts: {},
  };
}
