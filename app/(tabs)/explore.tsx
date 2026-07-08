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
  ActivityIndicator,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors, Elevation, Radius, Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VehicleCard } from "@/components/vehicle-card";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { RangeSlider } from "@/components/ui/range-slider";
import { fetchVehicles, fetchBrandsWithImages, fetchBodyTypes } from "@/lib/api-vehicles";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api-favorites";
import { fetchCategories, type Category } from "@/lib/api-categories";
import { getAuthUser } from "@/lib/userPreference";
import type { Vehicle } from "@/types/vehicle";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { resolveImageUrl } from "@/lib/image-url";
import { getUsageStatusColor } from '@/lib/usage-status';
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const IMAGE_COUNT_LIMIT = 10;

const getImageCount = (images: string[] | undefined): number => {
  if (!images || !Array.isArray(images)) return 0;
  return Math.min(images.length, IMAGE_COUNT_LIMIT);
};

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
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOptionId>("newest");
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    const typebodiesParam = typeof params.typebodies === "string" ? params.typebodies : "";

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
      // Parse mileage range — strip commas and non-numeric chars before parsing
      const parseMileageNum = (v: string) => {
        const cleaned = v.replace(/[^0-9]/g, "");
        return cleaned ? parseInt(cleaned, 10) : 0;
      };
      if (mileageParam.includes("-")) {
        const [minRaw, maxRaw] = mileageParam.split("-");
        const min = parseMileageNum(minRaw);
        const max = parseMileageNum(maxRaw);
        setSelectedMileageRange({ min: min || 0, max: max || 999999999 });
      } else if (mileageParam.includes("+")) {
        const min = parseMileageNum(mileageParam.replace("+", ""));
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

    // Reset body types or set from param
    if (typebodiesParam) {
      const nextBodyTypes = typebodiesParam
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      setSelectedBodyTypes(nextBodyTypes);
    } else {
      setSelectedBodyTypes([]);
    }
  }, [params.brand, params.category, params.model, params.mileage, params.q, params.usage, params.typebodies]);

  // Filter option metadata (separate from paginated results)
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableBodyTypes, setAvailableBodyTypes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived filter options — vehicles types from categories, colors from predefined map
  const modelTypeFilters = useMemo(() => categories.map((c) => c.name), [categories]);
  const colorFilters = Object.keys(COLOR_MAP);
  const brandFilters = availableBrands;

  // Build API filter params from current state
  const buildFilterParams = (overrideCategory?: string) => {
    const cat = overrideCategory ?? selectedCategory;
    const hasCustomRange = customMinPrice > 0 || customMaxPrice < MAX_PRICE_RWF;
    let minP: number | undefined;
    let maxP: number | undefined;
    if (hasCustomRange) {
      if (customMinPrice > 0) minP = customMinPrice;
      if (customMaxPrice < MAX_PRICE_RWF) maxP = customMaxPrice;
    } else if (selectedPriceFilters.length > 0) {
      const ranges = priceFilters.filter((f) => selectedPriceFilters.includes(f.id));
      if (ranges.length) {
        minP = Math.min(...ranges.map((r) => r.rawRWFMin));
        maxP = Math.max(...ranges.map((r) => r.rawRWFMax));
      }
    }
    return {
      status: "active",
      sort: selectedSort,
      q: searchQuery.trim() || undefined,
      type: cat !== "All" ? cat : selectedModelTypes.length === 1 ? selectedModelTypes[0] : undefined,
      brand: selectedBrands.length ? selectedBrands : undefined,
      color: selectedColors.length ? selectedColors : undefined,
      usageStatus: selectedUsageStatuses.length ? selectedUsageStatuses : undefined,
      bodyType: selectedBodyTypes.length ? selectedBodyTypes : undefined,
      minPrice: minP,
      maxPrice: maxP,
      minMileage: selectedMileageRange?.min ? selectedMileageRange.min : undefined,
      maxMileage: selectedMileageRange && selectedMileageRange.max < 999999999 ? selectedMileageRange.max : undefined,
    };
  };

  const fetchPage = async (targetPage: number, append: boolean) => {
    if (targetPage === 1) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const res = await fetchVehicles({ ...buildFilterParams(), page: targetPage, limit: 20 });
      const newVehicles = res.data.vehicles;
      setVehicles((prev) => (append ? [...prev, ...newVehicles] : newVehicles));
      setTotal(res.data.total ?? newVehicles.length);
      setHasMore(res.data.hasMore ?? false);
      pageRef.current = targetPage;
    } catch (err) {
      console.error("Failed to load vehicles:", err);
    } finally {
      if (targetPage === 1) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  };

  // Initial load: page 1 + metadata
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [vehiclesRes, favoritesRes, categoriesRes, brandsRes, bodyTypesRes] = await Promise.all([
          fetchVehicles({ status: "active", page: 1, limit: 20, sort: "newest" }),
          fetchFavorites().catch(() => ({ data: { favorites: [] } })),
          fetchCategories().catch(() => ({ data: { categories: [] } })),
          fetchBrandsWithImages().catch(() => ({ data: { brands: [] } })),
          fetchBodyTypes().catch(() => ({ data: { bodyTypes: [] } })),
        ]);
        if (mounted) {
          setVehicles(vehiclesRes.data.vehicles);
          setTotal(vehiclesRes.data.total ?? vehiclesRes.data.vehicles.length);
          setHasMore(vehiclesRes.data.hasMore ?? false);
          pageRef.current = 1;
          setFavoriteIds(favoritesRes.data.favorites.map((f) => f.vehicleId));
          setCategories(categoriesRes.data.categories);
          setAvailableBrands(brandsRes.data.brands.map((b: any) => b.name));
          setAvailableBodyTypes(bodyTypesRes.data.bodyTypes.map((b: any) => b.name));
        }
      } catch (err) {
        console.error("Failed to load explore data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  // Re-fetch page 1 when any filter or sort changes (debounce search query)
  const filterDeps = [
    selectedCategory, selectedSort, selectedUsageStatuses, selectedPriceFilters,
    selectedModelTypes, selectedColors, selectedBrands, selectedBodyTypes,
    customMinPrice, customMaxPrice, selectedMileageRange,
  ];
  useEffect(() => {
    // Avoid running on initial mount (vehicles already fetched above)
    if (!isLoading) {
      fetchPage(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDeps);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (!isLoading) fetchPage(1, false);
    }, 500);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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
 const insets = useSafeAreaInsets();
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

  const handleScroll = ({ nativeEvent }: { nativeEvent: any }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (hasMore && !isLoadingMore && layoutMeasurement.height + contentOffset.y >= contentSize.height - 150) {
      fetchPage(pageRef.current + 1, true);
    }
  };

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
              onScroll={handleScroll}
              scrollEventThrottle={16}
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <ThemedText style={{ color: colors.icon }}>
                      {total} results
                    </ThemedText>
                    {selectedCategory !== "All" && (
                      <View
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {selectedCategory}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => setSelectedCategory("All")}
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    )}
                    {selectedBrands.map((brand) => (
                      <View
                        key={brand}
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {brand}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedBrands((prev) => prev.filter((b) => b !== brand))
                          }
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedModelTypes.map((model) => (
                      <View
                        key={model}
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {model}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedModelTypes((prev) => prev.filter((m) => m !== model))
                          }
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedUsageStatuses.map((usage) => (
                      <View
                        key={usage}
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {usage}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedUsageStatuses((prev) => prev.filter((u) => u !== usage))
                          }
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedBodyTypes.map((bodyType) => (
                      <View
                        key={bodyType}
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {bodyType}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedBodyTypes((prev) => prev.filter((b) => b !== bodyType))
                          }
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedMileageRange && (
                      <View
                        style={[
                          styles.filterPill,
                          { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        <ThemedText style={[styles.filterPillText, { color: colors.text }]}>
                          {selectedMileageRange.min.toLocaleString()} - {selectedMileageRange.max >= 999999999 ? "∞" : selectedMileageRange.max.toLocaleString()} km
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => setSelectedMileageRange(null)}
                          style={styles.filterPillClose}
                        >
                          <IconSymbol name="xmark" size={14} color={colors.icon} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
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
                  : vehicles.map((vehicle) => (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        variant="grid"
                        isFavorited={isFavorited(vehicle.id)}
                        onPress={() => goToVehicle(vehicle.id)}
                        onToggleFavorite={() => handleToggleFavorite(vehicle.id)}
                        style={styles.webResultCard}
                      />
                    ))}
              </View>
              {isLoadingMore && (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
              {!isLoading && !isLoadingMore && vehicles.length === 0 && (
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
           <ThemedText type="defaultSemiBold" style={[styles.headerTitle,{ paddingHorizontal: 20,}]}>
                {t("explore.title")}
              </ThemedText>
          <ScrollView
            showsVerticalScrollIndicator={isDesktopWeb}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Header - Inside ScrollView */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
           
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
                {t("explore.results", { count: total })}
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
                : vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      variant="grid"
                      isFavorited={isFavorited(vehicle.id)}
                      onPress={() => goToVehicle(vehicle.id)}
                      onToggleFavorite={() => handleToggleFavorite(vehicle.id)}
                      style={{ width: "48%" }}
                    />
                  ))}
              {isLoadingMore && (
                <View style={{ paddingVertical: 24, alignItems: 'center', width: '100%' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
              {!isLoading && !isLoadingMore && vehicles.length === 0 && (
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
        <View
          style={styles.sheetOverlay}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowFilterSheet(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.background },
            ]}
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
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              alwaysBounceVertical={true}
            >
              {/* Category */}
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

              {/* Brand */}
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

              {/* Color */}
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
                  <IconSymbol name="creditcard.fill" size={14} color={colors.icon} />
                  <ThemedText style={styles.webFilterLabel}>Price Range</ThemedText>
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
            </ScrollView>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary,marginBottom:insets.bottom }]}
              onPress={() => setShowFilterSheet(false)}
            >
              <ThemedText style={[styles.applyBtnText,{}]}>
                Show {total} vehicles
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
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
          <View style={styles.sheetOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowSortSheet(false)} />
            <View
              style={[
                styles.sortSheetContainer,
                { backgroundColor: colors.background, marginBottom:insets.bottom },
              ]}
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
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                alwaysBounceVertical={true}
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
            </View>
          </View>
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
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Elevation.raised,
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
    marginTop:6
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
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
    paddingHorizontal: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultCard: {
    width: "48%",
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 6,
    ...Elevation.card,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 150,
    overflow: "hidden",
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  cardUsageBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardUsageBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  favoriteBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
    flex: 1,
  },
  usageStatus: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
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
    marginTop: 2,
  },
  vehiclePrice: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  vehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  specText: {
    fontSize: 12,
    fontWeight: "500",
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 5,
    opacity: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationText: {
    fontSize: 10,
    fontWeight: "500",
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
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    maxHeight: "85%",
    ...Elevation.raised,
  },
  sortSheetContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: "85%",
    ...Elevation.raised,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    marginBottom: 16,
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
    ...Elevation.flat,
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
    maxHeight: 400,
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 24,
    ...Elevation.raised,
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
    marginTop: 12,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: "center",
    ...Elevation.card,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 16,
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
    paddingLeft: 18,
  },
  webSidebarContent: {
    paddingBottom: 32,
    paddingRight: 16,
  },
  webSidebarHeader: {
    paddingTop: 24,
    paddingBottom: 18,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  webSidebarTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  webSidebarSubtitle: {
    fontSize: 13,
    marginBottom: 12,
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.12)",
  },
  webFilterHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  webFilterLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.8,
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
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  filterPillClose: {
    padding: 2,
  },
  webResultsContent: {
    paddingVertical: 20,
  },
  webResultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
  },
  webResultCard: {
    width: "calc(33.333% - 16px)" as any,
    minWidth: 200,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...Elevation.card,
  },
  webImageContainer: {
    position: "relative",
    height: 200,
    width: "100%",
    overflow: "hidden",
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  webResultImage: {
    width: "100%",
    height: "100%",
  },
  webFavoriteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  webResultInfo: {
    padding: 12,
    gap: 5,
  },
  webVehicleTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    flex: 1,
  },
  webUsageStatus: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  webSeller: {
    fontSize: 11,
    fontWeight: "500",
  },
  webVehiclePrice: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  webVehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
  },
  webSpecText: {
    fontSize: 12,
    fontWeight: "500",
  },
  webSpecDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 7,
    opacity: 0.5,
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
    width: "30%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  webChipActive: {
    ...Elevation.flat,
  },
  colorCirclesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleActive: {
    borderWidth: 3,
  },
  soldOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  soldOverlayText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    transform: [{ rotate: "-20deg" }],
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 3,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
