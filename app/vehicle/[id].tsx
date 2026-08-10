import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, Modal, Pressable, Dimensions } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Elevation, Radius } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { ThemedText } from '@/components/themed-text';
import { Heading } from '@/components/heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoomableImage } from '@/components/zoomable-image';
import { Toast } from '@/components/Toast';
import { GuestPurchaseModal } from '@/components/GuestPurchaseModal';
import { ShareModal } from '@/components/share-modal';
import { fetchVehicleById } from '@/lib/api-vehicles';
import { fetchFavorites, addFavorite, removeFavorite } from '@/lib/api-favorites';
import { createContactRequest, fetchMyContactRequests } from '@/lib/api-contact-requests';
import { startConversation } from '@/lib/api-messages';
import type { Vehicle } from '@/types/vehicle';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { resolveImageUrl } from '@/lib/image-url';
import { getAuthUser, type AuthUser } from '@/lib/userPreference';
import { displayPrice } from '@/lib/currencyConverter';
import { PageHead, VehicleSEO } from '@/components/page-head';
import { VehicleStructuredData } from '@/components/seo-head';

const SEO_API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.inzira.co/api/v1';

// Fuel type icons — custom images where available, fallback to existing SF Symbol icons otherwise
const FUEL_TYPE_ICONS: Record<string, any> = {
  Electric: require('@/assets/customericons/chargingelectric.png'),
  Hybrid: require('@/assets/customericons/hybrid.png'),
  Diesel: require('@/assets/customericons/diesel.png'),
  Petrol: require('@/assets/customericons/petrol-pump.png'),
};
const FUEL_TYPE_FALLBACK_ICON_COLOR: Record<string, string> = {
  Electric: '#3B82F6',
  Hybrid: '#10B981',
  Diesel: '#78350F',
  Petrol: '#DC2626',
  CNG: '#0D9488',
  LPG: '#0D9488',
};

// Car brand logos with transparent backgrounds
const BRAND_LOGOS: Record<string, string> = {
  // ✅ Confirmed working by user
  Toyota: "https://www.carlogos.org/logo/Toyota-logo-1989-2560x1440.png",
  Honda: "https://www.carlogos.org/car-logos/honda-logo-2000-full-download.png",

  // Brandfetch CDN
  "Mercedes-Benz": "https://www.carlogos.org/logo/Mercedes-Benz-logo-2011-1920x1080.png",
  Mercedes: "https://www.carlogos.org/logo/Mercedes-Benz-logo-2011-1920x1080.png",
  BMW: "https://www.carlogos.org/car-logos/bmw-logo-2020-gray-download.png",
  Audi: "https://www.carlogos.org/car-logos/audi-logo-2009-download.png",
  Nissan: "https://www.carlogos.org/car-logos/nissan-logo-2020-black.png",
  Ford: "https://www.carlogos.org/car-logos/ford-logo-2017-download.png",
  Volkswagen: "https://www.carlogos.org/logo/Volkswagen-logo-2015-1920x1080.png",
  Hyundai: "https://www.carlogos.org/car-logos/hyundai-logo-2011-download.png",
  Kia: "https://www.carlogos.org/logo/Kia-logo-2560x1440.png",
  Chevrolet: "https://www.carlogos.org/car-logos/chevrolet-corvette-logo-2020-download.png",
  Mazda: "https://www.carlogos.org/car-logos/mazda-logo-2018-vertical-download.png",
  Subaru: "https://www.carlogos.org/car-logos/subaru-logo-2019-640.png",
  Lexus: "https://www.carlogos.org/logo/Lexus-logo-1988-1920x1080.png",
  Jeep: "https://www.carlogos.org/car-logos/jeep-logo-1993-download.png",
  "Land Rover": "https://www.carlogos.org/logo/Land-Rover-logo-2011-1920x1080.png",
  Porsche: "https://www.carlogos.org/car-logos/porsche-logo-2014.png",
  Volvo: "https://www.carlogos.org/logo/Volvo-logo-2014-1920x1080.png",
  Tesla: "https://www.carlogos.org/car-logos/tesla-logo-2007.png",
  Mitsubishi: "https://www.carlogos.org/logo/Mitsubishi-logo-2000x2500.png",
  Peugeot: "https://www.carlogos.org/logo/Peugeot-logo-2010-1920x1080.png",
  Renault: "https://www.carlogos.org/logo/Renault-logo-2015-2048x2048.png",
  Suzuki: "https://www.carlogos.org/logo/Suzuki-logo-5000x2500.png",
  Isuzu: "https://www.carlogos.org/logo/Isuzu-logo-1991-3840x2160.png",
  Fiat: "https://www.carlogos.org/logo/Fiat-logo-2006-1920x1080.png",
  Jaguar: "https://www.carlogos.org/car-logos/jaguar-logo-2021.png",
  "Range Rover": "https://www.carlogos.org/logo/Rover-logo-2003-3840x2160.png",
  Acura: "https://www.carlogos.org/logo/Acura-logo-1990-1024x768.png",
  Infiniti: "https://www.carlogos.org/logo/Infiniti-logo-1989-2560x1440.png",
  Cadillac: "https://www.carlogos.org/car-logos/cadillac-logo-2021.png",
  Dodge: "https://www.carlogos.org/car-logos/dodge-logo-2010.png",
  GMC: "https://www.carlogos.org/logo/GMC-logo-2200x600.png",
  "Aston Martin": "https://www.carlogos.org/logo/Aston-Martin-logo-2003-6000x3000.png",
};

// Maps a raw usage-status value (as stored on the vehicle record) to the same
// localized display label used on the explore/category screens, reusing the
// existing `explore.usageStatusLabels` translation keys (no duplicate strings).
const USAGE_STATUS_LABEL_KEY_MAP: Record<string, string> = {
  'Brand New': 'brandNew',
  'Imported Used': 'importedUsed',
  'Used In Rwanda': 'usedInRwanda',
};
function getUsageStatusDisplayLabel(value: string | undefined, t: (key: string) => string): string {
  if (!value) return '';
  const key = USAGE_STATUS_LABEL_KEY_MAP[value];
  return key ? t(`explore.usageStatusLabels.${key}`) : value;
}

/**
 * Vehicles keyed by id, populated during `expo export` by generateStaticParams
 * and read back when this screen renders in Node. Without it the prerendered
 * HTML for every listing is an empty shell — the fetch below only ever runs in
 * a browser, so crawlers see no title, price, or description.
 *
 * In the browser this map is empty; the same data arrives as __INZIRA_VEHICLE__,
 * written into each page's <head> by scripts/inject-dist-seo.js. Seeding both
 * sides from the same payload is what keeps hydration from mismatching.
 */
const PRERENDER_VEHICLES = new Map<string, Vehicle>();

function getSeedVehicle(id: string | undefined): Vehicle | null {
  if (!id) return null;

  const fromBuild = PRERENDER_VEHICLES.get(String(id));
  if (fromBuild) return fromBuild;

  if (typeof window !== 'undefined') {
    const seeded = (window as any).__INZIRA_VEHICLE__ as Vehicle | undefined;
    if (seeded && String(seeded.id) === String(id)) return seeded;
  }

  return null;
}

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    const response = await fetch(`${SEO_API_BASE}/vehicles?status=active`);
    if (!response.ok) return [];

    const json = (await response.json()) as {
      data?: { vehicles?: Vehicle[] };
    };

    const vehicles = Array.isArray(json?.data?.vehicles) ? json.data.vehicles : [];
    const withIds = vehicles.filter((vehicle) => Boolean(vehicle?.id));

    for (const vehicle of withIds) {
      PRERENDER_VEHICLES.set(String(vehicle.id), vehicle);
    }

    return withIds.map((vehicle) => ({ id: String(vehicle.id) }));
  } catch {
    return [];
  }
}

export default function VehicleDetailsScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Vehicle Details | Inzira';
    }
  }, []);

  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;

  const detailsContainerMaxWidth = isWebXl ? 1040 : isWebLg ? 960 : isWebMd ? 880 : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;

  const seedVehicle = getSeedVehicle(id);
  const [vehicle, setVehicle] = useState<Vehicle | null>(seedVehicle);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);
  // Seeded pages already have something to paint, so don't flash a spinner
  // over content that is present in the HTML.
  const [isLoading, setIsLoading] = useState(!seedVehicle);
  const [isBuying, setIsBuying] = useState(false);
  const [hasPlacedOrder, setHasPlacedOrder] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showGuestPurchaseModal, setShowGuestPurchaseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState<{ title: string; body?: string; icon?: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const thumbnailScrollRef = useRef<ScrollView>(null);
  const loginRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginToastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadData = async () => {
      try {
        // Keep the seeded content on screen while this revalidates in the
        // background; only show the spinner when there is nothing to show.
        if (!getSeedVehicle(id)) setIsLoading(true);
        const [vehicleRes, favoritesRes, ordersRes] = await Promise.all([
          fetchVehicleById(id),
          fetchFavorites().catch(() => ({ data: { favorites: [] } })),
          fetchMyContactRequests().catch(() => ({ data: { requests: [] } })),
        ]);
        const user = await getAuthUser();

        if (mounted) {
          setVehicle(vehicleRes.data.vehicle);
          setIsFavorited(favoritesRes.data.favorites.some(f => f.vehicleId === id));
          setHasPlacedOrder(ordersRes.data.requests.some((req: any) => req.vehicleId === id));
          setAuthUser(user);
        }
      } catch (err) {
        console.error('Failed to load vehicle:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    return () => {
      if (loginRedirectTimerRef.current) clearTimeout(loginRedirectTimerRef.current);
      if (loginToastHideTimerRef.current) clearTimeout(loginToastHideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!thumbnailScrollRef.current || !vehicle?.images) return;
    const thumbWidth = 78; // 70 width + 8 gap
    const screenWidth = Dimensions.get('window').width;
    const offset = Math.max(0, (currentImageIndex * thumbWidth) - (screenWidth / 2) + (thumbWidth / 2));
    thumbnailScrollRef.current.scrollTo({ x: offset, animated: true });
  }, [currentImageIndex, vehicle?.images]);

  useEffect(() => {
    if (vehicle && typeof document !== 'undefined') {
      const carName = `${vehicle.year || ''} ${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
      document.title = carName ? `${carName} | Inzira` : 'Vehicle Details | Inzira';
    }
  }, [vehicle]);

  const redirectToLoginWithToast = () => {
    setShowLoginToast(true);
    if (loginRedirectTimerRef.current) clearTimeout(loginRedirectTimerRef.current);
    if (loginToastHideTimerRef.current) clearTimeout(loginToastHideTimerRef.current);
    loginRedirectTimerRef.current = setTimeout(() => {
      router.push('/auth/login' as any);
    }, 700);
    loginToastHideTimerRef.current = setTimeout(() => {
      setShowLoginToast(false);
    }, 2200);
  };

  const ensureLoggedIn = async () => {
    const user = authUser ?? (await getAuthUser());
    if (user) {
      if (!authUser) setAuthUser(user);
      return true;
    }
    redirectToLoginWithToast();
    return false;
  };

  const onToggleFavorite = async () => {
    if (!id || isFavLoading) return;
    const isAuthenticated = await ensureLoggedIn();
    if (!isAuthenticated) return;
    setIsFavLoading(true);
    try {
      if (isFavorited) {
        await removeFavorite(id);
        setIsFavorited(false);
        setToast({ title: t('home.removedFromFavorites'), icon: 'heart' });
      } else {
        await addFavorite(id);
        setIsFavorited(true);
        setToast({ title: t('home.addedToFavorites'), icon: 'heart.fill' });
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!vehicle || isBuying || hasPlacedOrder) return;
    
    // Check if user is authenticated
    const user = authUser ?? (await getAuthUser());
    
    if (!user) {
      // Show guest purchase modal for unauthenticated users
      setShowGuestPurchaseModal(true);
      return;
    }
    
    // Authenticated user flow
    setIsBuying(true);
    try {
      const initialMessage = t('vehicleDetails.buyIntentMessage', { title: vehicle.title });
      await createContactRequest({ vehicleId: vehicle.id, message: initialMessage });
      await startConversation(vehicle.id, initialMessage);
      setHasPlacedOrder(true);
      setIsBuying(false);
      setToast({ title: t('vehicleDetails.orderSentTitle'), body: t('vehicleDetails.orderSentBody') });
      Alert.alert(t('vehicleDetails.orderSentTitle'), t('vehicleDetails.orderSentAlertBody'));
      router.push('/messages');
    } catch (err) {
      setIsBuying(false);
      Alert.alert(t('profile.error'), err instanceof Error ? err.message : t('vehicleDetails.failedToPlaceOrder'));
    }
  };

  const skeletonBase = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const skeletonSoft = theme === 'dark' ? '#111827' : '#F3F4F6';

  // ─── LOADING STATE ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <PageHead
          title={t('vehicleDetails.seoLoadingTitle')}
          description={t('vehicleDetails.seoLoadingDescription')}
          url={`https://inzira.co/vehicle/${id}`}
          type="product"
        />
        <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
          <View
            style={[
              styles.scrollContent,
              isDesktopWeb && styles.webScrollContent,
              isDesktopWeb && {
                maxWidth: detailsContainerMaxWidth,
                paddingHorizontal: webHorizontalPadding,
              },
            ]}>

            {/* Desktop skeleton: two-column hero */}
            {isDesktopWeb ? (
              <View style={styles.desktopHeroRow}>
                {/* Left: image skeleton */}
                <View style={[styles.desktopHeroImageWrapper, { backgroundColor: skeletonSoft, borderRadius: 16, overflow: 'hidden' }]}>
                  <View style={[{ flex: 1, backgroundColor: skeletonBase }]} />
                </View>

                {/* Right: info skeleton */}
                <View style={styles.desktopHeroInfoWrapper}>
                  <View style={[styles.skeletonTitle, { backgroundColor: skeletonBase, marginTop: 0 }]} />
                  <View style={[styles.skeletonBadge, { backgroundColor: skeletonBase }]} />
                  {/* trust badges row */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                    <View style={[{ height: 22, width: 90, borderRadius: 4, backgroundColor: skeletonBase }]} />
                    <View style={[{ height: 22, width: 80, borderRadius: 4, backgroundColor: skeletonBase }]} />
                  </View>
                  <View style={[styles.skeletonLine, { width: '48%', height: 24, backgroundColor: skeletonBase, marginBottom: 16 }]} />
                  <View style={[styles.skeletonLine, { width: '68%', backgroundColor: skeletonBase, marginBottom: 20 }]} />
                  {/* action buttons skeleton */}
                  <View style={styles.actionsRow}>
                    <View style={[styles.skeletonButton, { backgroundColor: skeletonBase }]} />
                    <View style={[styles.skeletonButton, { backgroundColor: skeletonBase }]} />
                  </View>
                </View>
              </View>
            ) : (
              /* Mobile skeleton: original stacked layout */
              <View style={[styles.heroContainer, { backgroundColor: skeletonSoft }]}>
                <View style={[styles.heroImage, { backgroundColor: skeletonBase }]} />
              </View>
            )}

            <View style={[styles.contentContainer, isDesktopWeb && styles.webContentContainer]}>
              {/* On mobile loading, show title/badge/price skeleton below image */}
              {!isDesktopWeb && (
                <>
                  <View style={[styles.skeletonTitle, { backgroundColor: skeletonBase }]} />
                  <View style={[styles.skeletonBadge, { backgroundColor: skeletonBase }]} />
                  <View style={[styles.skeletonLine, { width: '42%', backgroundColor: skeletonBase }]} />
                  <View style={[styles.skeletonLine, { width: '68%', marginBottom: 16, backgroundColor: skeletonBase }]} />
                  <View style={styles.actionsRow}>
                    <View style={[styles.skeletonButton, { backgroundColor: skeletonBase }]} />
                    <View style={[styles.skeletonButton, { backgroundColor: skeletonBase }]} />
                  </View>
                </>
              )}

              <View style={[styles.specGrid, isDesktopWeb && styles.webSpecGrid, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View
                    key={`spec-skeleton-${index}`}
                    style={[
                      styles.specItem,
                      isDesktopWeb && styles.webSpecItem,
                      { borderColor: colors.border, backgroundColor: colors.background },
                    ]}>
                    <View style={[styles.skeletonLine, { width: '48%', height: 10, marginBottom: 8, backgroundColor: skeletonBase }]} />
                    <View style={[styles.skeletonSpecValue, { backgroundColor: skeletonBase }]} />
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <View style={[styles.skeletonSectionTitle, { backgroundColor: skeletonBase }]} />
                <View style={styles.galleryRow}>
                  <View style={[styles.skeletonGalleryItem, { backgroundColor: skeletonBase }]} />
                  <View style={[styles.skeletonGalleryItem, { backgroundColor: skeletonBase }]} />
                </View>
              </View>

              <View style={styles.section}>
                <View style={[styles.skeletonSectionTitle, { backgroundColor: skeletonBase }]} />
                <View style={[styles.skeletonLine, { width: '100%', backgroundColor: skeletonBase }]} />
                <View style={[styles.skeletonLine, { width: '92%', backgroundColor: skeletonBase }]} />
                <View style={[styles.skeletonLine, { width: '74%', backgroundColor: skeletonBase }]} />
              </View>
            </View>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ─── NOT FOUND ────────────────────────────────────────────────────────────────
  if (!vehicle) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <PageHead
          title={t('vehicleDetails.seoNotFoundTitle')}
          description={t('vehicleDetails.seoNotFoundDescription')}
          url={`https://inzira.co/vehicle/${id}`}
          noIndex
        />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold">{t('vehicleDetails.pageTitle')}</ThemedText>
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.notFoundContainer}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>{t('vehicleDetails.vehicleNotFound')}</ThemedText>
          <TouchableOpacity
            style={[{ backgroundColor: colors.primary, alignSelf: 'center', paddingVertical: 14, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center' }]}
            onPress={() => router.back()}>
            <ThemedText style={styles.primaryButtonText}>{t('vehicleDetails.goBack')}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── DERIVED VALUES ───────────────────────────────────────────────────────────
  const heroColorHex = getVehicleColorHex(vehicle.color || '');
  const isOwner = Boolean(authUser && vehicle && vehicle.sellerId === authUser.id);
  const hasStock = Number(vehicle.quantity || 0) > 1;
  const carsLeft = hasStock ? Number(vehicle.remainingQuantity || 0) : null;
  const isAvailable = vehicle.status === 'active';
  const verificationScore = Number(vehicle.verificationScore || 0);
  const sellerTierLabel =
    vehicle.sellerTier === 'dealer_pro' ? t('vehicleDetails.sellerTierDealerPro')
    : vehicle.sellerTier === 'trusted' ? t('vehicleDetails.sellerTierTrusted')
    : vehicle.sellerTier === 'verified' ? t('vehicleDetails.sellerTierVerificationPending')
    : t('vehicleDetails.sellerTierBasic');
  const verificationDateText = vehicle.lastVerifiedAt
    ? new Date(vehicle.lastVerifiedAt).toLocaleDateString()
    : t('vehicleDetails.notAvailable');

  // ─── ACTION BUTTONS (shared between desktop right-panel and mobile bottom) ────
  const ActionButtons = () => (
    <View style={styles.actionsRow}>
      {/* Share — icon button, fixed width, sits beside Favorite */}
      <TouchableOpacity
        style={[styles.favButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowShareModal(true)}>
        <IconSymbol name="square.and.arrow.up" size={19} color={colors.icon} />
      </TouchableOpacity>

      {/* Favorite — icon button, fixed width, sits beside Buy */}
      <TouchableOpacity
        style={[styles.favButton, {
          borderColor: isFavorited ? '#EF4444' : colors.border,
          backgroundColor: isFavorited
            ? 'rgba(239,68,68,0.08)'
            : colors.card,
          opacity: isFavLoading ? 0.5 : 1,
        }]}
        onPress={onToggleFavorite}
        disabled={isFavLoading}>
        <IconSymbol
          name="heart.fill"
          size={20}
          color={isFavorited ? '#EF4444' : colors.icon}
        />
      </TouchableOpacity>

      {hasPlacedOrder ? (
        <View style={[styles.primaryButton, { backgroundColor: colors.icon, opacity: 0.6 }]}>
          <ThemedText style={styles.primaryButtonText}>{t('vehicleDetails.alreadyOrdered')}</ThemedText>
        </View>
      ) : !isAvailable ? (
        <View style={[styles.primaryButton, { backgroundColor: '#6B7280', opacity: 0.6 }]}>
          <ThemedText style={styles.primaryButtonText}>{t('vehicleDetails.sold')}</ThemedText>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isBuying ? 0.7 : 1 }]}
          onPress={handleBuyNow}
          disabled={isBuying}>
          <ThemedText style={styles.primaryButtonText}>{isBuying ? t('vehicleDetails.ordering') : t('vehicleDetails.buyNow')}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── HERO INFO PANEL (title, badges, price, location, actions) ───────────────
  const HeroInfoPanel = () => (
    <View style={{ flex: 1 }}>
      <Heading level={1} type="defaultSemiBold" style={styles.title}>{vehicle.title}{vehicle.model ? ` . ${vehicle.model}` : ''}</Heading>

      <View style={[styles.usageBadge, { backgroundColor: `${colors.primary}1A`, marginTop: 10 }]}>
        <ThemedText style={[styles.usageBadgeText, { color: colors.primary }]}>{getUsageStatusDisplayLabel(vehicle.usageStatus, t)}</ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {(vehicle.verificationStatus === 'approved' || vehicle.sellerTier === 'trusted' || vehicle.sellerTier === 'dealer_pro') && (
          <View style={{ backgroundColor: '#3B82F620', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
            <ThemedText style={{ color: '#3B82F6', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.verifiedSellerBadge')}</ThemedText>
          </View>
        )}
        {vehicle.verificationChecklist?.ownershipDocsVerified && (
          <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
            <ThemedText style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.docCheckedBadge')}</ThemedText>
          </View>
        )}
        {(vehicle.usageStatus === 'Used In Rwanda' || vehicle.verificationChecklist?.inspectionDateAvailable) && (
          <View style={{ backgroundColor: '#F59E0B20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
            <ThemedText style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.rwandaInspectedBadge')}</ThemedText>
          </View>
        )}
      </View>

      <ThemedText style={[styles.price, { color: colors.primary }]}>{displayPrice(Number(vehicle.price) || 0)}</ThemedText>

      {carsLeft !== null && carsLeft > 0 && (
        <View style={styles.carsLeftChip}>
          <IconSymbol name="car.rear.fill" size={13} color="#16A34A" />
          <ThemedText style={styles.carsLeftChipText}>{t('vehicleCard.carsLeft', { count: carsLeft })}</ThemedText>
        </View>
      )}

      <View style={styles.locationRow}>
        <IconSymbol name="location.fill" size={14} color={colors.icon} style={{ marginRight: 6 }} />
        <ThemedText style={{ color: colors.icon }}>{vehicle.location}</ThemedText>
        <ThemedText style={{ color: colors.icon }}> • {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : ''}</ThemedText>
      </View>

      <ThemedText style={{ color: '#16A34A', fontSize: 13, fontWeight: '600' }}>
        {vehicle.sellerType === 'company'
          ? t('vehicleDetails.sellerTypeBusiness')
          : (vehicle as any).isBrokered
            ? t('vehicleDetails.sellerTypeDealer')
            : t('vehicleDetails.sellerTypeOwner')}
      </ThemedText>

      {!isOwner && <ActionButtons />}
    </View>
  );

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <VehicleSEO
        title={vehicle.title}
        brand={vehicle.brand}
        model={vehicle.model}
        year={vehicle.year}
        price={Number(vehicle.price || 0)}
        description={vehicle.description || `${vehicle.year} ${vehicle.brand} ${vehicle.model} listed on Inzira.`}
        image={resolveImageUrl(vehicle.images?.[0])}
        id={vehicle.id || id}
      />
      <VehicleStructuredData
        vehicle={{
          title: vehicle.title,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          price: Number(vehicle.price || 0),
          description: vehicle.description,
          images: vehicle.images?.map((imageUrl) => resolveImageUrl(imageUrl)) || [],
          location: vehicle.location,
          mileage: vehicle.mileage,
          fuelType: vehicle.fuelType,
          url: `https://inzira.co/vehicle/${vehicle.id || id}`,
        }}
      />

      {showLoginToast && (
        <View pointerEvents="none" style={styles.toastOverlay}>
          <View style={[styles.toastCard, { backgroundColor: theme === 'dark' ? '#0F172A' : '#111827' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#F59E0B" />
            <ThemedText style={styles.toastText}>{t('home.mustLoginFirst')}</ThemedText>
          </View>
        </View>
      )}
      {!!toast && (
        <Toast
          visible={!!toast}
          title={toast.title}
          body={toast.body}
          icon={toast.icon}
          onHide={() => setToast(null)}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View
          style={[
            styles.scrollContent,
            { paddingBottom: 20 + insets.bottom },
            isDesktopWeb && styles.webScrollContent,
            isDesktopWeb && {
              maxWidth: detailsContainerMaxWidth,
              paddingHorizontal: webHorizontalPadding,
            },
          ]}>

          {/* ── DESKTOP: two-column hero ─────────────────────────────────────── */}
          {isDesktopWeb ? (
            <View style={styles.desktopHeroRow}>
              {/* Left column: image */}
              <View style={styles.desktopHeroImageWrapper}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    setCurrentImageIndex(0);
                    setShowImageViewer(true);
                  }}>
                  <Image
                    source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
                    style={styles.desktopHeroImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
                {/* overlay controls */}
                <View style={styles.heroActions}>
                  <TouchableOpacity
                    style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                    onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                      onPress={() => setShowImageViewer(true)}>
                      <IconSymbol name="arrow.up.left.and.arrow.down.right" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                      onPress={() => setShowShareModal(true)}>
                      <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                    </TouchableOpacity>
                    {!isOwner && (
                      <TouchableOpacity
                        style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                        onPress={onToggleFavorite}>
                        <IconSymbol name="heart.fill" size={20} color={isFavorited ? '#EF4444' : '#fff'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {heroColorHex && vehicle.color ? (
                  <View style={[styles.imageColorBadge, { borderBottomLeftRadius: 16 }]}>
                    <View style={[styles.imageColorDot, { backgroundColor: heroColorHex }]} />
                    <ThemedText style={styles.imageColorText} numberOfLines={1}>{vehicle.color}</ThemedText>
                  </View>
                ) : null}
              </View>

              {/* Right column: info panel */}
              <View style={styles.desktopHeroInfoWrapper}>
                <HeroInfoPanel />
              </View>
            </View>
          ) : (
            /* ── MOBILE: original stacked hero ──────────────────────────────── */
            <>
              <View style={[styles.heroContainer]}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    setCurrentImageIndex(0);
                    setShowImageViewer(true);
                  }}>
                  <Image
                    source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
                    style={styles.heroImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
                <View style={styles.heroActions}>
                  <TouchableOpacity
                    style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                    onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                      onPress={() => setShowImageViewer(true)}>
                      <IconSymbol name="arrow.up.right.and.arrow.down.left" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                      onPress={() => setShowShareModal(true)}>
                      <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                    </TouchableOpacity>
                    {!isOwner && (
                      <TouchableOpacity
                        style={[styles.overlayButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                        onPress={onToggleFavorite}>
                        <IconSymbol name="heart.fill" size={20} color={isFavorited ? '#EF4444' : '#fff'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {heroColorHex && vehicle.color ? (
                  <View style={[styles.imageColorBadge, { borderBottomLeftRadius: 0 }]}>
                    <View style={[styles.imageColorDot, { backgroundColor: heroColorHex }]} />
                    <ThemedText style={styles.imageColorText} numberOfLines={1}>{vehicle.color}</ThemedText>
                  </View>
                ) : null}
              </View>
            </>
          )}

          {/* ── CONTENT BELOW HERO ───────────────────────────────────────────── */}
          <View style={[styles.contentContainer, isDesktopWeb && styles.webContentContainer]}>

            {/* Mobile-only: title/badge/price/location/actions appear here */}
            {!isDesktopWeb && (
              <>
                <Heading level={1} type="defaultSemiBold" style={styles.title}>{vehicle.title}</Heading>
                <View style={[styles.usageBadge, { backgroundColor: `${colors.primary}1A` }]}>
                  <ThemedText style={[styles.usageBadgeText, { color: colors.primary }]}>{getUsageStatusDisplayLabel(vehicle.usageStatus, t)}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(vehicle.verificationStatus === 'approved' || vehicle.sellerTier === 'trusted' || vehicle.sellerTier === 'dealer_pro') && (
                    <View style={{ backgroundColor: '#3B82F620', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                      <ThemedText style={{ color: '#3B82F6', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.verifiedSellerBadge')}</ThemedText>
                    </View>
                  )}
                  {vehicle.verificationChecklist?.ownershipDocsVerified && (
                    <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                      <ThemedText style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.docCheckedBadge')}</ThemedText>
                    </View>
                  )}
                  {(vehicle.usageStatus === 'Used In Rwanda' || vehicle.verificationChecklist?.inspectionDateAvailable) && (
                    <View style={{ backgroundColor: '#F59E0B20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                      <ThemedText style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>{t('vehicleDetails.rwandaInspectedBadge')}</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={[styles.price, { color: colors.primary }]}>{displayPrice(Number(vehicle.price) || 0)}</ThemedText>
                {carsLeft !== null && carsLeft > 0 && (
                  <View style={styles.carsLeftChip}>
                    <IconSymbol name="car.rear.fill" size={13} color="#16A34A" />
                    <ThemedText style={styles.carsLeftChipText}>{t('vehicleCard.carsLeft', { count: carsLeft })}</ThemedText>
                  </View>
                )}
                <View style={styles.locationRow}>
                  <IconSymbol name="location.fill" size={14} color={colors.icon} style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: colors.icon }}>{vehicle.location}</ThemedText>
                  <ThemedText style={{ color: colors.icon }}> • {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : ''}</ThemedText>
                </View>
                <ThemedText style={{ color: '#16A34A', fontSize: 13, fontWeight: '600' }}>
                  {vehicle.sellerType === 'company'
                    ? t('vehicleDetails.sellerTypeBusiness')
                    : (vehicle as any).isBrokered
                      ? t('vehicleDetails.sellerTypeDealer')
                      : t('vehicleDetails.sellerTypeOwner')}
                </ThemedText>
                {!isOwner && <ActionButtons />}
              </>
            )}

            {/* Spec grid — both layouts */}
            <View style={[styles.specGrid, isDesktopWeb && styles.webSpecGrid, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <SpecItem label={t('vehicleDetails.specYear')} value={vehicle.year} colors={colors} isDesktopWeb={isDesktopWeb} />
              <SpecItem label={t('vehicleDetails.specMileage')} value={vehicle.mileage} colors={colors} isDesktopWeb={isDesktopWeb} />
              <View style={[styles.specItem, isDesktopWeb && styles.webSpecItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <ThemedText style={[styles.specLabel, { color: colors.icon }]}>{t('vehicleDetails.specFuel')}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {vehicle.fuelType && FUEL_TYPE_ICONS[vehicle.fuelType] ? (
                    <Image source={FUEL_TYPE_ICONS[vehicle.fuelType]} style={{ width: 16, height: 16 }} contentFit="contain" />
                  ) : (
                    <IconSymbol
                      name="fuelpump.fill"
                      size={14}
                      color={FUEL_TYPE_FALLBACK_ICON_COLOR[vehicle.fuelType || ''] || '#DC2626'}
                    />
                  )}
                  <ThemedText style={[styles.specValue, { color: colors.text }]}>{vehicle.fuelType}</ThemedText>
                </View>
              </View>
              <SpecItem label={t('vehicleDetails.specTransmission')} value={vehicle.transmission} colors={colors} isDesktopWeb={isDesktopWeb} />
              <SpecItem label={t('vehicleDetails.specColor')} value={vehicle.color || t('vehicleDetails.notAvailable')} colors={colors} isDesktopWeb={isDesktopWeb} />
              {vehicle.fuelType === 'Electric' ? (
                <SpecItem label={t('vehicleDetails.specBatteryRange')} value={vehicle.batteryRange ? `${vehicle.batteryRange} km` : t('vehicleDetails.notAvailable')} colors={colors} isDesktopWeb={isDesktopWeb} />
              ) : (
                <SpecItem label={t('vehicleDetails.specEngineSize')} value={vehicle.engineSize || t('vehicleDetails.notAvailable')} colors={colors} isDesktopWeb={isDesktopWeb} />
              )}
              <SpecItem label={t('vehicleDetails.specDriveType')} value={vehicle.driveType || t('vehicleDetails.notAvailable')} colors={colors} isDesktopWeb={isDesktopWeb} />
              <SpecItem label={t('vehicleDetails.specType')} value={vehicle.vehicleType} colors={colors} isDesktopWeb={isDesktopWeb} />
              <SpecItem label={t('vehicleDetails.specUsage')} value={vehicle.usageStatus ? getUsageStatusDisplayLabel(vehicle.usageStatus, t) : t('vehicleDetails.notAvailable')} colors={colors} isDesktopWeb={isDesktopWeb} />
              <View style={[styles.specItem, isDesktopWeb && styles.webSpecItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <ThemedText style={[styles.specLabel, { color: colors.icon }]}>{t('vehicleDetails.specBrand')}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {vehicle.brand && BRAND_LOGOS[vehicle.brand] && (
                    <View style={{backgroundColor:"white", padding:3 , borderRadius:5}}>
                      <Image
                      source={{ uri: BRAND_LOGOS[vehicle.brand] }}
                      style={{ width: 32, height: 32 }}
                      contentFit="contain"
                    />
                      </View>
                  )}
                  <ThemedText style={[styles.specValue, { color: colors.text }]}>{vehicle.brand || t('vehicleDetails.notAvailable')}</ThemedText>
                </View>
              </View>
              <SpecItem label={t('vehicleDetails.specBodyType')} value={(vehicle as any).bodyType} colors={colors} isDesktopWeb={isDesktopWeb} />
            </View>

            {/* Gallery */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('vehicleDetails.gallery')}</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {vehicle.images.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={imageUrl}
                    onPress={() => {
                      setCurrentImageIndex(index);
                      setShowImageViewer(true);
                    }}>
                    <Image source={{ uri: resolveImageUrl(imageUrl) }} style={[styles.galleryImage, { borderColor: colors.border }]} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('vehicleDetails.description')}</ThemedText>
              <ThemedText style={[styles.description, { color: colors.icon }]}>{vehicle.description || t('vehicleDetails.noDescriptionProvided')}</ThemedText>
            </View>

            {!isOwner && (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('vehicleDetails.seller')}</ThemedText>
                <View style={[styles.sellerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  {/* Seller identity row */}
                  <View style={styles.sellerIdentityRow}>
                    <View style={[styles.sellerAvatar, { backgroundColor: `${colors.primary}18` }]}>
                      <IconSymbol
                        name={vehicle.sellerType === 'company' ? 'building.2.fill' : 'person.fill'}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
                        {vehicle.sellerType === 'company'
                          ? (vehicle.sellerName || t('vehicleDetails.sellerTypeBusiness'))
                          : t('vehicleDetails.sellerPrefix', { name: vehicle.sellerName || t('vehicleDetails.individual') })}
                      </ThemedText>
                      <ThemedText style={[styles.sellerName, { color: colors.icon, fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
                        {vehicle.sellerName || '—'}
                      </ThemedText>
                      <View style={[styles.tierPill, { backgroundColor: `${colors.primary}18` }]}>
                        <ThemedText style={[styles.tierPillText, { color: colors.primary }]}>{sellerTierLabel}</ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.checkValidityButton, { backgroundColor: colors.primary }]}
                      onPress={() => setShowValidityModal(true)}>
                      <IconSymbol name="checkmark.seal.fill" size={14} color="#fff" />
                      <ThemedText style={styles.checkValidityButtonText}>{t('vehicleDetails.verify')}</ThemedText>
                    </TouchableOpacity>
                  </View>


                </View>
              </View>
            )}

            {!isOwner && (
              <>

                <View style={[styles.sellerCard, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
                  <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>{t('vehicleDetails.buyerSafetyGuide')}</ThemedText>
                  <ThemedText style={{ color: colors.icon, fontSize: 12 }}>• {t('vehicleDetails.safetyTipMeetPublic')}</ThemedText>
                  <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>• {t('vehicleDetails.safetyTipVerifyDocuments')}</ThemedText>
                  <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>• {t('vehicleDetails.safetyTipAvoidSharingOtp')}</ThemedText>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: '#DC2626', marginTop: 10 }]}
                    onPress={() =>
                      router.push(
                        `/report?targetType=vehicle&targetId=${encodeURIComponent(vehicle.id || id)}&reason=${encodeURIComponent('Scam or Spam')}&description=${encodeURIComponent(`Potential scam reported for listing ${vehicle.title}`)}` as any
                      )
                    }>
                    <ThemedText style={{ color: '#DC2626', fontWeight: '600', textDecorationLine: 'underline' }}>{t('vehicleDetails.reportProblem')}</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
        <WebFooter />
      </ScrollView>

      {/* ── FULL IMAGE VIEWER MODAL ───────────────────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showImageViewer}
        onRequestClose={() => setShowImageViewer(false)}>
        <Pressable style={styles.imageViewerOverlay} onPress={() => setShowImageViewer(false)}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}>
            <IconSymbol name="xmark" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Image counter */}
          <View style={styles.imageViewerCounter}>
            <ThemedText style={styles.imageViewerCounterText}>
              {currentImageIndex + 1} / {vehicle.images?.length || 1}
            </ThemedText>
          </View>

          {/* Main image with navigation */}
          <Pressable
            style={[
              styles.imageViewerMainArea,
              // Native only: padding clears the absolutely-positioned controls.
              // Web must NOT have these or height:'100%' on the image resolves to 0.
              !isWeb && { paddingTop: 100, paddingBottom: 124, paddingHorizontal: 20 },
              isWeb && !isDesktopWeb && { paddingHorizontal: 8 },
            ]}
            onPress={(e) => e.stopPropagation()}>

            {/* Previous button */}
            {currentImageIndex > 0 && (
              <TouchableOpacity
                style={[styles.imageViewerNavButton, styles.imageViewerNavButtonLeft]}
                onPress={() => setCurrentImageIndex(prev => prev - 1)}>
                <IconSymbol name="chevron.left" size={32} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Current image — plain on web, zoomable (pinch) on native */}
            {isWeb ? (
              <Image
                source={{ uri: resolveImageUrl(vehicle.images?.[currentImageIndex]) }}
                style={{ flex: 1, width: '100%' }}
                contentFit="contain"
              />
            ) : (
              <View style={styles.imageViewerImage}>
                <ZoomableImage
                  uri={resolveImageUrl(vehicle.images?.[currentImageIndex])}
                  resetKey={currentImageIndex}
                />
              </View>
            )}

            {/* Zoom hint — native only */}
            {!isWeb && (
              <View style={styles.imageViewerZoomHint} pointerEvents="none">
                <IconSymbol name="arrow.up.left.and.arrow.down.right" size={13} color="rgba(255,255,255,0.85)" />
                <ThemedText style={styles.imageViewerZoomHintText}>{t('vehicleDetails.pinchToZoom')}</ThemedText>
              </View>
            )}

            {/* Next button */}
            {currentImageIndex < (vehicle.images?.length || 1) - 1 && (
              <TouchableOpacity
                style={[styles.imageViewerNavButton, styles.imageViewerNavButtonRight]}
                onPress={() => setCurrentImageIndex(prev => prev + 1)}>
                <IconSymbol name="chevron.right" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </Pressable>

          {/* Thumbnail strip at bottom (WhatsApp style) */}
          <View style={styles.imageViewerThumbnailStrip} onStartShouldSetResponder={() => true}>
            <ScrollView
              ref={thumbnailScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.imageViewerThumbnailContent,
                { paddingHorizontal: Math.max(20, (Dimensions.get('window').width - 70) / 2) }
              ]}>
              {vehicle.images?.map((imageUrl, index) => (
                <TouchableOpacity
                  key={imageUrl}
                  onPress={() => setCurrentImageIndex(index)}
                  style={[
                    styles.imageViewerThumbnail,
                    index === currentImageIndex && styles.imageViewerThumbnailActive
                  ]}>
                  <Image
                    source={{ uri: resolveImageUrl(imageUrl) }}
                    style={styles.imageViewerThumbnailImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={{marginBottom:insets.bottom+20}} />
        </Pressable>
      </Modal>

      {/* ── CHECK VALIDITY MODAL ─────────────────────────────────────────────── */}
      <Modal animationType="fade" transparent={true} visible={showValidityModal} onRequestClose={() => setShowValidityModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowValidityModal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <IconSymbol name="checkmark.seal.fill" size={24} color={colors.primary} />
                <ThemedText type="defaultSemiBold" style={styles.modalTitle}>{t('vehicleDetails.verificationDetails')}</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setShowValidityModal(false)}>
                <IconSymbol name="xmark" size={22} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={[styles.verificationBadge, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="checkmark.seal.fill" size={32} color={colors.primary} />
                <ThemedText type="defaultSemiBold" style={[styles.verificationScore, { color: colors.primary }]}>{verificationScore}/100</ThemedText>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <ThemedText style={[styles.infoLabel, { color: colors.icon }]}>{t('vehicleDetails.sellerTierLabel')}</ThemedText>
                <ThemedText type="defaultSemiBold">{sellerTierLabel}</ThemedText>
              </View>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <ThemedText style={[styles.infoLabel, { color: colors.icon }]}>{t('vehicleDetails.lastVerified')}</ThemedText>
                <ThemedText>{verificationDateText}</ThemedText>
              </View>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <ThemedText style={[styles.infoLabel, { color: colors.icon }]}>{t('vehicleDetails.verifier')}</ThemedText>
                <ThemedText>{vehicle.verifierType || t('vehicleDetails.notYetVerified')}</ThemedText>
              </View>

              {vehicle.verificationChecklist && (
                <View style={[styles.checklistContainer, { borderTopColor: colors.border }]}>
                  <ThemedText style={[styles.infoLabel, { color: colors.icon, marginBottom: 10 }]}>{t('vehicleDetails.trustChecklist')}</ThemedText>
                  <View style={styles.checklist}>
                    <View style={styles.checklistItem}>
                      <IconSymbol name={vehicle.verificationChecklist.identityVerified ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={16} color={vehicle.verificationChecklist.identityVerified ? colors.primary : colors.icon} />
                      <ThemedText style={styles.checklistText}>{t('vehicleDetails.checklistIdVerified')}</ThemedText>
                    </View>
                    <View style={styles.checklistItem}>
                      <IconSymbol name={vehicle.verificationChecklist.ownershipDocsVerified ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={16} color={vehicle.verificationChecklist.ownershipDocsVerified ? colors.primary : colors.icon} />
                      <ThemedText style={styles.checklistText}>{t('vehicleDetails.checklistOwnershipDocs')}</ThemedText>
                    </View>
                    <View style={styles.checklistItem}>
                      <IconSymbol name={vehicle.verificationChecklist.phoneVerified ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={16} color={vehicle.verificationChecklist.phoneVerified ? colors.primary : colors.icon} />
                      <ThemedText style={styles.checklistText}>{t('vehicleDetails.checklistPhoneVerified')}</ThemedText>
                    </View>
                    <View style={styles.checklistItem}>
                      <IconSymbol name={vehicle.verificationChecklist.locationVerified ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={16} color={vehicle.verificationChecklist.locationVerified ? colors.primary : colors.icon} />
                      <ThemedText style={styles.checklistText}>{t('vehicleDetails.checklistLocationVerified')}</ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowValidityModal(false)}>
              <ThemedText style={styles.modalCloseButtonText}>{t('vehicleDetails.close')}</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Guest Purchase Modal */}
      <GuestPurchaseModal
        visible={showGuestPurchaseModal}
        onClose={() => {
          setShowGuestPurchaseModal(false);
          // Optionally refresh the page or show a success message
        }}
        vehicleId={vehicle.id}
        vehicleTitle={vehicle.title}
      />

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`https://inzira.co/vehicle/${vehicle.id || id}`}
        title={vehicle.title}
      />

      {!!toast && (
        <Toast
          visible={!!toast}
          title={toast.title}
          body={toast.body}
          icon={toast.icon}
          onHide={() => setToast(null)}
        />
      )}

    </View>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SpecItem({
  label,
  value,
  colors,
  isDesktopWeb,
  renderColorBadge = false,
}: {
  label: string;
  value: string;
  colors: { border: string; background: string; text: string; icon: string };
  isDesktopWeb: boolean;
  renderColorBadge?: boolean;
}) {
  const colorHex = renderColorBadge ? getVehicleColorHex(value) : null;
  const colorText = colorHex ? getReadableTextColor(colorHex) : '#111827';

  return (
    <View
      style={[
        styles.specItem,
        isDesktopWeb && styles.webSpecItem,
        { borderColor: colors.border, backgroundColor: colors.background },
      ]}>
      <ThemedText style={[styles.specLabel, { color: colors.icon }]}>{label}</ThemedText>
      {renderColorBadge && colorHex ? (
        <View style={[styles.colorBadge, { backgroundColor: colorHex }]}>
          <ThemedText style={[styles.colorBadgeText, { color: colorText }]} numberOfLines={1}>{value}</ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.specValue, { color: colors.text }]} numberOfLines={2}>{value}</ThemedText>
      )}
    </View>
  );
}

function getVehicleColorHex(colorName: string): string | null {
  if (!colorName || colorName === 'N/A') return null;
  const map: Record<string, string> = {
    'pearl white': '#F5F5F4', white: '#FFFFFF', silver: '#C0C0C0', black: '#111111',
    red: '#DC2626', blue: '#2563EB', gray: '#6B7280', green: '#16A34A',
    yellow: '#EAB308', orange: '#F97316', brown: '#8B5E3C', gold: '#D4AF37',
    beige: '#D6C6A8', navy: '#1E3A8A', purple: '#7C3AED',
  };
  return map[colorName.trim().toLowerCase()] ?? null;
}

function getReadableTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#111827';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    width: 32,
    alignItems: 'center',
  },

  // ── Desktop two-column hero ──────────────────────────────────────────────────
  desktopHeroRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 24,
    alignItems: 'flex-start',
  },
  desktopHeroImageWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    // Fixed aspect ratio via minHeight; flex handles width
    minHeight: 380,
  },
  desktopHeroImage: {
    width: '100%',
    height: '100%',
    minHeight: 380,
  },
  desktopHeroInfoWrapper: {
    width: 320,
    flexShrink: 0,
    paddingTop: 4,
  },

  // ── Mobile original hero ─────────────────────────────────────────────────────
  heroContainer: {
    position: 'relative',
    overflow: 'hidden',
    height: 400,
  },
  heroImage: {
    width: '100%',
    height: 400,
  },

  // ── Shared hero overlays ─────────────────────────────────────────────────────
  heroActions: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageColorBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderTopRightRadius: 14,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '82%',
  },
  imageColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  imageColorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },

  // ── Content area ─────────────────────────────────────────────────────────────
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  webContentContainer: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  usageBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  usageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 6,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  carsLeftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  carsLeftChipText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  specGrid: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
    ...Elevation.flat,
  },
  webSpecGrid: {
    gap: 12,
  },
  specItem: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 72,
    justifyContent: 'center',
    ...Elevation.flat,
  },
  webSpecItem: {
    width: '31.8%',
    minHeight: 78,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  colorBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  colorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 17,
  },
  galleryRow: {
    gap: 10,
    paddingRight: 10,
  },
  galleryImage: {
    width: 180,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  sellerCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 12,
    ...Elevation.card,
  },
  sellerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  tierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  favButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  secondaryButton: {
      flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderRadius: 999,
    
  },
  requestContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
  },
  requestContactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  checkValidityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  assuranceContactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  assuranceContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  assuranceContactBtnText: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  checkValidityButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  skeletonTitle: {
    height: 30,
    width: '76%',
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 15,
  },
  skeletonBadge: {
    height: 24,
    width: 110,
    borderRadius: 999,
    marginBottom: 14,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    marginBottom: 10,
  },
  skeletonSpecValue: {
    height: 16,
    width: '72%',
    borderRadius: 6,
  },
  skeletonSectionTitle: {
    height: 20,
    width: 130,
    borderRadius: 6,
    marginBottom: 10,
  },
  skeletonGalleryItem: {
    width: 180,
    height: 120,
    borderRadius: 10,
  },
  skeletonButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
  },

  // ── Toast ────────────────────────────────────────────────────────────────────
  toastOverlay: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 999,
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
    ...Elevation.raised,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'center',
  },
  verificationScore: {
    fontSize: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 13,
  },
  checklistContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,

    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  checklistText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Image Viewer ────────────────────────────────────────────────────────────
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    position: 'relative',
  },
  imageViewerContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  imageViewerCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageViewerMainArea: {
    flex: 1,
    width: '100%',
    // column (default) so flex:1 on the image grows height, not width.
    // Nav buttons are absolutely positioned so they don't need row layout.
    // Padding applied per-platform inline in JSX.
  },
  imageViewerNavButton: {
    position: 'absolute',
    top: '50%',        // vertically center the arrows over the car image
    marginTop: -25,    // half the button height (50)
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerNavButtonLeft: {
    left: 10,
  },
  imageViewerNavButtonRight: {
    right: 10,
  },
  imageViewerImage: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    height: '100%',
  },
  imageViewerCaption: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  imageViewerThumbnailStrip: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 80,
    paddingVertical: 10,
    width:"100%"
  },
  imageViewerThumbnailContent: {
    paddingHorizontal: 20,
    gap: 8,
    justifyContent: 'center',
    alignContent:"center",


  },
  imageViewerThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  imageViewerThumbnailActive: {
    borderColor: '#fff',
    opacity: 1,
  },
  imageViewerThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerZoomHint: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  imageViewerZoomHintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});