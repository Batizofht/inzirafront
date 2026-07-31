// Categories are user-generated content stored in the database (created via the
// admin dashboard), so they can't be pre-translated in the locale files the same
// way static UI copy is. This helper maps the small set of known category names
// (and their slugs) to translation keys so they render in the active language.
// Any category name that isn't in this dictionary falls back to the raw value
// exactly as it comes from the database.

export type TranslateFn = (key: string) => string;

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  diesel: 'categories.diesel',
  'full electric car': 'categories.fullElectricCar',
  'electric car': 'categories.fullElectricCar',
  'hybrid car': 'categories.hybridCar',
  'petrol car': 'categories.petrolCar',
  electric: 'categories.electric',
  cars: 'categories.cars',
  motorcycles: 'categories.motorcycles',
  commercial: 'categories.commercial',
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Translates a category name (or slug) if it matches a known category.
 * Falls back to the original string for anything not in the dictionary,
 * so newly created admin categories still display correctly (untranslated).
 */
export function getCategoryLabel(name: string | undefined | null, t: TranslateFn): string {
  if (!name) return '';
  const key = CATEGORY_LABEL_KEYS[normalize(name)];
  return key ? t(key) : name;
}
