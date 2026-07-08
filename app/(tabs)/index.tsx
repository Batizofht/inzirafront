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
import { Colors, Elevation, Radius } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VehicleCard } from "@/components/vehicle-card";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import {
  fetchDailyPicks,
  fetchRecentVehicles,
  fetchBrandsWithImages,
  fetchBodyTypes,
} from "@/lib/api-vehicles";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api-favorites";
import { fetchCategories, type Category } from "@/lib/api-categories";
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
import { getUsageStatusColor } from '@/lib/usage-status';
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

// Body type placeholder images - replace with custom images later
const BODY_TYPE_IMAGES: Record<string, string> = {
  "SUVs": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/SUV@2x.png",
  "SUVs & Crossovers": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/SUV@2x.png",
  "Trucks": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Truck@2x.png",
  "Sedans": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Sedan@2x.png",
  "Coupes": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Coupe@2x.png",
  "Minivans": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Minivan@2x.png",
  "Hatchbacks": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Hatchback@2x.png",
  "Convertibles": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Convertible@2x.png",
  "Station Wagons": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Station%20wagon.png",
  "Station wagons": "https://www.autotrader.ca/assets/as24-home/images/categories/bodyTypes/desktop/Station%20wagon.png",
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
  const [dailyPicks, setDailyPicks] = useState<Vehicle[]>([]);
  const [dailyPickIds, setDailyPickIds] = useState<string[]>([]);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [brands, setBrands] = useState<
    Array<{ name: string; image: string | null; count: number }>
  >([]);
  const [bodyTypes, setBodyTypes] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredScrollX, setFeaturedScrollX] = useState(0);
  const featuredScrollRef = useRef<ScrollView>(null);
  const [brandsScrollX, setBrandsScrollX] = useState(0);
  const brandsScrollRef = useRef<ScrollView>(null);
  const errorColor = isDark ? "#FCA5A5" : "#DC2626"; // Professional red shades
  const hasDailyPicks = dailyPicks.length > 0;
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
      setIsLoading(true);
      setError(null);
      const [dailyPicksRes, favoritesRes, categoriesRes, brandsRes, bodyTypesRes] =
        await Promise.all([
          fetchDailyPicks(),
          fetchFavorites().catch(() => ({ data: { favorites: [] } })),
          fetchCategories().catch(() => ({ data: { categories: [] } })),
          fetchBrandsWithImages().catch(() => ({ data: { brands: [] } })),
          fetchBodyTypes().catch(() => ({ data: { bodyTypes: [] } })),
        ]);
      const pickIds = dailyPicksRes.data.ids || [];
      const [recentRes] = await Promise.all([
        fetchRecentVehicles(8, pickIds),
      ]);
      setDailyPicks(dailyPicksRes.data.vehicles || []);
      setDailyPickIds(pickIds);
      setRecentVehicles(recentRes.data.vehicles || []);
      setBrands(brandsRes.data.brands || []);
      setBodyTypes(bodyTypesRes.data.bodyTypes || []);
      setFavoriteIds(
        favoritesRes.data.favorites.map((f: any) => f.vehicleId) || [],
      );
      setCategories(categoriesRes.data.categories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh home listings",
      );
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [dailyPicksRes, favoritesRes, categoriesRes, brandsRes, bodyTypesRes] =
          await Promise.all([
            fetchDailyPicks(),
            fetchFavorites().catch(() => ({ data: { favorites: [] } })),
            fetchCategories().catch(() => ({ data: { categories: [] } })),
            fetchBrandsWithImages().catch(() => ({ data: { brands: [] } })),
            fetchBodyTypes().catch(() => ({ data: { bodyTypes: [] } })),
          ]);
        const pickIds = dailyPicksRes.data.ids || [];
        const [recentRes] = await Promise.all([
          fetchRecentVehicles(8, pickIds),
        ]);
        // Fetch auth user
        const user = await getAuthUser();
        if (mounted) {
          setDailyPicks(dailyPicksRes.data.vehicles || []);
          setDailyPickIds(pickIds);
          setRecentVehicles(recentRes.data.vehicles || []);
          setBrands(brandsRes.data.brands || []);
          setBodyTypes(bodyTypesRes.data.bodyTypes || []);
          setFavoriteIds(
            favoritesRes.data.favorites.map((f: any) => f.vehicleId) || [],
          );
          setCategories(categoriesRes.data.categories || []);
          setAuthUser(user);
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

  const handleLogout = async () => {
    setShowLocationSheet(false);
    setShowProfileMenu(false);
    setAuthUser(null);
    await logout();
    router.replace("/auth/login" as any);
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
        styles.latestGrid,
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
      {Array.from({ length: isDesktopWeb ? 4 : 4 }).map((_, index) => (
        <View
          key={`latest-skeleton-${index}`}
          style={[
            isDesktopWeb ? styles.webLatestGridCard : styles.latestGridCard,
            {
              borderRadius: Radius.lg,
              borderWidth: 1,
              overflow: "hidden",
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
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
                { width: "56%", marginBottom: 0, backgroundColor: skeletonBase },
              ]}
            />
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


      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(20, insets.bottom) },
          isDesktopWeb && styles.webScrollContent,
        ]}
      >
        {/* Mobile Header — scrolls with the page */}
        {!isDesktopWeb && (
          <View style={[styles.header, { backgroundColor: colors.background }]}>
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
                    style={{ fontSize: 18, width: 70 }}
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
                  style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push("/notifications")}
                >
                  <IconSymbol name="bell.fill" size={20} color={colors.text} />
                  {!!authUser && unreadNotificationsCount > 0 && (
                    <View style={[styles.notificationBadge, { backgroundColor: errorColor }]} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push("/messages")}
                >
                  <IconSymbol name="message.fill" size={20} color={colors.text} />
                  {!!authUser && unreadMessagesCount > 0 && (
                    <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>

                <View ref={profileTriggerRef} style={{ position: "relative" }}>
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => {
                      if (isLoading) return;
                      if (!authUser) {
                        router.push("/auth/login" as any);
                        return;
                      }
                      if (isWeb && profileTriggerRef.current) {
                        const el = profileTriggerRef.current as unknown as HTMLElement;
                        if (el && el.getBoundingClientRect) {
                          const rect = el.getBoundingClientRect();
                          setProfileDropdownPos({
                            top: rect.bottom + window.scrollY + 8,
                            left: rect.left + window.scrollX - 156,
                          });
                        }
                      }
                      setShowProfileMenu(!showProfileMenu);
                    }}
                  >
                    {isLoading ? (
                      <View style={[styles.profileAvatar, { justifyContent: "center", alignItems: "center" }]}>
                        <ActivityIndicator size="small" color={colors.icon} />
                      </View>
                    ) : authUser?.profileImage ? (
                      <Image
                        source={{ uri: authUser.profileImage }}
                        style={[styles.profileAvatar, { borderColor: colors.primary }]}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[styles.profileAvatar, {
                          backgroundColor: colors.primary,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 22,
                        }]}
                      >
                        <ThemedText style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                          {(authUser?.fullName || "U")[0].toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.icon} style={styles.searchIcon} />
              <TouchableOpacity style={styles.searchTapArea} onPress={goToSearch} activeOpacity={0.8}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={t("home.searchPlaceholder")}
                  placeholderTextColor={colors.icon}
                  value={searchQuery}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.filterBtn} onPress={goToSearch}>
                <IconSymbol name="chevron.right" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18, fontWeight: "800", letterSpacing: -0.3 }}>
              {"Your Today's Pick"}
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
          ) : !hasDailyPicks ? (
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
                  {dailyPicks.slice(0, 10).map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      variant="grid"
                      isFavorited={isFavorited(vehicle.id)}
                      onPress={() => goToVehicle(vehicle.id)}
                      onToggleFavorite={() => handleToggleFavorite(vehicle.id)}
                      style={styles.vehicleCard}
                    />
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

        {/* Browse by Body Type */}
        <View style={[styles.section, isDesktopWeb && styles.webSection, { marginTop: 40 }]}>
          <View
            style={[
              styles.bodyTypeSectionContainer,
              {
                borderColor: colors.border,
                backgroundColor: isDark ? "rgba(31, 41, 55, 0.3)" : "rgba(248, 250, 252, 0.8)",
              },
              isDesktopWeb &&
                (is2Xl
                  ? styles.webBodyTypeSectionContainer2Xl
                  : isXl
                    ? styles.webBodyTypeSectionContainerXl
                    : isLg
                      ? styles.webBodyTypeSectionContainerLg
                      : styles.webBodyTypeSectionContainerMd),
            ]}
          >
            <ThemedText type="defaultSemiBold" style={[styles.bodyTypeSectionTitle, { color: colors.text }]}>
              Browse by body type
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bodyTypesScroll}
            >
              {[
                "SUVs & Crossovers",
                "Trucks",
                "Sedans",
                "Coupes",
                "Minivans",
                "Hatchbacks",
                "Convertibles",
                "Station Wagons",
              ].map((type) => {
                const matchedType = bodyTypes.find(
                  (bt) => bt.name.toLowerCase() === type.toLowerCase()
                );
                const count = matchedType?.count || 0;
                return (
                  <TouchableOpacity
                    key={type}
                    style={styles.bodyTypeItem}
                    onPress={() =>
                      router.push({
                        pathname: "/explore",
                        params: { typebodies: type.replace("SUVs & Crossovers", "SUVs") },
                      } as any)
                    }
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.bodyTypeImageContainer,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {BODY_TYPE_IMAGES[type] ? (
                        <Image
                          source={{ uri: BODY_TYPE_IMAGES[type] }}
                          style={styles.bodyTypeImage}
                          contentFit="contain"
                        />
                      ) : (
                        <IconSymbol
                          name="car.fill"
                          size={36}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    <ThemedText
                      style={[styles.bodyTypeName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {type.replace("SUVs & Crossovers", "SUVs")}
                    </ThemedText>
                    {count > 0 && (
                      <ThemedText
                        style={[styles.bodyTypeCount, { color: colors.icon }]}
                      >
                        {count} cars
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
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
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18, fontWeight: "800", letterSpacing: -0.3 }}>
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
                styles.latestGrid,
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
              {recentVehicles
                .filter((v) => !dailyPickIds.includes(v.id))
                .sort(
                  (a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                )
                .slice(0, 8)
                .map((vehicle) => (
                  <VehicleCard
                    key={`latest-${vehicle.id}`}
                    vehicle={vehicle}
                    variant="grid"
                    isFavorited={isFavorited(vehicle.id)}
                    onPress={() => goToVehicle(vehicle.id)}
                    onToggleFavorite={() => handleToggleFavorite(vehicle.id)}
                    style={isDesktopWeb ? styles.webLatestGridCard : styles.latestGridCard}
                  />
                ))}
            </View>
          )}
        </View>

        {/* Browse All button */}
        <View style={styles.browseAllWrap}>
          <TouchableOpacity
            style={[styles.browseAllBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/explore' as any)}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.browseAllBtnText}>Browse All</ThemedText>
            <IconSymbol name="arrow.right" size={14} color="#fff" />
          </TouchableOpacity>
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
                    ...Elevation.raised,
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

      {showProfileMenu && (isWeb ? (
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
        )
      ) : (
        <Modal transparent visible={showProfileMenu} animationType="slide" onRequestClose={() => setShowProfileMenu(false)}>
          <View style={styles.sheetOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowProfileMenu(false)} />
            <Pressable style={[styles.sheetContainer, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>Profile Menu</ThemedText>

              <View style={[styles.dropdownHeader, { borderBottomColor: colors.border, paddingHorizontal: 0, paddingVertical: 12 }]}>
                <ThemedText style={styles.dropdownName}>
                  {authUser?.fullName || "User"}
                </ThemedText>
                <ThemedText style={[styles.dropdownType, { color: colors.icon }]}>
                  {authUser?.role || "Buyer"}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/(tabs)/profile" as any);
                }}
              >
                <ThemedText style={styles.sheetItemText}>Profile</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/order" as any);
                }}
              >
                <ThemedText style={styles.sheetItemText}>{t("home.soldBought")}</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={handleLogout}
              >
                <ThemedText style={[styles.sheetItemText, { color: errorColor }]}>Logout</ThemedText>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Modal>
      ))}
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
    ...Elevation.raised,
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
    ...Elevation.raised,
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
    marginTop: 48,
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    ...Elevation.flat,
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
    gap: 10,
  },
  latestGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  latestGridCard: {
    width: "48%",
  },
  webLatestGridCard: {
    width: "calc(25% - 18px)" as any,
    minWidth: 220,
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
  // Body Type styles
  bodyTypeSectionContainer: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  webBodyTypeSectionContainerMd: {
    marginHorizontal: 40,
  },
  webBodyTypeSectionContainerLg: {
    marginHorizontal: 80,
  },
  webBodyTypeSectionContainerXl: {
    marginHorizontal: 160,
  },
  webBodyTypeSectionContainer2Xl: {
    marginHorizontal: 400,
  },
  bodyTypeSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  bodyTypesScroll: {
    gap: 16,
    alignItems: "flex-start",
    marginLeft:5
  },
  bodyTypeItem: {
    alignItems: "center",
    width: 110,
  },
  bodyTypeImageContainer: {
    width: 120,
    height: 100,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  bodyTypeImage: {
    width: "90%",
    height: "80%",
  },
  bodyTypeName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  bodyTypeCount: {
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
    fontWeight: "600",
    textAlign: "center",
  },
  vehicleCard: {
    width: 260,
    borderRadius: Radius.lg,
    marginHorizontal: 5,
    borderWidth: 1,
    overflow: "hidden",
    ...Elevation.card,
  },
  imageContainer: {
    position: "relative",
    height: 175,
    width: "100%",
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: "hidden",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  usageOverlayBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  usageOverlayText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vehicleInfo: {
    padding: 12,
    gap: 6,
  },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 19,
  },
  verifiedBadge: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    flexShrink: 0,
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
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  vehicleSpecs: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleSpecChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  specChip: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  specChipText: {
    fontSize: 11,
    fontWeight: "500",
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
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    height: 118,
    ...Elevation.card,
  },
  latestImageWrap: {
    position: "relative",
    width: 118,
    height: "100%",
  },
  latestImage: {
    width: 118,
    height: "100%",
  },
  latestUsageBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  latestUsageBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  latestInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  latestHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  latestTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
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
    marginTop: 1,
  },
  latestPrice: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 2,
  },
  latestSpecsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  latestSpecDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  latestSpecText: {
    fontSize: 11,
    fontWeight: "500",
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
    ...Elevation.flat,
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
  },
  browseAllWrap: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  browseAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
