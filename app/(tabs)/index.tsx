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
import { useCallback, useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import {
  fetchFeaturedVehicles,
  fetchRecentVehicles,
  fetchBrandsWithImages,
} from "@/lib/api-vehicles";
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
import { fetchUnreadMessagesCount } from "@/lib/api-messages";
import { fetchUnreadNotificationsCount } from "@/lib/api-notifications";
import type { Vehicle } from "@/types/vehicle";
import {
  CURRENCIES,
  getCurrencyPreference,
  setCurrencyPreference,
  initCurrencyPreference,
} from "@/lib/currencyPreference";
import { displayPrice } from "@/lib/currencyConverter";
import {
  getAuthToken,
  getAuthUser,
  setAuthSession,
  type AuthUser,
} from "@/lib/userPreference";
import { apiRequest } from "@/lib/api-client";
import * as Location from "expo-location";
import { ThemeSelector } from "@/components/theme-selector";
import { HeroSection } from "@/components/hero-section";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { resolveImageUrl } from "@/lib/image-url";
import { LocalBusinessStructuredData } from "@/components/seo-head";
import { HomeSEO } from "@/components/page-head";
import { createPortal } from "react-dom";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Themman from "@/lib/Notification/Allowno";

// Car brand logos with transparent backgrounds - using carlogos.org
const BRAND_LOGOS: Record<string, string> = {
  // ✅ Confirmed working by user
  Toyota: "https://www.carlogos.org/logo/Toyota-logo-1989-2560x1440.png",
  Honda: "https://www.carlogos.org/car-logos/honda-logo-2000-full-download.png",

  // Brandfetch CDN
  "Mercedes-Benz": "https://cdn.brandfetch.io/mercedes-benz.com/w/400/h/400/logo.png",
  Mercedes: "https://cdn.brandfetch.io/mercedes-benz.com/w/400/h/400/logo.png",
  BMW: "https://cdn.brandfetch.io/bmw.com/w/400/h/400/logo.png",
  Audi: "https://cdn.brandfetch.io/audi.com/w/400/h/400/logo.png",
  Nissan: "https://cdn.brandfetch.io/nissan.com/w/400/h/400/logo.png",
  Ford: "https://cdn.brandfetch.io/ford.com/w/400/h/400/logo.png",
  Volkswagen: "https://cdn.brandfetch.io/volkswagen.com/w/400/h/400/logo.png",
  Hyundai: "https://cdn.brandfetch.io/hyundai.com/w/400/h/400/logo.png",
  Kia: "https://cdn.brandfetch.io/kia.com/w/400/h/400/logo.png",
  Chevrolet: "https://cdn.brandfetch.io/chevrolet.com/w/400/h/400/logo.png",
  Mazda: "https://cdn.brandfetch.io/mazda.com/w/400/h/400/logo.png",
  Subaru: "https://cdn.brandfetch.io/subaru.com/w/400/h/400/logo.png",
  Lexus: "https://cdn.brandfetch.io/lexus.com/w/400/h/400/logo.png",
  Jeep: "https://cdn.brandfetch.io/jeep.com/w/400/h/400/logo.png",
  "Land Rover": "https://cdn.brandfetch.io/landrover.com/w/400/h/400/logo.png",
  Porsche: "https://cdn.brandfetch.io/porsche.com/w/400/h/400/logo.png",
  Volvo: "https://cdn.brandfetch.io/volvocars.com/w/400/h/400/logo.png",
  Tesla: "https://cdn.brandfetch.io/tesla.com/w/400/h/400/logo.png",
  Mitsubishi: "https://cdn.brandfetch.io/mitsubishi.com/w/400/h/400/logo.png",
  Peugeot: "https://cdn.brandfetch.io/peugeot.com/w/400/h/400/logo.png",
  Renault: "https://cdn.brandfetch.io/renault.com/w/400/h/400/logo.png",
  Suzuki: "https://cdn.brandfetch.io/suzuki.com/w/400/h/400/logo.png",
  Isuzu: "https://cdn.brandfetch.io/isuzu.com/w/400/h/400/logo.png",
  Fiat: "https://cdn.brandfetch.io/fiat.com/w/400/h/400/logo.png",
  Jaguar: "https://cdn.brandfetch.io/jaguar.com/w/400/h/400/logo.png",
  "Range Rover": "https://cdn.brandfetch.io/landrover.com/w/400/h/400/logo.png",
  Acura: "https://cdn.brandfetch.io/acura.com/w/400/h/400/logo.png",
  Infiniti: "https://cdn.brandfetch.io/infiniti.com/w/400/h/400/logo.png",
  Cadillac: "https://cdn.brandfetch.io/cadillac.com/w/400/h/400/logo.png",
  Dodge: "https://cdn.brandfetch.io/dodge.com/w/400/h/400/logo.png",
  RAM: "https://cdn.brandfetch.io/ramtrucks.com/w/400/h/400/logo.png",
  GMC: "https://cdn.brandfetch.io/gmc.com/w/400/h/400/logo.png",
  "Aston Martin": "https://cdn.brandfetch.io/astonmartin.com/w/400/h/400/logo.png",
};
export default function HomeScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = "Inzira - Rwanda's #1 Verified Car Marketplace";
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === "dark";
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const skeletonBase = theme === "dark" ? "#1F2937" : "#E5E7EB";
  const skeletonSoft = theme === "dark" ? "#111827" : "#F3F4F6";

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileDropdownPos, setProfileDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const profileTriggerRef = useRef<View>(null);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(() =>
    getCurrencyPreference(),
  );
  const [currentLocationLabel, setCurrentLocationLabel] = useState(
    "Detecting location...",
  );
  const [showLoginToast, setShowLoginToast] = useState(false);
  const loginRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loginToastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hasSyncedLocationRef = useRef(false);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [brands, setBrands] = useState<
    Array<{ name: string; image: string | null; count: number }>
  >([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredScrollX, setFeaturedScrollX] = useState(0);
  const featuredScrollRef = useRef<ScrollView>(null);
  const [brandsScrollX, setBrandsScrollX] = useState(0);
  const brandsScrollRef = useRef<ScrollView>(null);
  const errorColor = isDark ? "#FCA5A5" : "#DC2626"; // Professional red shades
  const hasFeaturedVehicles = featuredVehicles.length > 0;
  const hasRecentVehicles = recentVehicles.length > 0;

  const isFavorited = (id: string) => favoriteIds.includes(id);

  const syncDetectedLocation = useCallback(
    async (nextLocation: string) => {
      // Prevent multiple syncs
      if (hasSyncedLocationRef.current) {
        console.log("[home] syncDetectedLocation skipped: already synced");
        return;
      }

      console.log("[home] syncDetectedLocation start", { nextLocation });
      const sessionUser = authUser ?? (await getAuthUser());
      if (!sessionUser) {
        console.log(
          "[home] syncDetectedLocation skipped: no logged-in session user",
        );
        return;
      }

      try {
        hasSyncedLocationRef.current = true; // Mark as synced before API call
        const response = await apiRequest<{
          status: number;
          data: { profile: { location: string } };
        }>("/profile/me/location", {
          method: "PATCH",
          auth: true,
          body: { location: nextLocation },
        });
        console.log(
          "[home] syncDetectedLocation success",
          response?.data?.profile,
        );

        const token = await getAuthToken();
        const updatedLocation =
          response?.data?.profile?.location ?? nextLocation;
        const updatedUser = { ...sessionUser, location: updatedLocation };
        await setAuthSession(token!, updatedUser);
        console.log("[home] auth session updated with location", {
          updatedLocation,
        });
      } catch (err) {
        hasSyncedLocationRef.current = false; // Reset on error so it can retry
        console.error("[home] syncDetectedLocation failed", err);
      }
    },
    [authUser],
  );

  const resolveDeviceLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        console.log("[home] location permission not granted");
        setCurrentLocationLabel("Location permission denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const place = places?.[0];
      if (!place) {
        setCurrentLocationLabel("Location unavailable");
        return;
      }

      const city = place.city || place.subregion || place.region;
      const country = place.country;
      let nextLocation: string | null = null;
      if (city && country) {
        nextLocation = `${city}, ${country}`;
      } else if (country) {
        nextLocation = country;
      }

      if (nextLocation) {
        console.log("[home] resolved location", { nextLocation });
        setCurrentLocationLabel(nextLocation);
        await syncDetectedLocation(nextLocation);
      } else {
        console.log("[home] no usable location from reverse geocode");
        setCurrentLocationLabel("Location unavailable");
      }
    } catch (err) {
      console.error("[home] resolveDeviceLocation failed", err);
      setCurrentLocationLabel("Location unavailable");
    }
  }, [syncDetectedLocation]);

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
    if (user) {
      if (!authUser) {
        setAuthUser(user);
      }
      return true;
    }

    setAuthUser(null);
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

  // Initialize currency preference on mount
  useEffect(() => {
    initCurrencyPreference();
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const [featuredRes, recentRes, favoritesRes, categoriesRes, brandsRes] =
        await Promise.all([
          fetchFeaturedVehicles(10),
          fetchRecentVehicles(4),
          fetchFavorites().catch(() => ({ data: { favorites: [] } })),
          fetchCategories().catch(() => ({ data: { categories: [] } })),
          fetchBrandsWithImages().catch(() => ({ data: { brands: [] } })),
        ]);
      // Fetch auth user and subscription
      const user = await getAuthUser();
      let subActive = false;
      if (user) {
        try {
          const subRes = await fetchMySubscription();
          subActive = checkActiveSub(subRes.data?.subscription);
        } catch {
          // No subscription or not logged in
        }
      }
      setFeaturedVehicles(featuredRes.data.vehicles || []);
      setRecentVehicles(recentRes.data.vehicles || []);
      setBrands(brandsRes.data.brands || []);
      setFavoriteIds(
        favoritesRes.data.favorites.map((f: any) => f.vehicleId) || [],
      );
      setCategories(categoriesRes.data.categories || []);
      setAuthUser(user);
      setHasActiveSub(subActive);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh home listings",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [featuredRes, recentRes, favoritesRes, categoriesRes, brandsRes] =
          await Promise.all([
            fetchFeaturedVehicles(10),
            fetchRecentVehicles(4),
            fetchFavorites().catch(() => ({ data: { favorites: [] } })),
            fetchCategories().catch(() => ({ data: { categories: [] } })),
            fetchBrandsWithImages().catch(() => ({ data: { brands: [] } })),
          ]);
        // Fetch auth user and subscription
        const user = await getAuthUser();
        let subActive = false;
        if (user) {
          try {
            const subRes = await fetchMySubscription();
            subActive = checkActiveSub(subRes.data?.subscription);
          } catch {
            // No subscription or not logged in
          }
        }
        if (mounted) {
          setFeaturedVehicles(featuredRes.data.vehicles || []);
          setRecentVehicles(recentRes.data.vehicles || []);
          setBrands(brandsRes.data.brands || []);
          setFavoriteIds(
            favoritesRes.data.favorites.map((f: any) => f.vehicleId) || [],
          );
          setCategories(categoriesRes.data.categories || []);
          setAuthUser(user);
          setHasActiveSub(subActive);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load home listings",
          );
        }
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
    // Only resolve location once on mount, not repeatedly
    if (!hasSyncedLocationRef.current) {
      resolveDeviceLocation();
    }
  }, []); // Empty deps - only run once on mount

  // Removed useFocusEffect for location - only sync on first mount, not every focus

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refetchCategories = async () => {
        try {
          const categoriesRes = await fetchCategories().catch(
            () => ({ data: { categories: [] } }) as any,
          );
          if (!cancelled) {
            setCategories(categoriesRes.data.categories || []);
          }
        } catch (err) {
          // ignore periodic refresh errors
        }
      };

      // Run immediately when screen is focused
      refetchCategories();

      // And then poll while focused
      const intervalId = setInterval(refetchCategories, 4000);

      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refetchUnreadCounts = async () => {
        try {
          const user = await getAuthUser();
          if (!user) {
            if (!cancelled) {
              setUnreadMessagesCount(0);
              setUnreadNotificationsCount(0);
            }
            return;
          }

          const [messagesRes, notificationsRes] = await Promise.all([
            fetchUnreadMessagesCount().catch(
              () => ({ data: { unreadCount: 0 } }) as any,
            ),
            fetchUnreadNotificationsCount().catch(
              () => ({ data: { unreadCount: 0 } }) as any,
            ),
          ]);

          if (!cancelled) {
            setUnreadMessagesCount(Number(messagesRes.data?.unreadCount || 0));
            setUnreadNotificationsCount(
              Number(notificationsRes.data?.unreadCount || 0),
            );
          }
        } catch {
          if (!cancelled) {
            setUnreadMessagesCount(0);
            setUnreadNotificationsCount(0);
          }
        }
      };

      refetchUnreadCounts();
      const intervalId = setInterval(refetchUnreadCounts, 4000);

      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, []),
  );

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

  const insets = useSafeAreaInsets();
  const goToVehicle = (id: string) => {
    const href = `/vehicle/${id}` as any;
    router.push(href);
  };

  const goToCategory = (slug: string) => {
    const href = `/category/${slug}` as any;
    router.push(href);
  };

  const goToSearch = () => {
    const q = searchQuery.trim();
    const href =
      q.length > 0
        ? (`/search?q=${encodeURIComponent(q)}` as any)
        : ("/search" as any);
    router.push(href);
  };

  const handleGoSupport = () => {
    setShowLocationSheet(false);
    router.push("/contact");
  };

  const handleLogout = () => {
    setShowLocationSheet(false);
    setShowProfileMenu(false);
    logout();
  };

  const renderEmptyState = (containerStyle?: object) => (
    <View style={[styles.emptyStateCard, containerStyle]}>
      <View
        style={[
          styles.emptyStateIconWrap,
          { backgroundColor: isDark ? "#1F2937" : "#EEF2FF" },
        ]}
      >
        <IconSymbol name="car.rear.fill" size={34} color={colors.primary} />
      </View>
      <ThemedText style={styles.emptyStateTitle}>
        No cars uploaded yet
      </ThemedText>
      <ThemedText style={[styles.emptyStateSubtitle, { color: colors.icon }]}>
        Come back again
      </ThemedText>
    </View>
  );

  const renderCategorySkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[
        styles.categoriesScroll,
        isDesktopWeb &&
          (is2Xl
            ? styles.webCategoriesScroll2Xl
            : isXl
              ? styles.webCategoriesScrollXl
              : isLg
                ? styles.webCategoriesScrollLg
                : styles.webCategoriesScrollMd),
      ]}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`cat-skeleton-${index}`} style={styles.categoryItem}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: skeletonSoft, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.skeletonCircle, { backgroundColor: skeletonBase }]}
            />
          </View>
          <View
            style={[
              styles.skeletonCategoryText,
              { backgroundColor: skeletonBase },
            ]}
          />
        </View>
      ))}
    </ScrollView>
  );

  const renderFeaturedSkeleton = () => (
    <View
      style={[
        styles.featuredScrollContainer,
        isDesktopWeb &&
          (is2Xl
            ? styles.webFeaturedScrollContainer2Xl
            : isXl
              ? styles.webFeaturedScrollContainerXl
              : isLg
                ? styles.webFeaturedScrollContainerLg
                : styles.webFeaturedScrollContainerMd),
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.featuredScroll,
          isDesktopWeb &&
            (is2Xl
              ? styles.webFeaturedScroll2Xl
              : isXl
                ? styles.webFeaturedScrollXl
                : isLg
                  ? styles.webFeaturedScrollLg
                  : styles.webFeaturedScrollMd),
        ]}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`featured-skeleton-${index}`}
            style={[
              styles.vehicleCard,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.skeletonFeaturedImage,
                { backgroundColor: skeletonSoft },
              ]}
            />
            <View style={styles.vehicleInfo}>
              <View
                style={[
                  styles.skeletonLine,
                  { width: "82%", backgroundColor: skeletonBase },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  {
                    width: "56%",
                    marginBottom: 0,
                    backgroundColor: skeletonBase,
                  },
                ]}
              />
          </View>
        </View>
      ))}
    </ScrollView>
    </View>
  );

  const renderLatestSkeleton = () => (
    <View
      style={[
        styles.latestListings,
        isDesktopWeb &&
          (is2Xl
            ? styles.webLatestListings2Xl
            : isXl
              ? styles.webLatestListingsXl
              : isLg
                ? styles.webLatestListingsLg
                : styles.webLatestListingsMd),
      ]}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={`latest-skeleton-${index}`}
          style={[
            styles.latestCard,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.skeletonLatestImage,
              { backgroundColor: skeletonSoft },
            ]}
          />
          <View style={styles.latestInfo}>
            <View style={styles.latestHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View
                  style={[
                    styles.skeletonLine,
                    { width: "90%", backgroundColor: skeletonBase },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    {
                      width: "70%",
                      marginBottom: 0,
                      backgroundColor: skeletonBase,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.skeletonIconDot,
                  { backgroundColor: skeletonBase },
                ]}
              />
            </View>
            <View style={styles.latestMetaContainer}>
              <View
                style={[
                  styles.skeletonLine,
                  { width: "40%", height: 10, backgroundColor: skeletonBase },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  { width: "54%", height: 12, backgroundColor: skeletonBase },
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
      {/* SEO */}
      <HomeSEO />
      <Themman />
      {isWeb && <LocalBusinessStructuredData />}

      {/* Mobile Header - Hidden on Web Desktop */}
      {!isDesktopWeb && (
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, zIndex: 10 },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  color: colors.icon,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                {t("home.location")}
              </ThemedText>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                onPress={() => setShowLocationSheet(true)}
              >
                <IconSymbol
                  name="house.geo"
                  size={16}
                  color={colors.text}
                  style={{ marginRight: 6 }}
                />
                <ThemedText
                  style={{ fontSize: 18, width:70}}
                  numberOfLines={1}

                  ellipsizeMode="tail"
                >
                  {currentLocationLabel}
                </ThemedText>
                <ThemedText
                  style={{
                    color: colors.primary,
                    marginLeft: 8,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {selectedCurrency}
                </ThemedText>
                <IconSymbol
                  name="chevron.down"
                  size={16}
                  color={colors.text}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push("/notifications")}
              >
                <IconSymbol name="bell.fill" size={20} color={colors.text} />
                {!!authUser && unreadNotificationsCount > 0 && (
                  <View
                    style={[
                      styles.notificationBadge,
                      { backgroundColor: errorColor },
                    ]}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push("/messages")}
              >
                <IconSymbol name="message.fill" size={20} color={colors.text} />
                {!!authUser && unreadMessagesCount > 0 && (
                  <View
                    style={[
                      styles.notificationBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>

              <View ref={profileTriggerRef} style={{ position: "relative" }}>
                <TouchableOpacity
                  onPress={() => {
                    // Calculate position for portal dropdown on web
                    if (isWeb && profileTriggerRef.current) {
                      const el =
                        profileTriggerRef.current as unknown as HTMLElement;
                      if (el && el.getBoundingClientRect) {
                        const rect = el.getBoundingClientRect();
                        setProfileDropdownPos({
                          top: rect.bottom + window.scrollY + 8,
                          left: rect.left + window.scrollX - 156, // Align right edge
                        });
                      }
                    }
                    setShowProfileMenu(!showProfileMenu);
                  }}
                >
                  {authUser?.profileImage ? (
                    <Image
                      source={{ uri: authUser.profileImage }}
                      style={[
                        styles.profileAvatar,
                        { borderColor: colors.primary },
                      ]}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.profileAvatar,
                        {
                          backgroundColor: colors.primary,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 22,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: "700",
                        }}
                      >
                        {(authUser?.fullName || "U")[0].toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

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
                placeholder={t("home.searchPlaceholder")}
                placeholderTextColor={colors.icon}
                value={searchQuery}
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
            <View
              style={[styles.searchDivider, { backgroundColor: colors.border }]}
            />
            <TouchableOpacity style={styles.filterBtn} onPress={goToSearch}>
              <IconSymbol
                name="chevron.right"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(20, insets.bottom) },
          isDesktopWeb && styles.webScrollContent,
        ]}
      >
        {/* Hero Section with Mega Search - Web Only */}
        {isDesktopWeb && <HeroSection categories={categories} />}

        {/* Browse by Category - Mobile */}
        {!isDesktopWeb && categories.length > 0 && (
          <View style={[styles.browseSection, { borderBottomColor: colors.border }]}>
            <ThemedText style={[styles.browseLabel, { color: colors.icon }]}>
              Browse by category
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.browseChips}
            >
              {categories.slice(0, 8).map((cat, index) => {
                const colorPalette = [
                  { bg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.12)', icon: '#16A34A' },
                  { bg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)', icon: '#2563EB' },
                  { bg: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)', icon: '#9333EA' },
                  { bg: isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.12)', icon: '#DB2777' },
                  { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)', icon: '#D97706' },
                  { bg: isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.12)', icon: '#0D9488' },
                  { bg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)', icon: '#4F46E5' },
                  { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)', icon: '#DC2626' },
                ];
                const catColors = colorPalette[index % colorPalette.length];

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.browseChip,
                      { borderColor: colors.border, backgroundColor: colors.card },
                    ]}
                    onPress={() => router.push(`/category/${cat.slug}` as any)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.browseChipIcon,
                        { backgroundColor: catColors.bg },
                      ]}
                    >
                      <IconSymbol
                        name={(cat.icon || "car.fill") as any}
                        size={18}
                        color={catColors.icon}
                      />
                    </View>
                    <ThemedText style={[styles.browseChipText, { color: colors.text }]}>
                      {cat.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Featured Vehicles */}
        <View style={[styles.section, isDesktopWeb && styles.webSection]}>
          <View
            style={[
              styles.sectionHeader,
              isDesktopWeb &&
                (is2Xl
                  ? styles.webSectionHeader2Xl
                  : isXl
                    ? styles.webSectionHeaderXl
                    : isLg
                      ? styles.webSectionHeaderLg
                      : styles.webSectionHeaderMd),
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              {t("home.featuredListings")}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={() => router.push("/explore")}>
                <ThemedText
                  style={{
                    color: colors.primary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {t("home.viewAll")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                  style={{flexDirection:"row", justifyContent:"center", alignItems:"center", gap:5}}
              onPress={handleRefresh} disabled={isRefreshing}>
                <IconSymbol
                  name="arrow.clockwise"
                  size={18}
                  color={isRefreshing ? colors.icon : colors.primary}
              
                />
                       <ThemedText
                  style={{
                    color: colors.primary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                 Refresh
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          {isLoading ? (
            renderFeaturedSkeleton()
          ) : error ? (
            <ThemedText
              style={{ padding: 20, textAlign: "center", color: errorColor }}
            >
              {error}
            </ThemedText>
          ) : !hasFeaturedVehicles ? (
            renderEmptyState(
              isDesktopWeb
                ? is2Xl
                  ? styles.webFeaturedEmptyState2Xl
                  : isXl
                    ? styles.webFeaturedEmptyStateXl
                    : isLg
                      ? styles.webFeaturedEmptyStateLg
                      : styles.webFeaturedEmptyStateMd
                : styles.featuredEmptyState,
            )
          ) : (
            <View
              style={[
                styles.featuredScrollContainer,
                isDesktopWeb &&
                  (is2Xl
                    ? styles.webFeaturedScrollContainer2Xl
                    : isXl
                      ? styles.webFeaturedScrollContainerXl
                      : isLg
                        ? styles.webFeaturedScrollContainerLg
                        : styles.webFeaturedScrollContainerMd),
              ]}
            >
              <View style={{ position: "relative" }}>
                <ScrollView
                  ref={featuredScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => setFeaturedScrollX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  style={[
                    styles.featuredScroll,
                    isDesktopWeb &&
                      (is2Xl
                        ? styles.webFeaturedScroll2Xl
                        : isXl
                          ? styles.webFeaturedScrollXl
                          : isLg
                            ? styles.webFeaturedScrollLg
                            : styles.webFeaturedScrollMd),
                  ]}
                >
                  {featuredVehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[
                        styles.vehicleCard,
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
                          style={styles.vehicleImage}
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
                      <View style={styles.vehicleInfo}>
                        <View
                          style={{ flexDirection: "row", alignItems: "flex-start", gap: 4 }}
                        >
                          <ThemedText style={styles.vehicleTitle} numberOfLines={1}>
                            {vehicle.title}
                          </ThemedText>
                          {(vehicle.verificationStatus === "approved" ||
                            vehicle.sellerTier === "trusted" ||
                            vehicle.sellerTier === "dealer_pro") && (
                            <View
                              style={{
                                marginTop: 2,
                                backgroundColor: "#3B82F6",
                                borderRadius: 7,
                                width: 13,
                                height: 13,
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <IconSymbol name="checkmark" size={9} color="#fff" />
                            </View>
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.vehicleUsageStatus,
                            { color: colors.primary },
                          ]}
                        >
                          {vehicle.usageStatus || "New"}
                        </ThemedText>
                        <ThemedText
                          style={[styles.vehiclePrice, { color: colors.text }]}
                        >
                          {displayPrice(vehicle.price, selectedCurrency)}
                        </ThemedText>
                        <View style={styles.vehicleSpecs}>
                          <View style={styles.specItem}>
                            <ThemedText
                              style={[styles.specText, { color: colors.icon }]}
                            >
                              {vehicle.year || "N/A"}
                            </ThemedText>
                          </View>
                          <View style={styles.specItem}>
                            <ThemedText
                              style={[styles.specText, { color: colors.icon }]}
                            >
                              {vehicle.mileage || "N/A"}
                            </ThemedText>
                          </View>
                          <View style={styles.specItem}>
                            <ThemedText
                              style={[styles.specText, { color: colors.icon }]}
                            >
                              {vehicle.vehicleType || "Car"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {isDesktopWeb && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.scrollNavButton,
                        styles.scrollNavButtonLeft,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: featuredScrollX > 10 ? 1 : 0,
                        },
                      ]}
                      onPress={() => featuredScrollRef.current?.scrollTo({ x: Math.max(0, featuredScrollX - 300), animated: true })}
                      disabled={featuredScrollX <= 10}
                    >
                      <IconSymbol name="chevron.left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.scrollNavButton,
                        styles.scrollNavButtonRight,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => featuredScrollRef.current?.scrollTo({ x: featuredScrollX + 300, animated: true })}
                    >
                      <IconSymbol name="chevron.right" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Promotional Banner */}
        <TouchableOpacity
          style={[
            styles.promoBanner,
            isDesktopWeb &&
              (is2Xl
                ? styles.webPromoBanner2Xl
                : isXl
                  ? styles.webPromoBannerXl
                  : isLg
                    ? styles.webPromoBannerLg
                    : styles.webPromoBannerMd),
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(59, 130, 246, 0.08)",
            },
          ]}
          onPress={() => router.push("/contact" as any)}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.promoIconContainer,
              { backgroundColor: colors.primary },
            ]}
          >
            <IconSymbol name="sparkles" size={24} color="#fff" />
          </View>
          <View style={styles.promoContent}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.promoTitle, { color: colors.text }]}
            >
              {t("home.customOrderTitle") || "Order Your Custom Car"}
            </ThemedText>
            <ThemedText style={[styles.promoSubtitle, { color: colors.icon }]}>
              {t("home.customOrderSubtitle") ||
                "Get exclusive deals + personalized offers tailored for you"}
            </ThemedText>
          </View>
          <View
            style={[
              styles.promoArrow,
              { backgroundColor: `${colors.primary}20` },
            ]}
          >
            <IconSymbol name="arrow.right" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Latest */}
        <View style={[styles.section, isDesktopWeb && styles.webSection]}>
          <View
            style={[
              styles.sectionHeader,
              isDesktopWeb &&
                (is2Xl
                  ? styles.webSectionHeader2Xl
                  : isXl
                    ? styles.webSectionHeaderXl
                    : isLg
                      ? styles.webSectionHeaderLg
                      : styles.webSectionHeaderMd),
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              {t("home.recentlyAdded")}
            </ThemedText>
          </View>
          {isLoading ? (
            renderLatestSkeleton()
          ) : error ? (
            <ThemedText
              style={{ padding: 20, textAlign: "center", color: errorColor }}
            >
              {error}
            </ThemedText>
          ) : !hasRecentVehicles ? (
            renderEmptyState(
              isDesktopWeb
                ? is2Xl
                  ? styles.webLatestEmptyState2Xl
                  : isXl
                    ? styles.webLatestEmptyStateXl
                    : isLg
                      ? styles.webLatestEmptyStateLg
                      : styles.webLatestEmptyStateMd
                : styles.latestEmptyState,
            )
          ) : (
            <View
              style={[
                styles.latestListings,
                isDesktopWeb &&
                  (is2Xl
                    ? styles.webLatestListings2Xl
                    : isXl
                      ? styles.webLatestListingsXl
                      : isLg
                        ? styles.webLatestListingsLg
                        : styles.webLatestListingsMd),
              ]}
            >
              {recentVehicles.slice(0, 4).map((vehicle) => (
                <TouchableOpacity
                  key={`latest-${vehicle.id}`}
                  style={[
                    styles.latestCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => goToVehicle(vehicle.id)}
                >
                  <Image
                    source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
                    style={styles.latestImage}
                    contentFit="cover"
                  />
                  <View style={styles.latestInfo}>
                    <View style={styles.latestHeaderRow}>
                      <ThemedText style={styles.latestTitle} numberOfLines={2}>
                        {vehicle.title}
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 6,
                        }}
                      >
                        {(vehicle.verificationStatus === "approved" ||
                          vehicle.sellerTier === "trusted" ||
                          vehicle.sellerTier === "dealer_pro") && (
                          <View
                            style={{
                              marginTop: 2,
                              backgroundColor: "#3B82F6",
                              borderRadius: 7,
                              width: 13,
                              height: 13,
                              justifyContent: "center",
                              alignItems: "center",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            <IconSymbol
                              name="checkmark"
                              size={9}
                              color="#fff"
                            />
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleToggleFavorite(vehicle.id)}
                        >
                          <IconSymbol
                            name="heart.fill"
                            size={18}
                            color={
                              isFavorited(vehicle.id) ? "#EF4444" : colors.icon
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.latestMetaContainer}>
                      <ThemedText
                        style={[
                          styles.latestUsageStatus,
                          { color: colors.primary },
                        ]}
                      >
                        {vehicle.usageStatus}
                      </ThemedText>
                      {hasActiveSub && (
                        <ThemedText
                          style={[
                            styles.latestSeller,
                            { color: colors.icon, marginTop: 4 },
                          ]}
                          numberOfLines={1}
                        >
                          {vehicle.sellerName || "Unknown Seller"}
                        </ThemedText>
                      )}
                      <ThemedText
                        style={[styles.latestPrice, { color: colors.text }]}
                      >
                        {displayPrice(Number(vehicle.price) || 0)}
                      </ThemedText>
                      <View style={styles.latestSpecsRow}>
                        <ThemedText
                          style={[
                            styles.latestSpecText,
                            { color: colors.icon },
                          ]}
                        >
                          {vehicle.mileage}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.latestSpecText,
                            { color: colors.icon },
                          ]}
                        >
                          {" "}
                          •{" "}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.latestSpecText,
                            { color: colors.icon },
                          ]}
                        >
                          {vehicle.vehicleType}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Get your car by brand */}
        {brands.length > 0 && (
          <View
            style={[
              styles.section,
              isDesktopWeb && styles.webSection,
              { marginTop: 40 },
            ]}
          >
            <View
              style={[
                styles.sectionHeader,
                isDesktopWeb &&
                  (is2Xl
                    ? styles.webSectionHeader2Xl
                    : isXl
                      ? styles.webSectionHeaderXl
                      : isLg
                        ? styles.webSectionHeaderLg
                        : styles.webSectionHeaderMd),
                { justifyContent: "center" },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ fontSize: 20, textAlign: "center" }}>
                Get your car by brand
              </ThemedText>
            </View>
            <View
              style={[
                styles.brandsScrollContainer,
                isDesktopWeb &&
                  (is2Xl
                    ? styles.webBrandsScrollContainer2Xl
                    : isXl
                      ? styles.webBrandsScrollContainerXl
                      : isLg
                        ? styles.webBrandsScrollContainerLg
                        : styles.webBrandsScrollContainerMd),
              ]}
            >
              <View style={{ position: "relative" }}>
                <ScrollView
                  ref={brandsScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => setBrandsScrollX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  contentContainerStyle={[
                    styles.brandsScroll,
                    isDesktopWeb &&
                      (is2Xl
                        ? styles.webBrandsScroll2Xl
                        : isXl
                          ? styles.webBrandsScrollXl
                          : isLg
                            ? styles.webBrandsScrollLg
                            : styles.webBrandsScrollMd),
                  ]}
                >
                  {brands.slice(0, 10).map((brand) => (
                    <TouchableOpacity
                      key={brand.name}
                      style={styles.brandItem}
                      onPress={() =>
                        router.push({
                          pathname: "/explore",
                          params: { brand: brand.name },
                        } as any)
                      }
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.brandImageContainer,
                          {
                            backgroundColor: isDark ? '#E5E7EB' : colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {BRAND_LOGOS[brand.name] ? (
                          <Image
                            source={{ uri: BRAND_LOGOS[brand.name] }}
                            style={styles.brandImage}
                            resizeMode="contain"
                            onError={() => {
                              console.log('Failed to load brand logo:', brand.name, BRAND_LOGOS[brand.name]);
                            }}
                            onLoad={() => {
                              console.log('Successfully loaded brand logo:', brand.name);
                            }}
                          />
                        ) : (
                          <IconSymbol
                            name="car.fill"
                            size={32}
                            color={colors.primary}
                          />
                        )}
                      </View>
                      <ThemedText
                        style={[styles.brandName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {brand.name}
                      </ThemedText>
                      <ThemedText
                        style={[styles.brandCount, { color: colors.icon }]}
                      >
                        {brand.count} cars
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {isDesktopWeb && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.scrollNavButton,
                        styles.scrollNavButtonLeft,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: brandsScrollX > 10 ? 1 : 0,
                        },
                      ]}
                      onPress={() => brandsScrollRef.current?.scrollTo({ x: Math.max(0, brandsScrollX - 300), animated: true })}
                      disabled={brandsScrollX <= 10}
                    >
                      <IconSymbol name="chevron.left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.scrollNavButton,
                        styles.scrollNavButtonRight,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => brandsScrollRef.current?.scrollTo({ x: brandsScrollX + 300, animated: true })}
                    >
                      <IconSymbol name="chevron.right" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        <WebFooter />
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={showLocationSheet}
        onRequestClose={() => setShowLocationSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => {
            setShowLocationSheet(false);
            setShowCurrencyOptions(false);
          }}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom,
              },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
              Location Menu
            </ThemedText>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={handleGoSupport}
            >
              <ThemedText style={styles.sheetItemText}>Support</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={() => setShowCurrencyOptions((prev) => !prev)}
            >
              <View style={styles.currencyRow}>
                <ThemedText style={styles.sheetItemText}>Currency</ThemedText>
                <View style={styles.currencyRowRight}>
                  <ThemedText
                    style={{
                      color: colors.primary,
                      marginRight: 8,
                      fontWeight: "700",
                    }}
                  >
                    {selectedCurrency}
                  </ThemedText>
                  <IconSymbol
                    name={
                      showCurrencyOptions ? "chevron.down" : "chevron.right"
                    }
                    size={18}
                    color={colors.icon}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {showCurrencyOptions && (
              <View
                style={[
                  styles.currencyOptions,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    zIndex: 100,
                    elevation: 10,
                  },
                ]}
              >
                {CURRENCIES.map((currency) => {
                  const isActive = currency === selectedCurrency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      style={[
                        styles.currencyOption,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={async () => {
                        await setCurrencyPreference(currency);
                        setSelectedCurrency(currency);
                        setShowCurrencyOptions(false);
                      }}
                    >
                      <ThemedText
                        style={{
                          color: isActive ? colors.primary : colors.text,
                          fontWeight: isActive ? "700" : "500",
                        }}
                      >
                        {currency}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <ThemeSelector colors={colors} />

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={handleLogout}
            >
              <ThemedText style={[styles.sheetItemText, { color: errorColor }]}>
                Logout
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {isWeb &&
        showProfileMenu &&
        profileDropdownPos &&
        createPortal(
          <>
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "transparent", zIndex: 9999998 },
              ]}
              onPress={() => setShowProfileMenu(false)}
            />
            <View
              style={[
                styles.portalProfileDropdown,
                {
                  top: profileDropdownPos.top,
                  left: profileDropdownPos.left,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.dropdownHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <ThemedText style={styles.dropdownName}>
                  {authUser?.fullName || "User"}
                </ThemedText>
                <ThemedText
                  style={[styles.dropdownType, { color: colors.icon }]}
                >
                  {authUser?.role || "Buyer"}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/order" as any);
                }}
              >
                <IconSymbol
                  name="car.fill"
                  size={16}
                  color={colors.text}
                  style={{ marginRight: 8 }}
                />
                <ThemedText style={{ fontSize: 14 }}>
                  {t("home.soldBought")}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
              >
                <IconSymbol
                  name="chevron.left"
                  size={16}
                  color={errorColor}
                  style={{ marginRight: 8 }}
                />
                <ThemedText style={{ fontSize: 14, color: errorColor }}>
                  {t("profile.logout")}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>,
          document.body,
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  profileDropdown: {
    position: "absolute",
    top: 54,
    right: 0,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  portalProfileDropdown: {
    position: "fixed",
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    zIndex: 9999999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  dropdownHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  dropdownType: {
    fontSize: 12,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: "100%",
    fontSize: 15,
  },
  searchTapArea: {
    flex: 1,
    height: "100%",
  },
  searchDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  filterBtn: {
    padding: 4,
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
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  sheetItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyRowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyOptions: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
  },
  currencyOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingBottom: 0, // Space for tab bar
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  webScrollContent: {
    paddingBottom: 0,
  },
  webSection: {
    marginTop: 32,
  },
  webSectionHeaderSm: {
    paddingHorizontal: 16,
  },
  webSectionHeaderMd: {
    paddingHorizontal: 40,
  },
  webSectionHeaderLg: {
    paddingHorizontal: 80,
  },
  webSectionHeaderXl: {
    paddingHorizontal: 160,
  },
  webSectionHeader2Xl: {
    paddingHorizontal: 400,
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  webPromoBannerMd: {
    marginHorizontal: 40,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  webPromoBannerLg: {
    marginHorizontal: 80,
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  webPromoBannerXl: {
    marginHorizontal: 160,
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  webPromoBanner2Xl: {
    marginHorizontal: 400,
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  promoArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
  },
  webCategoriesScrollSm: {
    paddingHorizontal: 16,
  },
  webCategoriesScrollMd: {
    paddingHorizontal: 40,
  },
  webCategoriesScrollLg: {
    paddingHorizontal: 80,
  },
  webCategoriesScrollXl: {
    paddingHorizontal: 160,
  },
  webCategoriesScroll2Xl: {
    paddingHorizontal: 400,
  },
  featuredScroll: {
    paddingHorizontal: 0,
  },
  webFeaturedScrollSm: {
    paddingHorizontal: 0,
  },
  webFeaturedScrollMd: {
    paddingHorizontal: 0,
  },
  webFeaturedScrollLg: {
    paddingHorizontal: 0,
  },
  webFeaturedScrollXl: {
    paddingHorizontal: 0,
  },
  webFeaturedScroll2Xl: {
    paddingHorizontal: 0,
  },
  featuredScrollContainer: {
    paddingHorizontal: 16,
  },
  webFeaturedScrollContainerSm: {
    paddingHorizontal: 16,
  },
  webFeaturedScrollContainerMd: {
    paddingHorizontal: 40,
  },
  webFeaturedScrollContainerLg: {
    paddingHorizontal: 80,
  },
  webFeaturedScrollContainerXl: {
    paddingHorizontal: 160,
  },
  webFeaturedScrollContainer2Xl: {
    paddingHorizontal: 400,
  },
  latestListings: {
    paddingHorizontal: 20,
    gap: 16,
  },
  webLatestListingsSm: {
    paddingHorizontal: 16,
  },
  webLatestListingsMd: {
    paddingHorizontal: 40,
  },
  webLatestListingsLg: {
    paddingHorizontal: 80,
  },
  webLatestListingsXl: {
    paddingHorizontal: 160,
  },
  webLatestListings2Xl: {
    paddingHorizontal: 400,
  },
  brandsScroll: {
    paddingHorizontal: 0,
    gap: 24,
    alignItems: "flex-start",
  },
  webBrandsScrollSm: {
    paddingHorizontal: 0,
  },
  webBrandsScrollMd: {
    paddingHorizontal: 0,
  },
  webBrandsScrollLg: {
    paddingHorizontal: 0,
  },
  webBrandsScrollXl: {
    paddingHorizontal: 0,
  },
  webBrandsScroll2Xl: {
    paddingHorizontal: 0,
  },
  brandsScrollContainer: {
    paddingHorizontal: 20,
  },
  webBrandsScrollContainerSm: {
    paddingHorizontal: 16,
  },
  webBrandsScrollContainerMd: {
    paddingHorizontal: 40,
  },
  webBrandsScrollContainerLg: {
    paddingHorizontal: 80,
  },
  webBrandsScrollContainerXl: {
    paddingHorizontal: 160,
  },
  webBrandsScrollContainer2Xl: {
    paddingHorizontal: 400,
  },
  brandItem: {
    alignItems: "center",
    width: 100,
  },
  brandImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  brandImage: {
    width: "100%",
    height: "100%",
  },
  brandName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  brandCount: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  categoryItem: {
    alignItems: "center",
    marginHorizontal: 4,
    width: 80,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  vehicleCard: {
    width: 280,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    height: 180,
    width: "100%",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleInfo: {
    padding: 10,
    gap: 3,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 19,
  },
  vehicleUsageStatus: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  vehicleSeller: {
    fontSize: 11,
    fontWeight: "500",
  },
  usageBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usageBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  vehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  specText: {
    fontSize: 13,
    fontWeight: "500",
  },
  specDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  latestCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    height: 120,
  },
  latestImage: {
    width: 120,
    height: "100%",
  },
  latestInfo: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  latestHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  latestTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
    lineHeight: 18,
  },
  latestMetaContainer: {
    marginTop: 0,
  },
  latestUsageStatus: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  latestSeller: {
    fontSize: 11,
    fontWeight: "500",
  },
  latestPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  latestSpecsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  latestSpecText: {
    fontSize: 11,
  },
  emptyStateCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  featuredEmptyState: {
    marginHorizontal: 16,
  },
  webFeaturedEmptyStateSm: {
    marginHorizontal: 16,
  },
  webFeaturedEmptyStateMd: {
    marginHorizontal: 40,
  },
  webFeaturedEmptyStateLg: {
    marginHorizontal: 80,
  },
  webFeaturedEmptyStateXl: {
    marginHorizontal: 160,
  },
  webFeaturedEmptyState2Xl: {
    marginHorizontal: 400,
  },
  latestEmptyState: {
    marginHorizontal: 20,
  },
  webLatestEmptyStateSm: {
    marginHorizontal: 16,
  },
  webLatestEmptyStateMd: {
    marginHorizontal: 40,
  },
  webLatestEmptyStateLg: {
    marginHorizontal: 80,
  },
  webLatestEmptyStateXl: {
    marginHorizontal: 160,
  },
  webLatestEmptyState2Xl: {
    marginHorizontal: 400,
  },
  scrollNavButton: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollNavButtonLeft: {
    left: 8,
  },
  scrollNavButtonRight: {
    right: 8,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },

  skeletonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  skeletonCategoryText: {
    height: 10,
    width: 56,
    borderRadius: 6,
    marginTop: 2,
  },
  skeletonFeaturedImage: {
    width: "100%",
    height: 180,
  },
  skeletonLatestImage: {
    width: 120,
    height: "100%",
  },
  skeletonIconDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  // Browse by Category - Mobile styles
  browseSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  browseLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  browseChips: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 16,
  },
  browseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  browseChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  browseChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyStateIconWrap: {
    padding:10,
    borderRadius:100
  }
});
