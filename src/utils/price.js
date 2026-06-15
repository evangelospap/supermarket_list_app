import { normalizeQuantityCount } from "./quantity";

const EUR_FORMATTER = new Intl.NumberFormat("el-GR", {
  currency: "EUR",
  style: "currency",
});

export function normalizeEstimatedPrice(value) {
  return typeof value === "string" ? value : "";
}

export function parseEstimatedPrice(value) {
  const normalizedValue = normalizeEstimatedPrice(value).trim().replace(",", ".");

  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalizedValue)) {
    return 0;
  }

  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

export function getEstimatedLineTotal(item) {
  return parseEstimatedPrice(item?.estimatedPrice) * normalizeQuantityCount(item?.quantityCount);
}

export function formatEuroAmount(value) {
  return EUR_FORMATTER.format(Number.isFinite(value) ? value : 0);
}
