import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Platform, StatusBar, TextInput, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RangeSlider } from '@/components/ui/range-slider';
import { fetchVehiclesByCategory } from '@/lib/api-vehicles';
import { fetchFavorites, addFavorite, removeFavorite } from '@/lib/api-favorites';
import { fetchMySubscription, hasActiveSubscription as checkActiveSub } from '@/lib/api-subscriptions';
import { getAuthUser } from '@/lib/userPreference';
import type { Vehicle } from '@/types/vehicle';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { resolveImageUrl } from '@/lib/image-url';
import { CategorySEO } from '@/components/page-meta';
import { displayPrice, getPriceFilters, formatFilterPrice, getCurrentCurrencySymbol, getCurrencyPreference, type CurrencyCode } from '@/lib/currencyConverter';

const SEO_API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4002/api/v1';

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const response = await fetch(`${SEO_API_BASE}/categories`);
    if (!response.ok) return [];

    const json = (await response.json()) as {
      data?: { categories?: Array<{ slug?: string; isActive?: boolean }> };
    };

    const categories = Array.isArray(json?.data?.categories) ? json.data.categories : [];
    return categories
      .filter((category) => Boolean(category?.slug))
      .map((category) => ({ slug: String(category.slug) }));
  } catch {
    return [];
  }
}

const CATEGORY_TITLE: Record<string, string> = {
  cars: 'Cars',
  motorcycles: 'Motorcycles',
  electric: 'Electric',
  commercial: 'Commercial',
};

const USAGE_STATUS_FILTERS = ['Brand New', 'Imported Used', 'Used In Rwanda'] as const;
// Price filters are now dynamically generated based on selected currency
const MIN_PRICE_RWF = 0; // Allow filtering from 0
const MAX_PRICE_RWF = 100000000; // 100M FRW maximum
const SLIDER_STEP_RWF = 100000; // 100k RWF steps
const SLIDER_STEP_USD = 100; // $100 steps
const SLIDER_STEP_EUR = 100; // €100 steps

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest Listed' },
  { id: 'price_high_low', label: 'Price: High to Low' },
  { id: 'price_low_high', label: 'Price: Low to High' },
  { id: 'year_new_old', label: 'Year: Newest First' },
  { id: 'year_old_new', label: 'Year: Oldest First' },
  { id: 'title_az', label: 'Name: A to Z' },
  { id: 'rwanda_entry_new', label: 'Recently in Rwanda' },
] as const;

// Color name to hex mapping for UI circles
const COLOR_MAP: Record<string, string> = {
  'Pearl White': '#F8F8F8',
  'Silver': '#C0C0C0',
  'Black': '#1A1A1A',
  'Red': '#DC2626',
  'Blue': '#2563EB',
  'Gray': '#6B7280',
  'White': '#FFFFFF',
  'Green': '#16A34A',
  'Yellow': '#EAB308',
  'Orange': '#F97316',
  'Brown': '#92400E',
  'Gold': '#D97706',
  'Beige': '#D4C5A9',
  'Navy': '#1E3A5F',
  'Purple': '#9333EA',
};

const getColorHex = (colorName: string): string => COLOR_MAP[colorName] || '#6B7280';

type UsageStatusFilter = (typeof USAGE_STATUS_FILTERS)[number];
type PriceFilterId = 'under_500k' | '500k_2m' | '2m_5m' | '5m_10m' | '10m_20m' | 'under_15k' | '15k_30k' | '30k_50k' | '50k_plus';
type SortOptionId = (typeof SORT_OPTIONS)[number]['id'];

const parsePrice = (price: string | number) => {
  if (typeof price === 'number') {
    return Number.isFinite(price) ? Math.round(price) : 0;
  }

  const raw = String(price ?? '').trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return 0;

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  let normalized = cleaned;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      const [left, right = ''] = cleaned.split(',');
      normalized = right.length === 3 ? `${left}${right}` : `${left}.${right}`;
    }
  } else if (dotCount > 0) {
    if (dotCount > 1) {
      normalized = cleaned.replace(/\./g, '');
    } else {
      const [left, right = ''] = cleaned.split('.');
      normalized = right.length === 3 ? `${left}${right}` : `${left}.${right}`;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};
const parseYear = (year: string) => Number(String(year).replace(/[^0-9]/g, ''));

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const categoryName = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Category';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${categoryName} | Inzira`;
    }
  }, [categoryName]);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsageStatuses, setSelectedUsageStatuses] = useState<UsageStatusFilter[]>([]);
  const [selectedPriceFilters, setSelectedPriceFilters] = useState<PriceFilterId[]>([]);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('RWF');
  const [customMinPrice, setCustomMinPrice] = useState(0); // Start at 0 (no filter)
  const [customMaxPrice, setCustomMaxPrice] = useState(MAX_PRICE_RWF);
  const [priceFilters, setPriceFilters] = useState(() => getPriceFilters('RWF'));
  const [selectedModelTypes, setSelectedModelTypes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOptionId>('newest');
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const loginRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginToastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageTitle = CATEGORY_TITLE[slug ?? ''] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Category');

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [vehiclesRes, favoritesRes] = await Promise.all([
          fetchVehiclesByCategory(slug, { status: 'active' }),
          fetchFavorites().catch(() => ({ data: { favorites: [] } }))
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
          setAllVehicles(vehiclesRes.data.vehicles);
          setFavoriteIds(favoritesRes.data.favorites.map((f: any) => f.vehicleId));
          setHasActiveSub(subActive);
        }
      } catch (err) {
        console.error('Failed to load category data:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [slug]);

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
      case 'USD': return SLIDER_STEP_USD;
      case 'EUR': return SLIDER_STEP_EUR;
      case 'RWF':
      default: return SLIDER_STEP_RWF;
    }
  };

  const brandFilters = useMemo(() => {
    const values = new Set<string>();
    allVehicles.forEach((vehicle) => values.add(vehicle.brand));
    return Array.from(values).sort();
  }, [allVehicles]);

  const modelTypeFilters = useMemo(() => {
    const values = new Set<string>();
    allVehicles.forEach((vehicle) => {
      values.add(vehicle.vehicleType);
      values.add(vehicle.model);
    });
    return Array.from(values);
  }, [allVehicles]);

  const colorFilters = useMemo(() => {
    const values = new Set<string>();
    allVehicles.forEach((vehicle) => {
      if (vehicle.color) {
        values.add(vehicle.color);
      }
    });
    return Array.from(values);
  }, [allVehicles]);

  const filteredVehicles = useMemo(() => {
    const loweredQuery = searchQuery.trim().toLowerCase();
    // Has custom range if user moved min above 0 or max below max
    const hasCustomRange = customMinPrice > 0 || customMaxPrice < MAX_PRICE_RWF;

    const baseFiltered = allVehicles.filter((vehicle) => {
      const usageOk = selectedUsageStatuses.length === 0 || selectedUsageStatuses.includes(vehicle.usageStatus as UsageStatusFilter);

      const vehiclePrice = parsePrice(vehicle.price);
      // Price filtering: use custom range if set, otherwise use price filter chips
      const priceOk = hasCustomRange
        ? (vehiclePrice >= customMinPrice && vehiclePrice <= customMaxPrice)
        : (selectedPriceFilters.length === 0 ||
           priceFilters.filter((item) => selectedPriceFilters.includes(item.id)).some(
             (range) => vehiclePrice >= range.rawRWFMin && vehiclePrice < range.rawRWFMax
           ));

      const modelTypeOk =
        selectedModelTypes.length === 0 || (vehicle.model && selectedModelTypes.includes(vehicle.model)) || (vehicle.vehicleType && selectedModelTypes.includes(vehicle.vehicleType));

      const queryOk =
        loweredQuery.length === 0 ||
        vehicle.title.toLowerCase().includes(loweredQuery) ||
        vehicle.model.toLowerCase().includes(loweredQuery) ||
        vehicle.brand.toLowerCase().includes(loweredQuery);

      const colorOk = selectedColors.length === 0 || (vehicle.color ? selectedColors.includes(vehicle.color) : false);

      const brandOk = selectedBrands.length === 0 || selectedBrands.includes(vehicle.brand);

      return usageOk && priceOk && modelTypeOk && queryOk && colorOk && brandOk;
    });

    const sorted = [...baseFiltered].sort((a, b) => {
      if (selectedSort === 'price_high_low') return parsePrice(b.price) - parsePrice(a.price);
      if (selectedSort === 'price_low_high') return parsePrice(a.price) - parsePrice(b.price);
      if (selectedSort === 'title_az') return a.title.localeCompare(b.title);
      if (selectedSort === 'year_new_old') return parseYear(b.year) - parseYear(a.year);
      if (selectedSort === 'year_old_new') return parseYear(a.year) - parseYear(b.year);
      if (selectedSort === 'rwanda_entry_new') {
        const aRwandaScore = a.usageStatus === 'Used In Rwanda' ? 1 : 0;
        const bRwandaScore = b.usageStatus === 'Used In Rwanda' ? 1 : 0;
        if (aRwandaScore !== bRwandaScore) return bRwandaScore - aRwandaScore;
        return parseYear(b.year) - parseYear(a.year);
      }

      return parseYear(b.year) - parseYear(a.year);
    });

    return sorted;
  }, [searchQuery, selectedUsageStatuses, selectedPriceFilters, customMinPrice, customMaxPrice, selectedModelTypes, selectedColors, selectedBrands, selectedSort, allVehicles, priceFilters]);

  const goToVehicle = (id: string) => {
    const href = `/vehicle/${id}` as any;
    router.push(href);
  };

  const goToSearch = () => {
    const q = searchQuery.trim();
    const href = q.length > 0 ? (`/search?q=${encodeURIComponent(q)}` as any) : ('/search' as any);
    router.push(href);
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
      router.push('/auth/login' as any);
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
        setFavoriteIds(prev => prev.filter(fid => fid !== id));
      } else {
        await addFavorite(id);
        setFavoriteIds(prev => [...prev, id]);
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

  const toggleUsageFilter = (value: UsageStatusFilter) => {
    setSelectedUsageStatuses((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const togglePriceFilter = (value: PriceFilterId) => {
    setSelectedPriceFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleModelTypeFilter = (value: string) => {
    setSelectedModelTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleColorFilter = (value: string) => {
    setSelectedColors((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleBrandFilter = (value: string) => {
    setSelectedBrands((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const clearAdvancedFilters = () => {
    setSelectedUsageStatuses([]);
    setSelectedPriceFilters([]);
    setCustomMinPrice(0);
    setCustomMaxPrice(MAX_PRICE_RWF);
    setSelectedModelTypes([]);
    setSelectedColors([]);
    setSelectedBrands([]);
  };

  const hasCustomRange = customMinPrice > 0 || customMaxPrice < MAX_PRICE_RWF;
  const activeAdvancedFiltersCount = selectedUsageStatuses.length + selectedPriceFilters.length + selectedModelTypes.length + selectedColors.length + selectedBrands.length + (hasCustomRange ? 1 : 0);
  const activeDesktopFilterCount = activeAdvancedFiltersCount;
  const mobileActiveFilterCount = activeAdvancedFiltersCount;
  const skeletonBase = isDark ? '#1F2937' : '#E5E7EB';
  const skeletonSoft = isDark ? '#111827' : '#F3F4F6';
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.id === selectedSort)?.label ?? 'Newest Listed';
  const skeletonLineStyle = styles.skeletonLine as any;
  const vehicles = filteredVehicles;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <CategorySEO category={pageTitle} slug={slug ?? 'vehicles'} count={allVehicles.length} />
      {showLoginToast && (
        <View pointerEvents="none" style={styles.toastOverlay}>
          <View style={[styles.toastCard, { backgroundColor: theme === 'dark' ? '#0F172A' : '#111827' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#F59E0B" />
            <ThemedText style={styles.toastText}>You must first login</ThemedText>
          </View>
        </View>
      )}
      {isDesktopWeb ? (
        // Web Layout with Left Sidebar Filters
        <View style={styles.webContainer}>
          {/* Left Sidebar - Filters */}
          <View style={[styles.webSidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={isDesktopWeb} contentContainerStyle={styles.webSidebarContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.webBackBtn}>
                <IconSymbol name="chevron.left" size={22} color={colors.text} />
                <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>Back</ThemedText>
              </TouchableOpacity>

              <View style={[styles.webSidebarHeader, { borderBottomColor: colors.border }]}>
                <ThemedText type="defaultSemiBold" style={styles.webSidebarTitle}>{pageTitle} Filters</ThemedText>
                <ThemedText style={[styles.webSidebarSubtitle, { color: colors.icon }]}>Refine listings in this category</ThemedText>
                <View style={[styles.webActiveBadge, { backgroundColor: `${colors.primary}18` }]}>
                  <ThemedText style={[styles.webActiveBadgeText, { color: colors.primary }]}>{activeDesktopFilterCount} active</ThemedText>
                </View>
                <ThemedText style={[styles.webVehicleCountText, { color: colors.icon }]}>{vehicles.length} vehicle(s)</ThemedText>
              </View>

              {/* Usage Status */}
              <View style={styles.webFilterSection}>
                <View style={styles.webFilterHeadingRow}>
                  <IconSymbol name="checkmark.circle.fill" size={14} color={colors.icon} />
                  <ThemedText style={styles.webFilterLabel}>Usage Status</ThemedText>
                </View>
                {USAGE_STATUS_FILTERS.map((item) => {
                  const active = selectedUsageStatuses.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.webFilterItem, active && [styles.webChipActive, { backgroundColor: `${colors.primary}15` }] ]}
                      onPress={() => toggleUsageFilter(item)}
                    >
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontWeight: active ? '600' : '400' }}>{item}</ThemedText>
                      {active && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
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
                          active && [styles.webChipActive, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }],
                          { borderColor: active ? colors.primary : colors.border },
                        ]}
                        onPress={() => toggleBrandFilter(brand)}
                      >
                        <ThemedText 
                          style={{ 
                            color: active ? colors.primary : colors.text, 
                            fontWeight: active ? '600' : '400',
                            fontSize: 12,
                            textAlign: 'center',
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
                          active && [styles.colorCircleActive, { borderColor: colors.primary }],
                        ]}
                        onPress={() => toggleColorFilter(color)}
                        accessibilityLabel={color}
                      >
                        {active && <IconSymbol name="checkmark" size={14} color={colorHex === '#FFFFFF' || colorHex === '#F8F8F8' ? '#000' : '#fff'} />}
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
                <View style={[styles.webPriceRangeCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <ThemedText style={[styles.webRangeHint, { color: colors.icon }]}>Set your budget range</ThemedText>
                  <ThemedText style={{ color: colors.icon, fontSize: 12 }}>Min: {formatFilterPrice(customMinPrice)}</ThemedText>
                  <RangeSlider
                    value={customMinPrice}
                    minimumValue={MIN_PRICE_RWF}
                    maximumValue={customMaxPrice - getSliderStep()}
                    step={getSliderStep()}
                    onValueChange={setCustomMinPrice}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                  />
                  <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 8 }}>Max: {formatFilterPrice(customMaxPrice)}</ThemedText>
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

              {activeAdvancedFiltersCount > 0 && (
                <TouchableOpacity style={[styles.webClearBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={clearAdvancedFilters}>
                  <IconSymbol name="arrow.counterclockwise" size={14} color={colors.primary} />
                  <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Reset Filters</ThemedText>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          <View style={styles.webMainContent}>
            <ScrollView showsVerticalScrollIndicator={isDesktopWeb} contentContainerStyle={[styles.webResultsContent, { paddingHorizontal: is2Xl ? 300 : isXl ? 160 : isLg ? 80 : 40 }]}>
              {/* Search Header - Inside ScrollView */}
              <View style={[styles.webSearchHeader, { borderBottomColor: "colors.border", backgroundColor: colors.background, paddingBottom: 16, marginBottom: 16 }]}>
                <ThemedText type="defaultSemiBold" style={[styles.webPageTitle, { color: colors.text }]}>{pageTitle}</ThemedText>
                <View style={[styles.webSearchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
                  <TextInput
                    style={[styles.webSearchInput, { color: colors.text }]}
                    placeholder="Search in this category"
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <View style={styles.webSortRow}>
                  <ThemedText style={{ color: colors.icon }}>{filteredVehicles.length} results</ThemedText>
                  <TouchableOpacity style={[styles.webSortBtn, { borderColor: colors.border }]} onPress={() => setShowSortSheet(true)}>
                    <ThemedText style={{ fontSize: 14 }}>{selectedSortLabel}</ThemedText>
                    <IconSymbol name="chevron.down" size={16} color={colors.icon} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.webResultsGrid}>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <View
                        key={`category-web-skeleton-${idx}`}
                        style={[styles.webResultCard, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                        <View style={[styles.webImageContainer, { backgroundColor: skeletonSoft }]} />
                        <View style={styles.webResultInfo}>
                          <View style={[skeletonLineStyle, { width: '74%', height: 16, backgroundColor: skeletonBase }]} />
                          <View style={[skeletonLineStyle, { width: '44%', height: 12, backgroundColor: skeletonBase }]} />
                          <View style={[skeletonLineStyle, { width: '58%', height: 18, backgroundColor: skeletonBase }]} />
                          <View style={[skeletonLineStyle, { width: '70%', height: 12, marginBottom: 0, backgroundColor: skeletonBase }]} />
                        </View>
                      </View>
                    ))
                  : filteredVehicles.map((vehicle) => (
                      <TouchableOpacity key={vehicle.id} style={[styles.webResultCard, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => goToVehicle(vehicle.id)}>
                        <View style={styles.webImageContainer}>
                          <Image source={{ uri: resolveImageUrl(vehicle.images?.[0]) }} style={styles.webResultImage} contentFit="cover" />
                          <TouchableOpacity
                            style={[styles.webFavoriteBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)' }]}
                            onPress={() => handleToggleFavorite(vehicle.id)}
                          >
                            <IconSymbol name="heart.fill" size={18} color={isFavorited(vehicle.id) ? '#EF4444' : colors.icon} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.webResultInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText style={styles.webVehicleTitle} numberOfLines={2}>{vehicle.title}</ThemedText>
                            {(vehicle.verificationStatus === 'approved' || vehicle.sellerTier === 'trusted' || vehicle.sellerTier === 'dealer_pro') && (
                              <View style={{ marginLeft: 6, backgroundColor: '#3B82F6', borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                <IconSymbol name="checkmark" size={12} color="#fff" />
                              </View>
                            )}
                          </View>
                          <ThemedText style={[styles.webUsageStatus, { color: colors.primary }]}>{vehicle.usageStatus}</ThemedText>
                          {hasActiveSub && (
                            <ThemedText style={{ color: colors.icon, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                              {vehicle.sellerName || 'Unknown Seller'}
                            </ThemedText>
                          )}
                          <ThemedText style={[styles.webVehiclePrice, { color: colors.text }]}>{displayPrice(parsePrice(vehicle.price))}</ThemedText>
                          <View style={styles.webVehicleSpecs}>
                            <ThemedText style={[styles.webSpecText, { color: colors.icon }]}>{vehicle.mileage}</ThemedText>
                            <View style={[styles.webSpecDot, { backgroundColor: colors.border }]} />
                            <ThemedText style={[styles.webSpecText, { color: colors.icon }]}>{vehicle.vehicleType || 'Car'}</ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
              </View>
              {!isLoading && filteredVehicles.length === 0 && (
                <View style={styles.webEmptyState}>
                  <ThemedText style={{ color: colors.icon }}>No vehicles match your filters.</ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header - Inside ScrollView */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}> 
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={22} color={colors.text} />
              </TouchableOpacity>
              <View>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{pageTitle}</ThemedText>
                <ThemedText style={{ color: colors.icon, fontSize: 12 }}>{vehicles.length} vehicle(s)</ThemedText>
              </View>
              <View style={styles.backBtn} />
            </View>

            {/* Search Container - Inside ScrollView */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <IconSymbol name="magnifyingglass" size={18} color={colors.icon} style={styles.searchIcon} />
              <TouchableOpacity style={styles.searchTapArea} onPress={goToSearch} activeOpacity={0.8}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search in this category"
                  placeholderTextColor={colors.icon}
                  value={searchQuery}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterIconBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowFilterSheet(true)}>
                <ThemedText style={[styles.filterTriggerText, { color: colors.primary }]}>Filters</ThemedText>
                <IconSymbol name="chevron.down" size={20} color={colors.primary} />
                {activeAdvancedFiltersCount > 0 && (
                  <View style={[styles.filterCountBadge, { backgroundColor: colors.primary }]}> 
                    <ThemedText style={styles.filterCountText}>{activeAdvancedFiltersCount}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.sortInfoRow}>
              <ThemedText style={{ color: colors.icon, fontSize: 12 }}>{vehicles.length} result(s)</ThemedText>
              <ThemedText style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{selectedSortLabel}</ThemedText>
            </View>

            <View style={styles.list}>
              {isLoading
                ? Array.from({ length: 5 }).map((_, idx) => (
                    <View key={`category-mobile-skeleton-${idx}`} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                      <View style={[styles.imageWrap, { backgroundColor: skeletonSoft }]} />
                      <View style={styles.info}>
                        <View style={[skeletonLineStyle, { width: '78%', height: 14, backgroundColor: skeletonBase }]} />
                        <View style={[skeletonLineStyle, { width: '46%', height: 12, backgroundColor: skeletonBase }]} />
                        <View style={[skeletonLineStyle, { width: '52%', height: 18, backgroundColor: skeletonBase }]} />
                        <View style={[skeletonLineStyle, { width: '84%', height: 12, marginBottom: 0, backgroundColor: skeletonBase }]} />
                      </View>
                    </View>
                  ))
                : vehicles.map((vehicle) => (
                    <TouchableOpacity key={vehicle.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => goToVehicle(vehicle.id)}>
                      <View style={styles.imageWrap}>
                        <Image source={{ uri: resolveImageUrl(vehicle.images?.[0]) }} style={styles.image} contentFit="cover" />
                        <TouchableOpacity
                          style={[styles.favoriteBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
                          onPress={() => handleToggleFavorite(vehicle.id)}>
                          <IconSymbol name="heart.fill" size={16} color={isFavorited(vehicle.id) ? '#EF4444' : colors.icon} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.info}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ThemedText type="defaultSemiBold" numberOfLines={2} style={{ flex: 1 }}>{vehicle.title}</ThemedText>
                          {(vehicle.verificationStatus === 'approved' || vehicle.sellerTier === 'trusted' || vehicle.sellerTier === 'dealer_pro') && (
                            <View style={{ marginLeft: 6, backgroundColor: '#3B82F6', borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                              <IconSymbol name="checkmark" size={12} color="#fff" />
                            </View>
                          )}
                        </View>
                        <ThemedText style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>
                          {vehicle.usageStatus}
                        </ThemedText>
                        {hasActiveSub && (
                          <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                            {vehicle.sellerName || 'Unknown Seller'}
                          </ThemedText>
                        )}
                        <ThemedText style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 }}>{displayPrice(parsePrice(vehicle.price))}</ThemedText>

                        <View style={styles.metaRow}>
                          <ThemedText style={{ color: colors.icon, fontSize: 12 }}>{vehicle.mileage}</ThemedText>
                          <ThemedText style={{ color: colors.icon, fontSize: 12 }}> • {vehicle.fuelType}</ThemedText>
                          <ThemedText style={{ color: colors.icon, fontSize: 12 }}> • {vehicle.location}</ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

              {!isLoading && filteredVehicles.length === 0 && (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: colors.icon }}>No vehicles match the selected filters.</ThemedText>
                </View>
              )}
            </View>
            <WebFooter />
          </ScrollView>
        </>
      )}

      <Modal transparent animationType="slide" visible={showFilterSheet} onRequestClose={() => setShowFilterSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowFilterSheet(false)}>
          <Pressable style={[styles.sheetContainer, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>Smart Filters</ThemedText>
                <ThemedText style={[styles.sheetSubtitle, { color: colors.icon }]}>Refine cars in {pageTitle}</ThemedText>
              </View>
              <View style={styles.sheetHeaderRight}>
                <View style={[styles.sheetActiveBadge, { backgroundColor: `${colors.primary}16` }]}>
                  <ThemedText style={[styles.sheetActiveBadgeText, { color: colors.primary }]}>{mobileActiveFilterCount} active</ThemedText>
                </View>
                <TouchableOpacity style={[styles.sheetClearBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={clearAdvancedFilters}>
                  <IconSymbol name="arrow.counterclockwise" size={13} color={colors.primary} />
                  <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Clear</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="chart.bar.fill" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Sort By</ThemedText>
              </View>
              <View style={styles.sheetChipsWrap}>
                {SORT_OPTIONS.map((option) => {
                  const active = selectedSort === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sheetChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                        },
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => {
                        setSelectedSort(option.id);
                        setShowSortSheet(false);
                      }}>
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{option.label}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              </View>

              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="checkmark.circle.fill" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Usage Status</ThemedText>
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
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                        },
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleUsageFilter(item)}>
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{item}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              </View>

              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="creditcard.fill" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Pricing</ThemedText>
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
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                        },
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => togglePriceFilter(item.id)}>
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{item.label}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.priceRangeCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                <View style={styles.priceRangeRow}>
                  <ThemedText style={styles.priceRangeLabel}>From</ThemedText>
                  <ThemedText style={[styles.priceRangeValue, { color: colors.primary }]}>{formatFilterPrice(customMinPrice)}</ThemedText>
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
                  <ThemedText style={[styles.priceRangeValue, { color: colors.primary }]}>{formatFilterPrice(customMaxPrice)}</ThemedText>
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

              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="car.fill" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Car Model / Type</ThemedText>
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
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                        },
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleModelTypeFilter(item)}>
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{item}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              </View>

              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="list" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Brand</ThemedText>
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
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}1A` : 'transparent',
                        },
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleBrandFilter(brand)}>
                      <ThemedText style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{brand}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              </View>

              <View style={[styles.sheetSectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.sheetSectionHeadingRow}>
                <IconSymbol name="photo" size={14} color={colors.icon} />
                <ThemedText style={styles.sheetSectionTitle}>Color</ThemedText>
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
                        active && [styles.colorCircleActive, { borderColor: colors.primary }],
                      ]}
                      onPress={() => toggleColorFilter(color)}
                      accessibilityLabel={color}
                    >
                      {active && <IconSymbol name="checkmark" size={14} color={colorHex === '#FFFFFF' || colorHex === '#F8F8F8' ? '#000' : '#fff'} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowFilterSheet(false)}>
              <ThemedText style={styles.applyBtnText}>Show {vehicles.length} vehicles</ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {isDesktopWeb ? (
        // Desktop Web Sort Dropdown
        <Modal transparent visible={showSortSheet} animationType="fade" onRequestClose={() => setShowSortSheet(false)}>
          <Pressable style={styles.webSortOverlay} onPress={() => setShowSortSheet(false)}>
            <View style={[styles.webSortDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.webSortHeader}>
                <ThemedText type="defaultSemiBold" style={styles.webSortTitle}>Sort By</ThemedText>
                <TouchableOpacity onPress={() => setShowSortSheet(false)}>
                  <ThemedText style={{ color: colors.icon, fontSize: 20 }}>×</ThemedText>
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
                        active && { backgroundColor: `${colors.primary}14`, borderColor: colors.primary },
                        { borderColor: active ? colors.primary : colors.border },
                      ]}
                      onPress={() => {
                        setSelectedSort(option.id);
                        setShowSortSheet(false);
                      }}>
                      <View style={styles.webSortOptionContent}>
                        <View style={styles.webSortOptionLeft}>
                          <View style={[styles.webSortRadio, { borderColor: active ? colors.primary : colors.icon }]}>
                            {active && <View style={[styles.webSortRadioActive, { backgroundColor: colors.primary }]} />}
                          </View>
                          <View>
                            <ThemedText style={{ color: active ? colors.primary : colors.text, fontWeight: active ? '600' : '500', fontSize: 14 }}>
                              {option.label}
                            </ThemedText>
                          </View>
                        </View>
                        {active && (
                          <IconSymbol name="checkmark" size={18} color={colors.primary} />
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
        <Modal transparent animationType="slide" visible={showSortSheet} onRequestClose={() => setShowSortSheet(false)}>
          <Pressable style={styles.sheetOverlay} onPress={() => setShowSortSheet(false)}>
            <Pressable style={[styles.sortSheetContainer, { backgroundColor: colors.background }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

              <View style={styles.sortSheetHeader}>
                <ThemedText type="defaultSemiBold" style={styles.sortSheetTitle}>Sort By</ThemedText>
                <TouchableOpacity onPress={() => setShowSortSheet(false)}>
                  <ThemedText style={{ color: colors.icon, fontSize: 24 }}>×</ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.sortOptionsScroll}>
                <View style={styles.sortOptionsList}>
                  {SORT_OPTIONS.map((option) => {
                    const active = option.id === selectedSort;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.mobileSortOption,
                          active && { backgroundColor: `${colors.primary}14`, borderColor: colors.primary },
                          { borderColor: active ? colors.primary : colors.border },
                        ]}
                        onPress={() => {
                          setSelectedSort(option.id);
                          setShowSortSheet(false);
                        }}>
                        <View style={styles.mobileSortOptionContent}>
                          <View style={styles.mobileSortOptionLeft}>
                            <View style={[styles.mobileSortRadio, { borderColor: active ? colors.primary : colors.icon }]}>
                              {active && <View style={[styles.mobileSortRadioActive, { backgroundColor: colors.primary }]} />}
                            </View>
                            <View style={styles.mobileSortTextContainer}>
                              <ThemedText style={{ color: active ? colors.primary : colors.text, fontWeight: active ? '600' : '500', fontSize: 15 }}>
                                {option.label}
                              </ThemedText>
                            </View>
                          </View>
                          {active && (
                            <IconSymbol name="checkmark" size={20} color={colors.primary} />
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  toastOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 14 : 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom:3
  },
  backBtn: {
    width: 34,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
    position: 'relative',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: '100%',
    fontSize: 14,
  },
  searchTapArea: {
    flex: 1,
    height: '100%',
    paddingRight: 108,
  },
  sortInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  filterIconBtn: {
    position: 'absolute',
       right: 2,
    top: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 2,
  },
  filterTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    marginTop: 6,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 14,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: '82%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sheetHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  sheetHeaderRight: {
    alignItems: 'flex-end',
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
    fontWeight: '700',
  },
  sheetClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sheetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  priceRangeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  priceRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRangeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceRangeValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Web Layout Styles
  webContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  webSidebar: {
    width: 320,
    borderRightWidth: 1,
    paddingHorizontal: 18,
  },
  webSidebarContent: {
    paddingBottom: 28,
  },
  webBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  webSidebarHeader: {
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
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  webActiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  webVehicleCountText: {
    fontSize: 13,
  },
  webFilterSection: {
    marginBottom: 22,
    paddingBottom: 4,
  },
  webFilterHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  webFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.75,
  },
  webFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '500',
  },
  webClearBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  webSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  webSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  webSortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  webResultsContent: {
    paddingVertical: 20,
  },
  webResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  webResultCard: {
    width: '31%',
    minWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webImageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  webResultImage: {
    width: '100%',
    height: '100%',
  },
  webFavoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webResultInfo: {
    padding: 16,
  },
  webVehicleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  webUsageStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  webVehiclePrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  webVehicleSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandGridItem: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCirclesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderWidth: 3,
  },
  // Web Sort Dropdown Styles
  webSortOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSortDropdown: {
    width: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  webSortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  webSortTitle: {
    fontSize: 18,
  },
  webSortOptions: {
    gap: 8,
  },
  webSortOption: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  webSortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webSortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webSortRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webSortRadioActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Mobile Sort Sheet Styles
  sortSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sortSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  mobileSortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileSortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileSortRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileSortRadioActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mobileSortTextContainer: {
    flex: 1,
  },
});
