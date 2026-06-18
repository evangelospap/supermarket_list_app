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

function normalizeHomeSnapshot(snapshot) {
  return {
    ...snapshot,
    createdAt: typeof snapshot?.createdAt === "string" ? snapshot.createdAt : new Date().toISOString(),
    id: typeof snapshot?.id === "string" ? snapshot.id : `home-${Date.now()}`,
    items: Array.isArray(snapshot?.items) ? snapshot.items.map(normalizeItem) : [],
  };
}

function normalizeCategories(value) {
  const categories = Array.isArray(value?.categories) ? value.categories : [];
  const itemCategories = Array.isArray(value?.items) ? value.items.map((item) => item?.category) : [];

  return [...categories, ...itemCategories].filter(
    (category, index, allCategories) =>
      typeof category === "string" && category.trim() && allCategories.indexOf(category) === index,
  );
}

export function normalizeState(value) {
  return {
    ...value,
    categories: normalizeCategories(value),
    homeSnapshots: Array.isArray(value?.homeSnapshots) ? value.homeSnapshots.map(normalizeHomeSnapshot) : [],
    items: Array.isArray(value?.items) ? value.items.map(normalizeItem) : [],
    learnedProducts: value?.learnedProducts ?? {},
  };
}

export function buildInitialState() {
  return {
    categories: DEFAULT_CATEGORIES,
    homeSnapshots: [],
    items: STARTER_ITEMS.map(normalizeItem),
    learnedProducts: {},
  };
}
