import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VehicleCard } from '@/components/vehicle-card';
import { Colors } from '@/constants/theme';
import { liveSearchVehicles, searchVehicles } from '@/lib/api-vehicles';
import type { Vehicle } from '@/types/vehicle';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { resolveImageUrl } from '@/lib/image-url';
import { SearchSEO } from '@/components/page-meta';
import { displayPrice } from '@/lib/currencyConverter';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Search | Inzira';
    }
  }, []);

  const { q } = useLocalSearchParams<{ q?: string }>();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const [query, setQuery] = useState(q ?? '');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suggestions, setSuggestions] = useState<{ brands: string[]; models: string[]; locations: string[] }>({ brands: [], models: [], locations: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with privacy/contact)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const searchMaxWidth = is2Xl ? 980 : isXl ? 920 : isLg ? 840 : undefined;

  const debouncedQuery = useDebounce(query, 300);

  // Fetch default suggestions on mount (when query is empty)
  useEffect(() => {
    const loadDefaultSuggestions = async () => {
      try {
        // Fetch popular brands and locations from recent vehicles
        const res = await searchVehicles({ status: 'active', sortBy: 'newest' });
        if (res.status === 1 && res.data.vehicles) {
          const vehicles = res.data.vehicles.slice(0, 20);
          const brands = [...new Set(vehicles.map((v: Vehicle) => v.brand).filter(Boolean))].slice(0, 5);
          const locations = [...new Set(vehicles.map((v: Vehicle) => v.location).filter(Boolean))].slice(0, 5);
          setSuggestions({ brands, models: [], locations });
        }
      } catch (err) {
        console.error('Failed to load default suggestions:', err);
      }
    };
    
    loadDefaultSuggestions();
  }, []);

  // Live search with debounce
  useEffect(() => {
    const performLiveSearch = async () => {
      const trimmedQuery = debouncedQuery.trim();
      if (trimmedQuery.length < 2) {
        setVehicles([]);
        // Don't clear suggestions - keep the default ones loaded on mount
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await liveSearchVehicles(trimmedQuery, 12);
        if (res.status === 1) {
          // Convert live search results to Vehicle type
          const mappedVehicles: Vehicle[] = res.data.vehicles.map((v) => ({
            id: v.id,
            title: v.title,
            brand: v.brand,
            model: v.model,
            year: v.year,
            price: v.price,
            location: v.location,
            images: v.image ? [v.image] : [],
            vehicleType: v.vehicleType || '',
            usageStatus: 'Used In Rwanda' as const,
            fuelType: '',
            color: '',
            mileage: '',
            transmission: '',
            description: '',
            status: 'active',
            views: 0,
            sellerId: '',
            sellerName: v.sellerName,
            sellerPhone: undefined,
            createdAt: '',
            updatedAt: '',
            isFavorite: false,
          }));
          setVehicles(mappedVehicles);
          setSuggestions(res.data.suggestions);
          setHasSearched(true);
        }
      } catch (err) {
        console.error('Live search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    performLiveSearch();
  }, [debouncedQuery]);

  // Full search on submit
  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setIsLoading(true);
    try {
      const res = await searchVehicles({ q: trimmedQuery, status: 'active', sortBy: 'relevance' });
      if (res.status === 1) {
        setVehicles(res.data.vehicles);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Full search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const goToVehicle = (id: string) => {
    router.push(`/vehicle/${id}` as any);
  };

  const showSuggestions = query.trim().length === 0;
  const showResults = hasSearched && vehicles.length > 0;
  const showEmpty = hasSearched && vehicles.length === 0 && !isLoading;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background,paddingTop: insets.top  }]}>
      <SearchSEO query={query} />
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top,borderBottomWidth:0  }, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal, borderBottomWidth: 1 }]}>
        <View style={[styles.headerInner, isDesktopWeb && searchMaxWidth && { maxWidth: searchMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={[styles.searchContainer, { borderColor: isSearchFocused ? colors.primary : colors.border, borderWidth: isSearchFocused ? 3 : 2, backgroundColor: colors.card }]}>
          <IconSymbol name="magnifyingglass" size={18} color={isSearchFocused ? colors.primary : colors.icon} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoFocus
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.icon}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          )}
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb} >
      <View
      style={isDesktopWeb && [styles.webContent, { paddingHorizontal: webPaddingHorizontal }]}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: searchMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Suggestions Section */}
          {showSuggestions && (
            <>
              <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>
                Suggested Searches
              </ThemedText>
              {suggestions.brands.length > 0 && (
                <View style={styles.suggestionSection}>
                  <ThemedText style={[styles.suggestionTitle, { color: colors.text }]}>Popular Brands</ThemedText>
                  <View style={styles.suggestionChips}>
                    {suggestions.brands.map((brand) => (
                      <TouchableOpacity
                        key={brand}
                        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setQuery(brand)}>
                        <ThemedText style={[styles.chipText, { color: colors.text }]}>{brand}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {suggestions.locations.length > 0 && (
                <View style={styles.suggestionSection}>
                  <ThemedText style={[styles.suggestionTitle, { color: colors.text }]}>Locations</ThemedText>
                  <View style={styles.suggestionChips}>
                    {suggestions.locations.map((location) => (
                      <TouchableOpacity
                        key={location}
                        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setQuery(location)}>
                        <ThemedText style={[styles.chipText, { color: colors.text }]}>{location}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Results Section */}
          {query.trim().length > 0 && (
            <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>
              {isLoading ? 'Searching...' : showResults ? `Found ${vehicles.length} results` : showEmpty ? 'No results' : 'Start typing...'}
            </ThemedText>
          )}

          {showResults && vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle as any}
              variant="compact"
              hideFavorite
              onPress={() => goToVehicle(vehicle.id)}
              style={{ marginBottom: 8 }}
            />
          ))}

          {showEmpty && (
            <View style={styles.emptyState}>
              <IconSymbol name="magnifyingglass" size={48} color={colors.icon} />
              <ThemedText style={{ color: colors.icon, marginTop: 16 }}>
                No vehicles found for "{query}"
              </ThemedText>
            </View>
          )}
        </View>
      
       </View>
        <WebFooter />
      </ScrollView> 
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    outlineStyle: 'none' as any,
  },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 200, // Leave space for footer
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  suggestionSection: {
    marginBottom: 16,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  webContent: {
    paddingVertical: 24,
    paddingBottom: 200, // Leave space for footer
   
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginTop:5
  },
});
