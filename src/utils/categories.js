import { CATEGORY_ICONS, CATEGORY_RULES } from "../data/catalog";

export function normalizeText(value) {
  return value
    .toLocaleLowerCase("el-GR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function suggestCategory(name) {
  const normalized = normalizeText(name);
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
  );

  return match?.category ?? "Να μην ξεχάσω";
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] ?? "🛒";
}
