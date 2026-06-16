import { CATEGORY_ICONS, CATEGORY_RULES } from "../data/catalog";

const CATEGORY_ICON_ALIAS_RULES = [
  { category: "Μαναβική", keywords: ["λαχανικα", "φρουτα", "μαναβ"] },
  { category: "Γαλακτοκομικά", keywords: ["γαλακτοκομ"] },
  { category: "Κρέας / Ψάρια", keywords: ["κρεας", "ψαρι"] },
  { category: "Αλλαντικά / Τυριά", keywords: ["αλλαντικ", "τυρια"] },
  { category: "Κατάψυξη", keywords: ["καταψυξ", "κατεψυγ"] },
  { category: "Ζυμαρικά / Ρύζι", keywords: ["ζυμαρικ", "ρυζι"] },
  { category: "Κονσέρβες / Σάλτσες", keywords: ["κονσερβ", "σαλτσ", "λαδια", "οσπρια"] },
  { category: "Πρωινό / Καφέδες", keywords: ["πρωινο", "καφε", "ροφημα", "δημητριακ", "ψωμι"] },
  { category: "Σνακ / Γλυκά", keywords: ["σνακ", "γλυκ"] },
  { category: "Ποτά", keywords: ["ποτα", "αναψυκτικ", "χυμο"] },
  { category: "Καθαριότητα", keywords: ["καθαριοτ", "καθαριστικ"] },
  { icon: "🐾", keywords: ["κατοικιδ", "pet"] },
  { category: "Προσωπική φροντίδα", keywords: ["προσωπικη", "φροντιδα"] },
  { category: "Χαρτικά", keywords: ["χαρτικ", "χαρτι"] },
];

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
  if (CATEGORY_ICONS[category]) {
    return CATEGORY_ICONS[category];
  }

  const normalizedCategory = normalizeText(category);
  const matchingCategory = Object.keys(CATEGORY_ICONS).find((knownCategory) => normalizeText(knownCategory) === normalizedCategory);

  if (matchingCategory) {
    return CATEGORY_ICONS[matchingCategory];
  }

  const aliasRule = CATEGORY_ICON_ALIAS_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedCategory.includes(keyword)),
  );

  if (aliasRule?.icon) {
    return aliasRule.icon;
  }

  if (aliasRule?.category && CATEGORY_ICONS[aliasRule.category]) {
    return CATEGORY_ICONS[aliasRule.category];
  }

  return "📝";
}
