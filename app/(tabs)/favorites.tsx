import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors, Elevation, Radius } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VehicleCard } from '@/components/vehicle-card';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useCallback, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchFavorites, removeFavorite, type Favorite } from '@/lib/api-favorites';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { resolveImageUrl } from '@/lib/image-url';
import { getUsageStatusColor } from '@/lib/usage-status';
import { displayPrice } from '@/lib/currencyConverter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function FavoritesScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'My Favorites | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  // Standard Tailwind breakpoints
  const isMd = isWeb && width >= 768 && width < 1024;
  const isLg = isWeb && width >= 1024 && width < 1280;
  const isXl = isWeb && width >= 1280 && width < 1536;
  const is2Xl = isWeb && width >= 1536;
  const webPaddingHorizontal = is2Xl ? 120 : isXl ? 80 : isLg ? 60 : 40;
  const skeletonBase = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const skeletonSoft = theme === 'dark' ? '#111827' : '#F3F4F6';
  // Calculate card width: md/lg = 2 cols, xl/2xl = 3 cols
  const cardWidth = isXl || is2Xl ? 'calc(33.333% - 16px)' : 'calc(50% - 12px)';
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchFavorites();
      setFavorites(res.data.favorites.filter(f => f.vehicle !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const runLoad = async () => {
        if (!mounted) return;
        await loadFavorites();
      };

      runLoad();

      return () => {
        mounted = false;
      };
    }, [loadFavorites])
  );

  const skeletonCount = isDesktopWeb ? (isXl || is2Xl ? 6 : 4) : 4;

  const renderSkeletonCards = () => (
    <View style={[styles.list, isDesktopWeb && [styles.webGrid, { paddingHorizontal: webPaddingHorizontal }]]}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <View
          key={`favorite-skeleton-${index}`}
          style={[
            styles.card,
            isDesktopWeb && [styles.webCard, { width: cardWidth as any }],
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.imageContainer, { backgroundColor: skeletonSoft }]}>
            <View style={[styles.skeletonRemoveBtn, { backgroundColor: skeletonBase }]} />
          </View>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <View style={[styles.skeletonLine, { width: '58%', height: 16, backgroundColor: skeletonBase }]} />
              <View style={[styles.skeletonLine, { width: 84, height: 16, backgroundColor: skeletonBase }]} />
            </View>
            <View style={[styles.skeletonLine, { width: '30%', height: 11, marginBottom: 12, backgroundColor: skeletonBase }]} />
            <View style={[styles.skeletonLine, { width: '44%', height: 12, backgroundColor: skeletonBase }]} />
            <View style={[styles.footer, { borderTopColor: colors.border }]} >
              <View style={[styles.skeletonLine, { width: 96, height: 10, marginBottom: 0, backgroundColor: skeletonBase }]} />
              <View style={[styles.skeletonPill, { backgroundColor: skeletonBase }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const handleToggleFavorite = async (vehicleId: string) => {
    try {
      await removeFavorite(vehicleId);
      setFavorites(prev => prev.filter(f => f.vehicleId !== vehicleId));
    } catch (err) {
      console.error('Remove favorite failed:', err);
    }
  };

  const goToVehicle = (id: string) => {
    router.push(`/vehicle/${id}` as any);
  };

  const goToLogin = () => {
    router.push('/auth/login' as any);
  };

  const isAuthError =
    !!error &&
    /missing auth token|unauthorized|not authenticated|authentication required|invalid or expired session token|expired session token|session token|401/i.test(error);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && [styles.webHeader, { paddingHorizontal: webPaddingHorizontal }]]}>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('favorites.title')}</ThemedText>
      </View>
      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}>

        <View
        style={[styles.scrollContent, isDesktopWeb && [styles.webScrollContent, { paddingHorizontal: webPaddingHorizontal }]]}>
        {isLoading ? (
          renderSkeletonCards()
        ) : isAuthError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
              <IconSymbol name="person.fill" size={42} color={colors.icon} />
            </View>
            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>Sign in to save your favorite cars</ThemedText>
            <ThemedText style={{ color: colors.icon, textAlign: 'center', maxWidth: '80%', marginBottom: 16 }}>
              Sign in to keep your favorites saved and access them on any device.
            </ThemedText>
            <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={goToLogin}>
              <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.icon }}>{error}</ThemedText>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
              <IconSymbol name="heart.fill" size={48} color={colors.icon} />
            </View>
            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>{t('favorites.emptyTitle')}</ThemedText>
            <ThemedText style={{ color: colors.icon, textAlign: 'center', maxWidth: '80%' }}>
              {t('favorites.emptyDesc')}
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.list, isDesktopWeb && [styles.webGrid, { paddingHorizontal: webPaddingHorizontal }]]}>
            {favorites.map((favorite) => {
              const vehicle = favorite.vehicle!;
              return (
                <VehicleCard
                  key={favorite.id}
                  vehicle={vehicle}
                  variant="grid"
                  isFavorited
                  onPress={() => goToVehicle(vehicle.id)}
                  onToggleFavorite={() => handleToggleFavorite(vehicle.id)}
                  style={isDesktopWeb ? { width: cardWidth as any } : undefined}
                />
              );
            })}
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 24,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating tab bar
    paddingTop: 24,
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingBottom: 40,
    paddingTop: 24,
  },
  list: {
    paddingHorizontal: 20,
    gap: 20,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
    alignSelf: 'center',
  },
  webCard: {
    // No minWidth - strict grid based on breakpoints
  },
  webHeader: {
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Elevation.card,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  usageBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  usageBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 12,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  vehiclePrice: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  usageStatus: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vehicleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateSaved: {
    fontSize: 12,
  },
  contactButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radius.md + 2,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
    marginTop: -50,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: Radius.md + 2,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skeletonLine: {
    borderRadius: 6,
    marginBottom: 10,
  },
  skeletonRemoveBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skeletonPill: {
    width: 98,
    height: 28,
    borderRadius: 8,
  },
});
