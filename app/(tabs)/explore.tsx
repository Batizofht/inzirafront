import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { RangeSlider } from "@/components/ui/range-slider";
import { fetchVehicles } from "@/lib/api-vehicles";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api-favorites";
import { fetchCategories, type Category } from "@/lib/api-categories";
import {
  fetchMySubscription,
  hasActiveSubscription as checkActiveSub,
} from "@/lib/api-subscriptions";
import { getAuthUser } from "@/lib/userPreference";
import type { Vehicle } from "@/types/vehicle";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { resolveImageUrl } from "@/lib/image-url";
import { ExploreSEO } from "@/components/page-meta";
import {
  displayPrice,
  getPriceFilters,
  formatFilterPrice,
  getCurrentCurrencySymbol,
  getCurrencyPreference,
  type CurrencyCode,
  convertCurrency,
} from "@/lib/currencyConverter";

const USAGE_STATUS_FILTERS = [
  "Brand New",
  "Imported Used",
  "Used In Rwanda",
] as const;

// Price filters are now dynamically generated based on selected currency

const SORT_OPTIONS = [
  {
    id: "newest",
    label: "Newest Listed",
    description: "Most recently added vehicles first",
  },
  {
    id: "price_high_low",
    label: "Price: High to Low",
    description: "Most expensive first",
  },
  {
    id: "price_low_high",
    label: "Price: Low to High",
    description: "Most affordable first",
  },
  {
    id: "year_new_old",
    label: "Year: Newest First",
    description: "Latest model years",
  },
  {
    id: "year_old_new",
    label: "Year: Oldest First",
    description: "Classic and older vehicles",
  },
  { id: "title_az", label: "Name: A to Z", description: "Alphabetical order" },
  {
    id: "rwanda_entry_new",
    label: "Recently in Rwanda",
    description: "Newly arrived imports",
  },
] as const;

const MIN_PRICE_RWF = 0; // Allow filtering from 0
const MAX_PRICE_RWF = 100000000; // 100M FRW maximum
const SLIDER_STEP_RWF = 100000; // 100k RWF steps
const SLIDER_STEP_USD = 100; // $100 steps
const SLIDER_STEP_EUR = 100; // €100 steps

// Color name to hex mapping for UI circles
const COLOR_MAP: Record<string, string> = {
  "Pearl White": "#F8F8F8",
  Silver: "#C0C0C0",
  Black: "#1A1A1A",
  Red: "#DC2626",
  Blue: "#2563EB",
  Gray: "#6B7280",
  White: "#FFFFFF",
  Green: "#16A34A",
  Yellow: "#EAB308",
  Orange: "#F97316",
  Brown: "#92400E",
  Gold: "#D97706",
  Beige: "#D4C5A9",
  Navy: "#1E3A5F",
  Purple: "#9333EA",
};

const getColorHex = (colorName: string): string =>
  COLOR_MAP[colorName] || "#6B7280";

type UsageStatusFilter = (typeof USAGE_STATUS_FILTERS)[number];
type PriceFilterId =
  | "under_500k"
  | "500k_2m"
  | "2m_5m"
  | "5m_10m"
  | "10m_20m"
  | "under_15k"
  | "15k_30k"
  | "30k_50k"
  | "50k_plus";
type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];

const parsePrice = (price: string | number) => {
  if (typeof price === "number") {
    return Number.isFinite(price) ? Math.round(price) : 0;
  }

  const raw = String(price ?? "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return 0;

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  let normalized = cleaned;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      const [left, right = ""] = cleaned.split(",");
      normalized = right.length === 3 ? `${left}${right}` : `${left}.${right}`;
    }
  } else if (dotCount > 0) {
    if (dotCount > 1) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      const [left, right = ""] = cleaned.split(".");
      normalized = right.length === 3 ? `${left}${right}` : `${left}.${right}`;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};
const parseYear = (year: string) => Number(year.replace(/[^0-9]/g, ""));

const normalizeCategoryValue = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

export default function ExploreScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Explore Vehicles | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === "dark";
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedUsageStatuses, setSelectedUsageStatuses] = useState<
    UsageStatusFilter[]
  >([]);
  const [selectedPriceFilters, setSelectedPriceFilters] = useState<
    PriceFilterId[]
  >([]);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>("RWF");
  const [customMinPrice, setCustomMinPrice] = useState(0); // Start at 0 (no filter)
  const [customMaxPrice, setCustomMaxPrice] = useState(MAX_PRICE_RWF);
  const [priceFilters, setPriceFilters] = useState(() =>
    getPriceFilters("RWF"),
  );
  const [selectedModelTypes, setSelectedModelTypes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMileageRange, setSelectedMileageRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("newest");
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const loginRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loginToastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const params = useLocalSearchParams();

  useEffect(() => {
    const categoryParam =
      typeof params.category === "string" ? params.category : "";
    const brandParam = typeof params.brand === "string" ? params.brand : "";
    const modelParam = typeof params.model === "string" ? params.model : "";
    const mileageParam =
      typeof params.mileage === "string" ? params.mileage : "";
    const qParam = typeof params.q === "string" ? params.q : "";
    const usageParam = typeof params.usage === "string" ? params.usage : "";

    // Reset category or set from param
    if (categoryParam) {
      // Map "Cars" from hero section to "All" in explore
      setSelectedCategory(categoryParam === "Cars" ? "All" : categoryParam);
    } else {
      setSelectedCategory("All");
    }

    // Reset brands or set from param
    if (brandParam) {
      const nextBrands = brandParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setSelectedBrands(nextBrands);
    } else {
      setSelectedBrands([]);
    }

    // Reset models or set from param
    if (modelParam) {
      const nextModels = modelParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setSelectedModelTypes(nextModels);
    } else {
      setSelectedModelTypes([]);
    }

    // Reset mileage or set from param
    if (mileageParam) {
      // Parse mileage range and apply filter in background
      if (mileageParam.includes("-")) {
        const [min, max] = mileageParam
          .split("-")
          .map((v) => parseInt(v.trim()));
        setSelectedMileageRange({ min: min || 0, max: max || 999999999 });
      } else if (mileageParam.includes("+")) {
        const min = parseInt(mileageParam.replace("+", "").trim());
        setSelectedMileageRange({ min: min || 0, max: 999999999 });
      }
    } else {
      setSelectedMileageRange(null);
    }

    // Reset search query or set from param
    if (qParam) {
      setSearchQuery(qParam);
    } else {
      setSearchQuery("");
    }

    // Reset usage status or set from param
    if (usageParam && USAGE_STATUS_FILTERS.includes(usageParam as UsageStatusFilter)) {
      setSelectedUsageStatuses([usageParam as UsageStatusFilter]);
    } else {
      setSelectedUsageStatuses([]);
    }
  }, [params.brand, params.category, params.model, params.mileage, params.q, params.usage]);

  const modelTypeFilters = useMemo(() => {
    const values = new Set<string>();
    vehicles.forEach((vehicle) => {
      if (vehicle.vehicleType) values.add(vehicle.vehicleType);
      if (vehicle.model) values.add(vehicle.model);
    });
    return Array.from(values);
  }, [vehicles]);

  const colorFilters = useMemo(() => {
    const values = new Set<string>();
    vehicles.forEach((vehicle) => {
      if (vehicle.color) {
        values.add(vehicle.color);
      }
    });
    return Array.from(values);
  }, [vehicles]);

  const brandFilters = useMemo(() => {
    const values = new Set<string>();
    vehicles.forEach((vehicle) => values.add(vehicle.brand));
    return Array.from(values).sort();
  }, [vehicles]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [vehiclesRes, favoritesRes, categoriesRes] = await Promise.all([
          fetchVehicles({ status: "active" }),
          fetchFavorites().catch(() => ({ data: { favorites: [] } })),
          fetchCategories().catch(() => ({ data: { categories: [] } })),
        ]);
        // Check subscription status
        let subActive = false;
        try {
          const subRes = await fetchMySubscription();
          subActive = checkActiveSub(subRes.data?.subscription);
        } catch {
          // No subscription
        }

        if (mounted) {
          setVehicles(vehiclesRes.data.vehicles);
          setFavoriteIds(favoritesRes.data.favorites.map((f) => f.vehicleId));
          setCategories(categoriesRes.data.categories);
          setHasActiveSub(subActive);
        }
      } catch (err) {
        console.error("Failed to load explore data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (loginRedirectTimerRef.current) {
        clearTimeout(loginRedirectTimerRef.current);
      }
      if (loginToastHideTimerRef.current) {
        clearTimeout(loginToastHideTimerRef.current);
      }
    };
  }, []);

  // Track currency changes and update price filters
  useEffect(() => {
    const checkCurrency = () => {
      const newCurrency = getCurrencyPreference();
      if (newCurrency !== currentCurrency) {
        setCurrentCurrency(newCurrency);
        setPriceFilters(getPriceFilters(newCurrency));
        // Reset custom range when currency changes to avoid confusion
        setCustomMinPrice(0);
        setCustomMaxPrice(MAX_PRICE_RWF);
      }
    };

    checkCurrency();
    const interval = setInterval(checkCurrency, 1000); // Check every second
    return () => clearInterval(interval);
  }, [currentCurrency]);

  // Helper to get slider step based on currency
  const getSliderStep = () => {
    switch (currentCurrency) {
      case "USD":
        return SLIDER_STEP_USD;
      case "EUR":
        return SLIDER_STEP_EUR;
      case "RWF":
      default:
        return SLIDER_STEP_RWF;
    }
  };

  const isFavorited = (id: string) => favoriteIds.includes(id);

  const redirectToLoginWithToast = () => {
    setShowLoginToast(true);

    if (loginRedirectTimerRef.current) {
      clearTimeout(loginRedirectTimerRef.current);
    }
    if (loginToastHideTimerRef.current) {
      clearTimeout(loginToastHideTimerRef.current);
    }

    loginRedirectTimerRef.current = setTimeout(() => {
      router.push("/auth/login" as any);
    }, 700);

    loginToastHideTimerRef.current = setTimeout(() => {
      setShowLoginToast(false);
    }, 2200);
  };

  const ensureLoggedIn = async () => {
    const user = await getAuthUser();
    if (user) return true;
    redirectToLoginWithToast();
    return false;
  };

  const handleToggleFavorite = async (id: string) => {
    const isAuthenticated = await ensureLoggedIn();
    if (!isAuthenticated) return;
    try {
      if (isFavorited(id)) {
        await removeFavorite(id);
        setFavoriteIds((prev) => prev.filter((fid) => fid !== id));
      } else {
        await addFavorite(id);
        setFavoriteIds((prev) => [...prev, id]);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    }
  };

  const goToVehicle = (id: string) => {
    router.push(`/vehicle/${id}` as any);
  };

  const goToSearch = () => {
    const q = searchQuery.trim();
    const href =
      q.length > 0
        ? (`/search?q=${encodeURIComponent(q)}` as any)
        : ("/search" as any);
    router.push(href);
  };

  const toggleUsageFilter = (value: UsageStatusFilter) => {
    setSelectedUsageStatuses((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const togglePriceFilter = (value: PriceFilterId) => {
    setSelectedPriceFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleModelTypeFilter = (value: string) => {
    setSelectedModelTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleColorFilter = (value: string) => {
    setSelectedColors((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleBrandFilter = (value: string) => {
    setSelectedBrands((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const clearAdvancedFilters = () => {
    setSelectedUsageStatuses([]);
    setSelectedPriceFilters([]);
    setCustomMinPrice(0);
    setCustomMaxPrice(MAX_PRICE_RWF);
    setSelectedModelTypes([]);
    setSelectedColors([]);
    setSelectedBrands([]);
    setSelectedMileageRange(null);
  };

  const filteredVehicles = useMemo(() => {
    const loweredQuery = searchQuery.trim().toLowerCase();
    // Has custom range if user moved min above 0 or max below max
    const hasCustomRange = customMinPrice > 0 || customMaxPrice < MAX_PRICE_RWF;

    const baseFiltered = vehicles.filter((vehicle) => {
      const selectedCategoryNormalized =
        normalizeCategoryValue(selectedCategory);
      const vehicleTypeNormalized = normalizeCategoryValue(vehicle.vehicleType);
      const categoryOk =
        selectedCategoryNormalized === "all" ||
        vehicleTypeNormalized === selectedCategoryNormalized;

      const usageOk =
        selectedUsageStatuses.length === 0 ||
        selectedUsageStatuses.includes(
          vehicle.usageStatus as UsageStatusFilter,
        );

      const vehiclePrice = parsePrice(vehicle.price);
      // Price filtering: use custom range if set, otherwise use price filter chips
      // ONLY show cars IN THE SELECTED RANGE - nothing else
      const priceOk = hasCustomRange
        ? vehiclePrice >= customMinPrice && vehiclePrice <= customMaxPrice
        : selectedPriceFilters.length === 0 ||
          priceFilters
            .filter((item) => selectedPriceFilters.includes(item.id))
            .some(
              (range) =>
                vehiclePrice >= range.rawRWFMin &&
                vehiclePrice < range.rawRWFMax,
            );

      const modelTypeOk =
        selectedModelTypes.length === 0 ||
        (vehicle.model && selectedModelTypes.includes(vehicle.model)) ||
        (vehicle.vehicleType &&
          selectedModelTypes.includes(vehicle.vehicleType));

      const queryOk =
        loweredQuery.length === 0 ||
        vehicle.title.toLowerCase().includes(loweredQuery) ||
        vehicle.model.toLowerCase().includes(loweredQuery) ||
        vehicle.brand.toLowerCase().includes(loweredQuery);

      const colorOk =
        selectedColors.length === 0 ||
        (vehicle.color ? selectedColors.includes(vehicle.color) : false);

      const brandOk =
        selectedBrands.length === 0 || selectedBrands.includes(vehicle.brand);

      // Mileage filtering (parse vehicle mileage and check range)
      const vehicleMileage =
        parseInt(String(vehicle.mileage || "0").replace(/[^0-9]/g, "")) || 0;
      const mileageOk =
        !selectedMileageRange ||
        (vehicleMileage >= selectedMileageRange.min &&
          vehicleMileage <= selectedMileageRange.max);

      return (
        categoryOk &&
        usageOk &&
        priceOk &&
        modelTypeOk &&
        queryOk &&
        colorOk &&
        brandOk &&
        mileageOk
      );
    });

    const sorted = [...baseFiltered].sort((a, b) => {
      if (selectedSort === "price_high_low")
        return parsePrice(b.price) - parsePrice(a.price);
      if (selectedSort === "price_low_high")
        return parsePrice(a.price) - parsePrice(b.price);
      if (selectedSort === "title_az") return a.title.localeCompare(b.title);
      if (selectedSort === "year_new_old")
        return parseYear(b.year) - parseYear(a.year);
      if (selectedSort === "year_old_new")
        return parseYear(a.year) - parseYear(b.year);
      if (selectedSort === "rwanda_entry_new") {
        const aRwandaScore = a.usageStatus === "Used In Rwanda" ? 1 : 0;
        const bRwandaScore = b.usageStatus === "Used In Rwanda" ? 1 : 0;
        if (aRwandaScore !== bRwandaScore) return bRwandaScore - aRwandaScore;
        return parseYear(b.year) - parseYear(a.year);
      }

      return parseYear(b.year) - parseYear(a.year);
    });

    return sorted;
  }, [
    searchQuery,
    selectedCategory,
    selectedUsageStatuses,
    selectedPriceFilters,
    customMinPrice,
    customMaxPrice,
    selectedModelTypes,
    selectedColors,
    selectedBrands,
    selectedSort,
    vehicles,
    priceFilters,
    selectedMileageRange,
  ]);

  const hasCustomRange = customMinPrice > 0 || customMaxPrice < MAX_PRICE_RWF;
  const activeAdvancedFiltersCount =
    selectedUsageStatuses.length +
    selectedPriceFilters.length +
    selectedModelTypes.length +
    selectedColors.length +
    selectedBrands.length +
    (hasCustomRange ? 1 : 0);
  const activeDesktopFilterCount =
    activeAdvancedFiltersCount + (selectedCategory !== "All" ? 1 : 0);
  const mobileActiveFilterCount =
    activeAdvancedFiltersCount + (selectedCategory !== "All" ? 1 : 0);
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.id === selectedSort)?.label ??
    "Newest";
  const skeletonBase = isDark ? "#1F2937" : "#E5E7EB";
  const skeletonSoft = isDark ? "#111827" : "#F3F4F6";
  const skeletonLineStyle = styles.skeletonLine as any;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ExploreSEO />
      {showLoginToast && (
        <View pointerEvents="none" style={styles.toastOverlay}>
          <View
            style={[
              styles.toastCard,
              { backgroundColor: theme === "dark" ? "#0F172A" : "#111827" },
            ]}
          >
            <IconSymbol
              name="exclamationmark.circle.fill"
              size={18}
              color="#F59E0B"
            />
            <ThemedText style={styles.toastText}>
              You must first login
            </ThemedText>
          </View>
        </View>
      )}
      {isDesktopWeb ? (
        // Web Layout with Left Sidebar Filters
        <View style={styles.webContainer}>
          {/* Left Sidebar - Filters */}
          <View
            style={[
              styles.webSidebar,
              { backgroundColor: colors.card, borderRightColor: colors.border },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={isDesktopWeb}
              contentContainerStyle={styles.webSidebarContent}
            >
              <View
                style={[
                  styles.webSidebarHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.webSidebarTitle}
                >
                  Smart Filters
                </ThemedText>
                <ThemedText
                  style={[styles.webSidebarSubtitle, { color: colors.icon }]}
                >
                  Find your dream car faster
                </ThemedText>
                <View
                  style={[
                    styles.webActiveBadge,
                    { backgroundColor: `${colors.primary}18` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.webActiveBadgeText,
                      { color: colors.primary },
                    ]}
                  >
                    {activeDesktopFilterCount} active
                  </ThemedText>
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol name="list" size={14} color={colors.icon} />
                  <ThemedText style={styles.webFilterLabel}>
                    Category
                  </ThemedText>
                </View>
                <View style={styles.brandGrid}>
                  <TouchableOpacity
                    key="all"
                    style={[
                      styles.brandGridItem,
                      selectedCategory === "All" && [
                        styles.webChipActive,
                        {
                          backgroundColor: `${colors.primary}14`,
                          borderColor: colors.primary,
                        },
                      ],
                      {
                        borderColor:
                          selectedCategory === "All"
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory("All")}
                  >
                    <ThemedText
                      style={{
                        color:
                          selectedCategory === "All"
                            ? colors.primary
                            : colors.text,
                        fontSize: 13,
                        fontWeight: selectedCategory === "All" ? "600" : "500",
                      }}
                    >
                      All
                    </ThemedText>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.brandGridItem,
                        selectedCategory === cat.name && [
                          styles.webChipActive,
                          {
                            backgroundColor: `${colors.primary}14`,
                            borderColor: colors.primary,
                          },
                        ],
                        {
                          borderColor:
                            selectedCategory === cat.name
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat.name)}
                    >
                      <ThemedText
                        style={{
                          color:
                            selectedCategory === cat.name
                              ? colors.primary
                              : colors.text,
                          fontWeight:
                            selectedCategory === cat.name ? "600" : "400",
                          fontSize: 12,
                          textAlign: "center",
                        }}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Usage Status */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={14}
                    color={colors.icon}
                  />
                  <ThemedText style={styles.webFilterLabel}>
                    Usage Status
                  </ThemedText>
                </View>
                <View style={styles.brandGrid}>
                  {USAGE_STATUS_FILTERS.map((item) => {
                    const active = selectedUsageStatuses.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.brandGridItem,
                          active && [
                            styles.webChipActive,
                            {
                              backgroundColor: `${colors.primary}14`,
                              borderColor: colors.primary,
                            },
                          ],
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => toggleUsageFilter(item)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontWeight: active ? "600" : "400",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                          numberOfLines={1}
                        >
                          {item}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Brand Filter */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol name="car.fill" size={14} color={colors.icon} />
                  <ThemedText style={styles.webFilterLabel}>Brand</ThemedText>
                </View>
                <View style={styles.brandGrid}>
                  {brandFilters.map((brand) => {
                    const active = selectedBrands.includes(brand);
                    return (
                      <TouchableOpacity
                        key={brand}
                        style={[
                          styles.brandGridItem,
                          active && [
                            styles.webChipActive,
                            {
                              backgroundColor: `${colors.primary}14`,
                              borderColor: colors.primary,
                            },
                          ],
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => toggleBrandFilter(brand)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontWeight: active ? "600" : "400",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                          numberOfLines={1}
                        >
                          {brand}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Color Filter */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol name="photo" size={14} color={colors.icon} />
                  <ThemedText style={styles.webFilterLabel}>Color</ThemedText>
                </View>
                <View style={styles.colorCirclesWrap}>
                  {colorFilters.map((color) => {
                    const active = selectedColors.includes(color);
                    const colorHex = getColorHex(color);
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: colorHex },
                          active && [
                            styles.colorCircleActive,
                            { borderColor: colors.primary },
                          ],
                        ]}
                        onPress={() => toggleColorFilter(color)}
                        accessibilityLabel={color}
                      >
                        {active && (
                          <IconSymbol
                            name="checkmark"
                            size={14}
                            color={
                              colorHex === "#FFFFFF" || colorHex === "#F8F8F8"
                                ? "#000"
                                : "#fff"
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Price Range */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol
                    name="creditcard.fill"
                    size={14}
                    color={colors.icon}
                  />
                  <ThemedText style={styles.webFilterLabel}>
                    Price Range
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.webPriceRangeCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.webRangeHint, { color: colors.icon }]}
                  >
                    Set your budget range
                  </ThemedText>
                  <ThemedText style={{ color: colors.icon, fontSize: 12 }}>
                    Min: {formatFilterPrice(customMinPrice)}
                  </ThemedText>
                  <RangeSlider
                    value={customMinPrice}
                    minimumValue={MIN_PRICE_RWF}
                    maximumValue={customMaxPrice - getSliderStep()}
                    step={getSliderStep()}
                    onValueChange={setCustomMinPrice}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                  />
                  <ThemedText
                    style={{ color: colors.icon, fontSize: 12, marginTop: 8 }}
                  >
                    Max: {formatFilterPrice(customMaxPrice)}
                  </ThemedText>
                  <RangeSlider
                    value={customMaxPrice}
                    minimumValue={customMinPrice + getSliderStep()}
                    maximumValue={MAX_PRICE_RWF}
                    step={getSliderStep()}
                    onValueChange={setCustomMaxPrice}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                  />
                </View>
              </View>

              {/* Clear Filters */}
              {(activeAdvancedFiltersCount > 0 ||
                selectedCategory !== "All") && (
                <TouchableOpacity
                  style={[
                    styles.webClearBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => {
                    clearAdvancedFilters();
                    setSelectedCategory("All");
                  }}
                >
                  <IconSymbol
                    name="arrow.counterclockwise"
                    size={14}
                    color={colors.primary}
                  />
                  <ThemedText
                    style={{ color: colors.primary, fontWeight: "600" }}
                  >
                    Reset Filters
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Main Content - Search & Results */}
          <View style={styles.webMainContent}>
            {/* Results Grid */}
            <ScrollView
              showsVerticalScrollIndicator={isDesktopWeb}
              contentContainerStyle={[
                styles.webResultsContent,
                {
                  paddingHorizontal: is2Xl ? 300 : isXl ? 160 : isLg ? 80 : 40,
                },
              ]}
            >
              {/* Search Header - Inside ScrollView */}
              <View
                style={[
                  styles.webSearchHeader,
                  {
                    backgroundColor: colors.background,
                    borderBottomColor: colors.border,
                    paddingBottom: 16,
                    marginBottom: 16,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={styles.webPageTitle}>
                  {t("explore.title")}
                </ThemedText>
                <View
                  style={[
                    styles.webSearchContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <IconSymbol
                    name="magnifyingglass"
                    size={20}
                    color={colors.icon}
                  />
                  <TextInput
                    style={[styles.webSearchInput, { color: colors.text }]}
                    placeholder={t("explore.searchPlaceholder")}
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <View style={styles.webSortRow}>
                  <ThemedText style={{ color: colors.icon }}>
                    {filteredVehicles.length} results
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.webSortBtn, { borderColor: colors.border }]}
                    onPress={() => setShowSortSheet(true)}
                  >
                    <ThemedText style={{ fontSize: 14 }}>
                      {selectedSortLabel}
                    </ThemedText>
                    <IconSymbol
                      name="chevron.down"
                      size={16}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.webResultsGrid}>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <View
                        key={`web-car-skeleton-${idx}`}
                        style={[
                          styles.webResultCard,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.webImageContainer,
                            { backgroundColor: skeletonSoft },
                          ]}
                        />
                        <View style={styles.webResultInfo}>
                          <View
                            style={[
                              skeletonLineStyle,
                              {
                                width: "74%",
                                height: 16,
                                backgroundColor: skeletonBase,
                              },
                            ]}
                          />
                          <View
                            style={[
                              skeletonLineStyle,
                              {
                                width: "42%",
                                height: 12,
                                backgroundColor: skeletonBase,
                              },
                            ]}
                          />
                          <View
                            style={[
                              skeletonLineStyle,
                              {
                                width: "56%",
                                height: 18,
                                backgroundColor: skeletonBase,
                              },
                            ]}
                          />
                          <View
                            style={[
                              skeletonLineStyle,
                              {
                                width: "68%",
                                height: 12,
                                marginBottom: 0,
                                backgroundColor: skeletonBase,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  : filteredVehicles.map((vehicle) => (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.webResultCard,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => goToVehicle(vehicle.id)}
                      >
                        <View style={styles.webImageContainer}>
                          <Image
                            source={{
                              uri: resolveImageUrl(vehicle.images?.[0]),
                            }}
                            style={styles.webResultImage}
                            contentFit="cover"
                          />
                          <TouchableOpacity
                            style={[
                              styles.webFavoriteBtn,
                              {
                                backgroundColor: isDark
                                  ? "rgba(0,0,0,0.5)"
                                  : "rgba(255,255,255,0.9)",
                              },
                            ]}
                            onPress={() => handleToggleFavorite(vehicle.id)}
                          >
                            <IconSymbol
                              name="heart.fill"
                              size={18}
                              color={
                                isFavorited(vehicle.id)
                                  ? "#EF4444"
                                  : colors.icon
                              }
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.webResultInfo}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <ThemedText
                              style={styles.webVehicleTitle}
                              numberOfLines={2}
                            >
                              {vehicle.title}
                            </ThemedText>
                            {(vehicle.verificationStatus === "approved" ||
                              vehicle.sellerTier === "trusted" ||
                              vehicle.sellerTier === "dealer_pro") && (
                              <View
                                style={{
                                  marginLeft: 6,
                                  backgroundColor: "#3B82F6",
                                  borderRadius: 10,
                                  width: 16,
                                  height: 16,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  overflow: "hidden",
                                }}
                              >
                                <IconSymbol
                                  name="checkmark"
                                  size={12}
                                  color="#fff"
                                />
                              </View>
                            )}
                          </View>
                          <ThemedText
                            style={[
                              styles.webUsageStatus,
                              { color: colors.primary },
                            ]}
                          >
                            {vehicle.usageStatus}
                          </ThemedText>
                          {hasActiveSub && (
                            <ThemedText
                              style={[
                                styles.webSeller,
                                { color: colors.icon, marginTop: 4 },
                              ]}
                              numberOfLines={1}
                            >
                              {vehicle.sellerName || "Unknown Seller"}
                            </ThemedText>
                          )}
                          <ThemedText
                            style={[
                              styles.webVehiclePrice,
                              { color: colors.text },
                            ]}
                          >
                            {displayPrice(parsePrice(vehicle.price))}
                          </ThemedText>
                          <View style={styles.webVehicleSpecs}>
                            <ThemedText
                              style={[
                                styles.webSpecText,
                                { color: colors.icon },
                              ]}
                            >
                              {vehicle.mileage}
                            </ThemedText>
                            <View
                              style={[
                                styles.webSpecDot,
                                { backgroundColor: colors.border },
                              ]}
                            />
                            <ThemedText
                              style={[
                                styles.webSpecText,
                                { color: colors.icon },
                              ]}
                            >
                              {vehicle.vehicleType}
                            </ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
              </View>
              {!isLoading && filteredVehicles.length === 0 && (
                <View style={styles.webEmptyState}>
                  <ThemedText style={{ color: colors.icon }}>
                    No vehicles match your filters.
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        // Mobile Layout (original)
        <>
          <ScrollView
            showsVerticalScrollIndicator={isDesktopWeb}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header - Inside ScrollView */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
              <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                {t("explore.title")}
              </ThemedText>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <IconSymbol
                  name="magnifyingglass"
                  size={20}
                  color={colors.icon}
                  style={styles.searchIcon}
                />
                <TouchableOpacity
                  style={styles.searchTapArea}
                  onPress={goToSearch}
                  activeOpacity={0.8}
                >
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t("explore.searchPlaceholder")}
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    editable={false}
                    pointerEvents="none"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterIconBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() => setShowFilterSheet(true)}
                >
                  <ThemedText
                    style={[styles.filterTriggerText, { color: colors.primary }]}
                  >
                    Filters
                  </ThemedText>
                  <IconSymbol
                    name="chevron.down"
                    size={20}
                    color={colors.primary}
                  />
                  {activeAdvancedFiltersCount > 0 && (
                    <View
                      style={[
                        styles.filterCountBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <ThemedText style={styles.filterCountText}>
                        {activeAdvancedFiltersCount}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters - Inside ScrollView */}
            <View
              style={[
                styles.filtersContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
              >
                <TouchableOpacity
                  key="all"
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        selectedCategory === "All" ? colors.text : "transparent",
                      borderColor:
                        selectedCategory === "All" ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory("All")}
                >
                  <ThemedText
                    style={[
                      styles.filterText,
                      {
                        color:
                          selectedCategory === "All"
                            ? colors.background
                            : colors.text,
                        fontWeight: selectedCategory === "All" ? "600" : "500",
                      },
                    ]}
                  >
                    All
                  </ThemedText>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          selectedCategory === cat.name
                            ? colors.text
                            : "transparent",
                        borderColor:
                          selectedCategory === cat.name
                            ? colors.text
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <ThemedText
                      style={[
                        styles.filterText,
                        {
                          color:
                            selectedCategory === cat.name
                              ? colors.background
                              : colors.text,
                          fontWeight:
                            selectedCategory === cat.name ? "600" : "500",
                        },
                      ]}
                    >
                      {cat.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.resultsHeader}>
              <ThemedText
                style={{
                  color: colors.icon,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: "600",
                }}
              >
                {t("explore.results", { count: filteredVehicles.length })}
              </ThemedText>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setShowSortSheet(true)}
              >
                <ThemedText
                  style={{
                    color: colors.text,
                    fontWeight: "500",
                    fontSize: 14,
                  }}
                >
                  {selectedSortLabel}
                </ThemedText>
                <IconSymbol name="chevron.down" size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.resultsGrid}>
              {isLoading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <View
                      key={`car-skeleton-${idx}`}
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.imageContainer,
                          { backgroundColor: skeletonSoft },
                        ]}
                      />
                      <View style={styles.resultInfo}>
                        <View
                          style={[
                            skeletonLineStyle,
                            { width: "82%", backgroundColor: skeletonBase },
                          ]}
                        />
                        <View
                          style={[
                            skeletonLineStyle,
                            {
                              width: "48%",
                              height: 12,
                              backgroundColor: skeletonBase,
                            },
                          ]}
                        />
                        <View
                          style={[
                            skeletonLineStyle,
                            {
                              width: "60%",
                              height: 18,
                              backgroundColor: skeletonBase,
                            },
                          ]}
                        />
                        <View
                          style={[
                            skeletonLineStyle,
                            {
                              width: "72%",
                              height: 12,
                              marginBottom: 0,
                              backgroundColor: skeletonBase,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                : filteredVehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => goToVehicle(vehicle.id)}
                    >
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
                          style={styles.resultImage}
                          contentFit="cover"
                        />
                        <TouchableOpacity
                          style={[
                            styles.favoriteBtn,
                            {
                              backgroundColor: isDark
                                ? "rgba(0,0,0,0.5)"
                                : "rgba(255,255,255,0.8)",
                            },
                          ]}
                          onPress={() => handleToggleFavorite(vehicle.id)}
                        >
                          <IconSymbol
                            name="heart.fill"
                            size={16}
                            color={
                              isFavorited(vehicle.id) ? "#EF4444" : colors.icon
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.resultInfo}>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ThemedText
                            style={styles.vehicleTitle}
                            numberOfLines={2}
                          >
                            {vehicle.title}
                          </ThemedText>
                          {(vehicle.verificationStatus === "approved" ||
                            vehicle.sellerTier === "trusted" ||
                            vehicle.sellerTier === "dealer_pro") && (
                            <View
                              style={{
                                marginLeft: 6,
                                backgroundColor: "#3B82F6",
                                borderRadius: 10,
                                width: 16,
                                height: 16,
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden",
                              }}
                            >
                              <IconSymbol
                                name="checkmark"
                                size={12}
                                color="#fff"
                              />
                            </View>
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.usageStatus,
                            { color: colors.primary },
                          ]}
                        >
                          {vehicle.usageStatus}
                        </ThemedText>
                        {hasActiveSub && (
                          <ThemedText
                            style={[
                              styles.sellerName,
                              { color: colors.icon, marginTop: 4 },
                            ]}
                            numberOfLines={1}
                          >
                            {vehicle.sellerName || "Unknown Seller"}
                          </ThemedText>
                        )}
                        <View style={styles.priceRow}>
                          <ThemedText
                            style={[
                              styles.vehiclePrice,
                              { color: colors.text },
                            ]}
                          >
                            {displayPrice(parsePrice(vehicle.price))}
                          </ThemedText>
                        </View>
                        <View style={styles.vehicleSpecs}>
                          <ThemedText
                            style={[styles.specText, { color: colors.icon }]}
                          >
                            {vehicle.mileage}
                          </ThemedText>
                          <View
                            style={[
                              styles.specDot,
                              { backgroundColor: colors.border },
                            ]}
                          />
                          <ThemedText
                            style={[styles.specText, { color: colors.icon }]}
                          >
                            {vehicle.vehicleType || "Car"}
                          </ThemedText>
                        </View>
                        <View style={styles.locationRow}>
                          <IconSymbol
                            name="house.fill"
                            size={12}
                            color={colors.icon}
                            style={{ marginRight: 4 }}
                          />
                          <ThemedText
                            style={[
                              styles.locationText,
                              { color: colors.icon },
                            ]}
                            numberOfLines={1}
                          >
                            {vehicle.location}
                          </ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
              {!isLoading && filteredVehicles.length === 0 && (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: colors.icon }}>
                    No vehicles match your selected filters.
                  </ThemedText>
                </View>
              )}
            </View>
          </ScrollView>
        </>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={showFilterSheet}
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowFilterSheet(false)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.background },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
                  Smart Filters
                </ThemedText>
                <ThemedText
                  style={[styles.sheetSubtitle, { color: colors.icon }]}
                >
                  Find your dream car faster
                </ThemedText>
              </View>
              <View style={styles.sheetHeaderRight}>
                <View
                  style={[
                    styles.sheetActiveBadge,
                    { backgroundColor: `${colors.primary}16` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.sheetActiveBadgeText,
                      { color: colors.primary },
                    ]}
                  >
                    {mobileActiveFilterCount} active
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[
                    styles.sheetClearBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                  onPress={clearAdvancedFilters}
                >
                  <IconSymbol
                    name="arrow.counterclockwise"
                    size={13}
                    color={colors.primary}
                  />
                  <ThemedText
                    style={{
                      color: colors.primary,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Clear
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View
                style={[
                  styles.sheetSectionCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.sheetSectionHeadingRow}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={14}
                    color={colors.icon}
                  />
                  <ThemedText style={styles.sheetSectionTitle}>
                    Usage Status
                  </ThemedText>
                </View>
                <View style={styles.sheetChipsWrap}>
                  {USAGE_STATUS_FILTERS.map((item) => {
                    const active = selectedUsageStatuses.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.sheetChip,
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                            backgroundColor: active
                              ? `${colors.primary}1A`
                              : "transparent",
                          },
                          active && styles.sheetChipActive,
                        ]}
                        onPress={() => toggleUsageFilter(item)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {item}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.sheetSectionCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.sheetSectionHeadingRow}>
                  <IconSymbol
                    name="creditcard.fill"
                    size={14}
                    color={colors.icon}
                  />
                  <ThemedText style={styles.sheetSectionTitle}>
                    Pricing
                  </ThemedText>
                </View>
                <View style={styles.sheetChipsWrap}>
                  {priceFilters.map((item) => {
                    const active = selectedPriceFilters.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.sheetChip,
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                            backgroundColor: active
                              ? `${colors.primary}1A`
                              : "transparent",
                          },
                          active && styles.sheetChipActive,
                        ]}
                        onPress={() => togglePriceFilter(item.id)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {item.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.priceRangeCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <View style={styles.priceRangeRow}>
                    <ThemedText style={styles.priceRangeLabel}>From</ThemedText>
                    <ThemedText
                      style={[
                        styles.priceRangeValue,
                        { color: colors.primary },
                      ]}
                    >
                      {formatFilterPrice(customMinPrice)}
                    </ThemedText>
                  </View>
                  <RangeSlider
                    value={customMinPrice}
                    minimumValue={MIN_PRICE_RWF}
                    maximumValue={customMaxPrice - getSliderStep()}
                    step={getSliderStep()}
                    onValueChange={setCustomMinPrice}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                  />

                  <View style={[styles.priceRangeRow, { marginTop: 8 }]}>
                    <ThemedText style={styles.priceRangeLabel}>To</ThemedText>
                    <ThemedText
                      style={[
                        styles.priceRangeValue,
                        { color: colors.primary },
                      ]}
                    >
                      {formatFilterPrice(customMaxPrice)}
                    </ThemedText>
                  </View>
                  <RangeSlider
                    value={customMaxPrice}
                    minimumValue={customMinPrice + getSliderStep()}
                    maximumValue={MAX_PRICE_RWF}
                    step={getSliderStep()}
                    onValueChange={setCustomMaxPrice}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.sheetSectionCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.sheetSectionHeadingRow}>
                  <IconSymbol name="car.fill" size={14} color={colors.icon} />
                  <ThemedText style={styles.sheetSectionTitle}>
                    Car Model / Type
                  </ThemedText>
                </View>
                <View style={styles.sheetChipsWrap}>
                  {modelTypeFilters.map((item) => {
                    const active = selectedModelTypes.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.sheetChip,
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                            backgroundColor: active
                              ? `${colors.primary}1A`
                              : "transparent",
                          },
                          active && styles.sheetChipActive,
                        ]}
                        onPress={() => toggleModelTypeFilter(item)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {item}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.sheetSectionCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.sheetSectionHeadingRow}>
                  <IconSymbol name="list" size={14} color={colors.icon} />
                  <ThemedText style={styles.sheetSectionTitle}>
                    Brand
                  </ThemedText>
                </View>
                <View style={styles.sheetChipsWrap}>
                  {brandFilters.map((brand) => {
                    const active = selectedBrands.includes(brand);
                    return (
                      <TouchableOpacity
                        key={brand}
                        style={[
                          styles.sheetChip,
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                            backgroundColor: active
                              ? `${colors.primary}1A`
                              : "transparent",
                          },
                          active && styles.sheetChipActive,
                        ]}
                        onPress={() => toggleBrandFilter(brand)}
                      >
                        <ThemedText
                          style={{
                            color: active ? colors.primary : colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {brand}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.sheetSectionCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <View style={styles.sheetSectionHeadingRow}>
                  <IconSymbol name="photo" size={14} color={colors.icon} />
                  <ThemedText style={styles.sheetSectionTitle}>
                    Color
                  </ThemedText>
                </View>
                <View style={styles.colorCirclesWrap}>
                  {colorFilters.map((color) => {
                    const active = selectedColors.includes(color);
                    const colorHex = getColorHex(color);
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: colorHex },
                          active && [
                            styles.colorCircleActive,
                            { borderColor: colors.primary },
                          ],
                        ]}
                        onPress={() => toggleColorFilter(color)}
                        accessibilityLabel={color}
                      >
                        {active && (
                          <IconSymbol
                            name="checkmark"
                            size={14}
                            color={
                              colorHex === "#FFFFFF" || colorHex === "#F8F8F8"
                                ? "#000"
                                : "#fff"
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterSheet(false)}
            >
              <ThemedText style={styles.applyBtnText}>
                Show {filteredVehicles.length} vehicles
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {isDesktopWeb ? (
        // Desktop Web Sort Dropdown
        <Modal
          transparent
          visible={showSortSheet}
          animationType="fade"
          onRequestClose={() => setShowSortSheet(false)}
        >
          <Pressable
            style={styles.webSortOverlay}
            onPress={() => setShowSortSheet(false)}
          >
            <View
              style={[
                styles.webSortDropdown,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.webSortHeader}>
                <ThemedText type="defaultSemiBold" style={styles.webSortTitle}>
                  Sort By
                </ThemedText>
                <TouchableOpacity onPress={() => setShowSortSheet(false)}>
                  <ThemedText style={{ color: colors.icon, fontSize: 20 }}>
                    ×
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.webSortOptions}>
                {SORT_OPTIONS.map((option) => {
                  const active = option.id === selectedSort;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.webSortOption,
                        active && {
                          backgroundColor: `${colors.primary}14`,
                          borderColor: colors.primary,
                        },
                        {
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedSort(option.id);
                        setShowSortSheet(false);
                      }}
                    >
                      <View style={styles.webSortOptionContent}>
                        <View style={styles.webSortOptionLeft}>
                          <View
                            style={[
                              styles.webSortRadio,
                              {
                                borderColor: active
                                  ? colors.primary
                                  : colors.icon,
                              },
                            ]}
                          >
                            {active && (
                              <View
                                style={[
                                  styles.webSortRadioActive,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                            )}
                          </View>
                          <View>
                            <ThemedText
                              style={{
                                color: active ? colors.primary : colors.text,
                                fontWeight: active ? "600" : "500",
                                fontSize: 14,
                              }}
                            >
                              {option.label}
                            </ThemedText>
                            <ThemedText
                              style={{
                                color: colors.icon,
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              {option.description}
                            </ThemedText>
                          </View>
                        </View>
                        {active && (
                          <IconSymbol
                            name="checkmark"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Modal>
      ) : (
        // Mobile Sort Sheet
        <Modal
          transparent
          animationType="slide"
          visible={showSortSheet}
          onRequestClose={() => setShowSortSheet(false)}
        >
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => setShowSortSheet(false)}
          >
            <Pressable
              style={[
                styles.sortSheetContainer,
                { backgroundColor: colors.background },
              ]}
              onPress={() => {}}
            >
              <View
                style={[styles.sheetHandle, { backgroundColor: colors.border }]}
              />

              <View style={styles.sortSheetHeader}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.sortSheetTitle}
                >
                  Sort By
                </ThemedText>
                <TouchableOpacity onPress={() => setShowSortSheet(false)}>
                  <ThemedText style={{ color: colors.icon, fontSize: 24 }}>
                    ×
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.sortOptionsScroll}
              >
                <View style={styles.sortOptionsList}>
                  {SORT_OPTIONS.map((option) => {
                    const active = option.id === selectedSort;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.mobileSortOption,
                          active && {
                            backgroundColor: `${colors.primary}14`,
                            borderColor: colors.primary,
                          },
                          {
                            borderColor: active
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedSort(option.id);
                          setShowSortSheet(false);
                        }}
                      >
                        <View style={styles.mobileSortOptionContent}>
                          <View style={styles.mobileSortOptionLeft}>
                            <View
                              style={[
                                styles.mobileSortRadio,
                                {
                                  borderColor: active
                                    ? colors.primary
                                    : colors.icon,
                                },
                              ]}
                            >
                              {active && (
                                <View
                                  style={[
                                    styles.mobileSortRadioActive,
                                    { backgroundColor: colors.primary },
                                  ]}
                                />
                              )}
                            </View>
                            <View style={styles.mobileSortTextContainer}>
                              <ThemedText
                                style={{
                                  color: active ? colors.primary : colors.text,
                                  fontWeight: active ? "600" : "500",
                                  fontSize: 15,
                                }}
                              >
                                {option.label}
                              </ThemedText>
                              <ThemedText
                                style={{
                                  color: colors.icon,
                                  fontSize: 13,
                                  marginTop: 3,
                                }}
                              >
                                {option.description}
                              </ThemedText>
                            </View>
                          </View>
                          {active && (
                            <IconSymbol
                              name="checkmark"
                              size={20}
                              color={colors.primary}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  toastOverlay: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 14 : 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toastCard: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    position: "relative",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    height: "100%",
    fontSize: 15,
  },
  searchTapArea: {
    flex: 1,
    height: "100%",
    paddingRight: 110,
  },
  filterIconBtn: {
    position: "absolute",
    right: 2,
    top: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 2,
  },
  filterTriggerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterCountBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  filtersContainer: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 100, // Space for tab bar
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultsGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  resultCard: {
    width: "47%",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: {
    padding: 12,
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    lineHeight: 18,
  },
  usageStatus: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: "500",
  },
  trustChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  trustChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trustChipText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceRow: {
    marginBottom: 8,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  vehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  specText: {
    fontSize: 11,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 11,
  },
  emptyState: {
    width: "100%",
    paddingVertical: 24,
    alignItems: "center",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: "82%",
  },
  sortSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sheetHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  sheetHeaderRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  sheetActiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sheetActiveBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sheetClearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheetContent: {
    paddingBottom: 14,
  },
  sheetSectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  sheetSectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sheetChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetChipActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  sortSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortSheetTitle: {
    fontSize: 20,
  },
  sortOptionsScroll: {
    maxHeight: 450,
  },
  sortOptionsList: {
    gap: 10,
  },
  mobileSortOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  mobileSortOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileSortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  mobileSortRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileSortRadioActive: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  mobileSortTextContainer: {
    flex: 1,
  },
  // Desktop Web Sort Dropdown Styles
  webSortOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webSortDropdown: {
    width: 420,
    maxWidth: "90vw",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  webSortHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  webSortTitle: {
    fontSize: 20,
  },
  webSortOptions: {
    gap: 8,
  },
  webSortOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  webSortOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webSortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  webSortRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  webSortRadioActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priceRangeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  priceRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceRangeLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceRangeValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  applyBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // Web Layout Styles
  webContainer: {
    flex: 1,
    flexDirection: "row",
  },
  webSidebar: {
    width: 320,
    borderRightWidth: 1,
    paddingHorizontal: 18,
  },
  webSidebarContent: {
    paddingBottom: 28,
  },
  webSidebarHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 18,
    borderBottomWidth: 1,
  },
  webSidebarTitle: {
    fontSize: 24,
    marginBottom: 6,
  },
  webSidebarSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  webActiveBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  webActiveBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  webFilterSection: {
    marginBottom: 22,
    paddingBottom: 4,
  },
  webFilterHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  webFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    opacity: 0.75,
  },
  webFilterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  webPriceRangeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  webRangeHint: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "500",
  },
  webClearBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  webMainContent: {
    flex: 1,

  },
  webSearchHeader: {
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webPageTitle: {
    fontSize: 28,
    marginBottom: 16,
  },
  webSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  webSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  webSortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webSortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  webResultsContent: {
    paddingVertical: 20,
  },
  webResultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  webResultCard: {
    width: "calc(33.333% - 16px)" as any,
    minWidth: 200,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  webImageContainer: {
    position: "relative",
    height: 200,
    width: "100%",
  },
  webResultImage: {
    width: "100%",
    height: "100%",
  },
  webFavoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  webResultInfo: {
    padding: 16,
  },
  webVehicleTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 22,
  },
  webUsageStatus: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  webSeller: {
    fontSize: 13,
    fontWeight: "500",
  },
  webVehiclePrice: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  webVehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
  },
  webSpecText: {
    fontSize: 13,
  },
  webSpecDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  webEmptyState: {
    width: "100%",
    paddingVertical: 60,
    alignItems: "center",
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  brandGridItem: {
    width: "31%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webChipActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCirclesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleActive: {
    borderWidth: 3,
  },
});
