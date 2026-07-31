// Vehicle brands for the Rwanda market, grouped by origin (per Inzira_Brand_List.pdf).
// Grouping is display-only — the value stored on a listing is still just the
// plain brand name string. VEHICLE_BRAND_OPTIONS stays a flat list so every
// existing consumer (search, matching, hero mega-search) keeps working.

export interface VehicleBrandGroup {
  region: string;
  brands: readonly string[];
}

export const VEHICLE_BRAND_GROUPS: readonly VehicleBrandGroup[] = [
  {
    region: "Japanese",
    brands: [
      "Toyota",
      "Nissan",
      "Honda",
      "Suzuki",
      "Mitsubishi",
      "Subaru",
      "Mazda",
      "Isuzu",
      "Daihatsu",
      "Lexus",
      "Infiniti",
      "Acura",
    ],
  },
  {
    region: "Korean",
    brands: ["Hyundai", "Kia", "Genesis", "Daewoo"],
  },
  {
    region: "European",
    brands: [
      "Mercedes-Benz",
      "BMW",
      "Volkswagen",
      "Audi",
      "Land Rover",
      "Jaguar",
      "Porsche",
      "Volvo",
      "Peugeot",
      "Renault",
      "Citroen",
      "Fiat",
      "Alfa Romeo",
      "Mini",
      "Skoda",
      "Seat",
      "Opel",
      "Dacia",
      "Saab",
      "Ferrari",
      "Lamborghini",
      "Maserati",
      "Bentley",
      "Rolls-Royce",
      "Aston Martin",
    ],
  },
  {
    region: "American",
    brands: [
      "Ford",
      "Chevrolet",
      "Jeep",
      "Tesla",
      "Cadillac",
      "Chrysler",
      "Dodge",
      "GMC",
      "Buick",
      "Lincoln",
      "Hummer",
      "RAM",
    ],
  },
  {
    region: "Chinese",
    brands: [
      "BYD",
      "MG",
      "Chery",
      "Geely",
      "Haval",
      "Changan",
      "Great Wall",
      "Venucia",
      "Aeolus",
      "NETA",
      "JAC",
      "BAIC",
      "DFSK",
      "Foton",
      "Dongfeng",
      "GAC Aion",
      "Xpeng",
      "Leapmotor",
      "Zeekr",
    ],
  },
] as const;

/** Flat list of all brand names — backward compatible with existing consumers. */
export const VEHICLE_BRAND_OPTIONS: readonly string[] = VEHICLE_BRAND_GROUPS.flatMap(
  (group) => group.brands
);

/**
 * Filters brand groups by a search query. Non-matching brands are removed and
 * empty groups dropped. An empty query returns all groups.
 */
export function filterBrandGroups(query: string): VehicleBrandGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return VEHICLE_BRAND_GROUPS.map((g) => ({ region: g.region, brands: [...g.brands] }));
  return VEHICLE_BRAND_GROUPS.map((g) => ({
    region: g.region,
    brands: g.brands.filter((b) => b.toLowerCase().includes(q)),
  })).filter((g) => g.brands.length > 0);
}
