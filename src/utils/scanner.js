export const SCANNER_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128"];

export function normalizeScannedCode(value) {
  const text = String(value ?? "").trim();
  const digitMatch = text.match(/\b\d{8,14}\b/);

  return digitMatch?.[0] ?? text;
}
