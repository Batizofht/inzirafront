import type { ImageSourcePropType } from "react-native";

// Brand logos, bundled as local assets.
//
// These used to be hotlinked from carlogos.org. That site restructured its
// URLs - everything under /logo/ and every /car-logos/...-download.png path
// now 301s to its homepage - so 28 of the 33 links returned an HTML page
// instead of an image and the logo row silently fell back to the car icon.
// Hotlinking a third party meant one of their deploys could take our home
// page's artwork out again, so the files are checked in and required
// statically instead. Metro needs literal require() paths; a computed one
// will not resolve.
const LOGOS: Record<string, ImageSourcePropType> = {
  acura: require("@/assets/brands/acura.png"),
  "aston-martin": require("@/assets/brands/aston-martin.png"),
  audi: require("@/assets/brands/audi.png"),
  bmw: require("@/assets/brands/bmw.png"),
  cadillac: require("@/assets/brands/cadillac.png"),
  chevrolet: require("@/assets/brands/chevrolet.png"),
  dodge: require("@/assets/brands/dodge.png"),
  fiat: require("@/assets/brands/fiat.png"),
  ford: require("@/assets/brands/ford.png"),
  gmc: require("@/assets/brands/gmc.png"),
  honda: require("@/assets/brands/honda.png"),
  hyundai: require("@/assets/brands/hyundai.png"),
  infiniti: require("@/assets/brands/infiniti.png"),
  isuzu: require("@/assets/brands/isuzu.png"),
  jaguar: require("@/assets/brands/jaguar.png"),
  jeep: require("@/assets/brands/jeep.png"),
  kia: require("@/assets/brands/kia.png"),
  "land-rover": require("@/assets/brands/land-rover.png"),
  lexus: require("@/assets/brands/lexus.png"),
  mazda: require("@/assets/brands/mazda.png"),
  "mercedes-benz": require("@/assets/brands/mercedes-benz.png"),
  mitsubishi: require("@/assets/brands/mitsubishi.png"),
  nissan: require("@/assets/brands/nissan.png"),
  peugeot: require("@/assets/brands/peugeot.png"),
  porsche: require("@/assets/brands/porsche.png"),
  renault: require("@/assets/brands/renault.png"),
  subaru: require("@/assets/brands/subaru.png"),
  suzuki: require("@/assets/brands/suzuki.png"),
  tesla: require("@/assets/brands/tesla.png"),
  toyota: require("@/assets/brands/toyota.png"),
  volkswagen: require("@/assets/brands/volkswagen.png"),
  volvo: require("@/assets/brands/volvo.png"),
};

// Names sellers actually type that do not slugify onto a file above.
const ALIASES: Record<string, string> = {
  mercedes: "mercedes-benz",
  benz: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "range-rover": "land-rover",
  rangerover: "land-rover",
  landrover: "land-rover",
  vw: "volkswagen",
  chevy: "chevrolet",
  astonmartin: "aston-martin",
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Fallback for brands we do not bundle. carlogos.org serves every make we
// tried - Dongfeng, BYD, Chery, Geely, Haval, Changan, MG - under this one
// predictable slug, so a brand nobody anticipated still gets a real logo
// instead of the generic car icon. It is only a fallback: the bundled files
// above are what the common brands use, so a bad day at carlogos.org can no
// longer blank the whole row the way it just did.
function remoteLogoUrl(slug: string): string {
  return `https://www.carlogos.org/car-logos/${slug}-logo.png`;
}

/**
 * Logo source for a brand name: the bundled asset when we have one, otherwise
 * a remote URL to look it up online. Never null - callers can pass the result
 * straight to expo-image.
 *
 * Matching is deliberately forgiving: brand names arrive from seller-entered
 * listing data, so "mercedes benz", "BMW " and "Range Rover" all have to land
 * on the right file.
 */
export function getBrandLogo(name?: string | null): ImageSourcePropType | null {
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;

  const bundled = LOGOS[slug] ?? LOGOS[ALIASES[slug]];
  if (bundled) return bundled;

  return { uri: remoteLogoUrl(ALIASES[slug] ?? slug) };
}

export default getBrandLogo;
