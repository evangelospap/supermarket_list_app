export function normalizeQuantityCount(value) {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

export function getQuantityNote(item) {
  if (typeof item?.quantityNote === "string") {
    return item.quantityNote;
  }

  return typeof item?.quantity === "string" ? item.quantity : "";
}

export function getQuantitySummary(item) {
  const count = normalizeQuantityCount(item?.quantityCount);
  const note = getQuantityNote(item).trim();

  return note ? `${count} x ${note}` : String(count);
}

export function hasCustomQuantity(item) {
  return normalizeQuantityCount(item?.quantityCount) > 1 || Boolean(getQuantityNote(item).trim());
}
