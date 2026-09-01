import type { ImageSourcePropType } from "react-native";

// Body-type photos, bundled as local assets.
//
// These used to be hotlinked from autotrader.ca. That CDN now 404s every one
// of them - it answers with an HTML error page - so the home page's body-type
// row had been falling back to a generic car icon, eight identical icons in a
// row that told a buyer nothing. The files are checked in and required
// statically now, so no other site's deploy can blank the row again. Metro
// needs literal require() paths; a computed one will not resolve.
const IMAGES: Record<string, ImageSourcePropType> = {
  suv: require("@/assets/body-types/suv.png"),
  truck: require("@/assets/body-types/truck.png"),
  sedan: require("@/assets/body-types/sedan.png"),
  coupe: require("@/assets/body-types/coupe.png"),
  minivan: require("@/assets/body-types/minivan.png"),
  hatchback: require("@/assets/body-types/hatchback.png"),
  convertible: require("@/assets/body-types/convertible.png"),
  wagon: require("@/assets/body-types/wagon.png"),
};

// The home page's own labels and seller-entered listing data disagree on
// plurals and wording, so match generously rather than demanding an exact key.
const TYPE_PATTERNS: Array<[RegExp, keyof typeof IMAGES]> = [
  [/suv|crossover|4x4/i, "suv"],
  [/truck|pick[\s-]?up|bakkie|lorry/i, "truck"],
  [/minivan|mpv|van|shuttle/i, "minivan"],
  [/hatch/i, "hatchback"],
  [/convertible|cabrio|roadster|spider|spyder/i, "convertible"],
  [/wagon|estate|tourer|avant/i, "wagon"],
  [/coupe|coupé/i, "coupe"],
  [/sedan|saloon|berline/i, "sedan"],
];

/**
 * Bundled photo for a body type, or null when it is not one we have artwork
 * for - callers fall back to the generic car icon in that case.
 */
export function getBodyTypeImage(type?: string | null): ImageSourcePropType | null {
  if (!type) return null;
  for (const [pattern, key] of TYPE_PATTERNS) {
    if (pattern.test(type)) return IMAGES[key];
  }
  return null;
}

export default getBodyTypeImage;
