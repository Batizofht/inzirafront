import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors, Elevation, Radius } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { Heading } from "@/components/heading";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VehicleCard } from "@/components/vehicle-card";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
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
import { OnboardingHint } from "@/components/onboarding-hint";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { resolveImageUrl } from "@/lib/image-url";
import { getUsageStatusColor } from '@/lib/usage-status';
import { LocalBusinessStructuredData } from "@/components/seo-head";
import { HomeSEO } from "@/components/page-head";
import { createPortal } from "react-dom";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Themman from "@/lib/Notification/Allowno";
import { Toast } from "@/components/Toast";

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

// Custom category icon images — used when a category's fuel-type icon has a matching
// custom asset. Falls back to the existing IconSymbol mapping when not present.
const CATEGORY_ICON_IMAGES: Record<string, any> = {
  "car.fill": require('@/assets/customericons/petrol-pump.png'),
  "fuelpump.fill": require('@/assets/customericons/petrol-pump.png'),
  "drop.fill": require('@/assets/customericons/diesel.png'),
  "leaf.fill": require('@/assets/customericons/hybrid.png'),
  "bolt.car.fill": require('@/assets/customericons/chargingelectric.png'),
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

function BodyTypeChip({
  type,
  count,
  colors,
  isDark,
  onPress,
  compact,
}: {
  type: string;
  count: number;
  colors: (typeof Colors)["light"];
  isDark: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      style={[styles.bodyTypeItem, compact && styles.bodyTypeItemCompact]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <View
        style={[
          styles.bodyTypeImageContainer,
          compact && styles.bodyTypeImageContainerCompact,
          {
            backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
            borderColor: isHovered || isFocused ? colors.primary : colors.border,
            borderWidth: isHovered || isFocused ? 2 : 1,
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
          <IconSymbol name="car.fill" size={compact ? 28 : 36} color={colors.primary} />
        )}
      </View>
      <ThemedText style={[styles.bodyTypeName, { color: colors.text }]} numberOfLines={1}>
        {type.replace("SUVs & Crossovers", "SUVs").replace("Station wagons", "Station Wagons")}
      </ThemedText>
      {count > 0 && (
        <ThemedText style={[styles.bodyTypeCount, { color: colors.icon }]}>
          {t("home.carsCount", { count })}
        </ThemedText>
      )}
    </Pressable>
  );
}

function InsuranceActionButton({
  icon,
  label,
  onPress,
  colors,
  isDark,
  accentColor,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: (typeof Colors)["light"];
  isDark: boolean;
  accentColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={[
        styles.insuranceActionCard,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderColor: isHovered ? accentColor : colors.border,
          borderWidth: isHovered ? 2 : 1,
        },
        isHovered && styles.insuranceActionCardHovered,
      ]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <View
        style={[
          styles.insuranceActionIconWrap,
          { backgroundColor: isDark ? `${accentColor}26` : `${accentColor}14` },
        ]}
      >
        <IconSymbol name={icon as any} size={18} color={accentColor} />
      </View>
      <ThemedText
        style={[styles.insuranceActionText, { color: colors.text }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      <IconSymbol
        name="chevron.right"
        size={14}
        color={isHovered ? accentColor : colors.icon}
        style={[
          styles.insuranceActionChevron,
          isHovered && styles.insuranceActionChevronHovered,
        ]}
      />
    </Pressable>
  );
}

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
    t("home.detectingLocation"),
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
  const [brandsScrollX, setBrandsScrollX] = useState(0);
  const [toast, setToast] = useState<{ title: string; body?: string; icon?: string } | null>(null);
  const brandsScrollRef = useRef<ScrollView>(null);
  const errorColor = isDark ? "#FCA5A5" : "#DC2626"; // Professional red shades
  const hasDailyPicks = dailyPicks.length > 0;
  const hasRecentVehicles = recentVehicles.length > 0;

  const isFavorited = (id: string) => favoriteIds.includes(id);
  const totalVehicleCount = useMemo(() => bodyTypes.reduce((sum, bt) => sum + (bt.count || 0), 0), [bodyTypes]);

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
        setCurrentLocationLabel(t("home.locationPermissionDenied"));
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
        setCurrentLocationLabel(t("home.locationUnavailable"));
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
        setCurrentLocationLabel(t("home.locationUnavailable"));
      }
    } catch (err) {
      console.error("[home] resolveDeviceLocation failed", err);
      setCurrentLocationLabel(t("home.locationUnavailable"));
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
        setToast({ title: t("home.removedFromFavorites"), icon: "heart" });
      } else {
        await addFavorite(id);
        setFavoriteIds((prev) => [...prev, id]);
        setToast({ title: t("home.addedToFavorites"), icon: "heart.fill" });
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
        err instanceof Error ? err.message : t("home.failedRefreshListings"),
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
            err instanceof Error ? err.message : t("home.failedLoadListings"),
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
        {t("home.noCarsUploaded")}
      </ThemedText>
      <ThemedText style={[styles.emptyStateSubtitle, { color: colors.icon }]}>
        {t("home.comeBackAgain")}
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
          key={`featured-skeleton-${index}`}
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
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
              {t("home.mustLoginFirst")}
            </ThemedText>
          </View>
        </View>
      )}
      {!!toast && (
        <Toast
          visible={!!toast}
          title={toast.title}
          icon={toast.icon}
          onHide={() => setToast(null)}
        />
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

            {/* The desktop HeroSection carries the <h1> on wide screens, but the
                static export renders at zero width and Google crawls mobile-first,
                so the compact layout needs its own headline or the homepage ships
                with no <h1> and no statement of what the site is. */}
            <Heading level={1} style={[styles.homeHeadline, { color: colors.text }]}>
              {t("hero.welcomeTitle")}
            </Heading>

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

        {/* Insurance banner — the gif is the tappable ad. On web the box is much
            wider than the gif's own aspect ratio, so it now keeps its full,
            undistorted look on the left (sized to its own aspect ratio) and
            the leftover width holds two quick-action buttons. Mobile is
            untouched — still just the full-bleed tappable image. */}
        <View
          style={[
            styles.insuranceBanner,
            isDesktopWeb &&
              (is2Xl
                ? styles.webInsuranceBanner2Xl
                : isXl
                  ? styles.webInsuranceBannerXl
                  : isLg
                    ? styles.webInsuranceBannerLg
                    : styles.webInsuranceBanner),
          ]}
        >
          <TouchableOpacity
            style={isDesktopWeb ? styles.insuranceLeftImageWrap : styles.insuranceBgImage}
            onPress={() => {
              const waUrl = `https://wa.me/250788307583?text=${encodeURIComponent(t("home.insuranceWhatsappMessage"))}`;
              Linking.openURL(waUrl).catch(() => {});
            }}
            activeOpacity={0.9}
          >
            {isDesktopWeb ? <>  <Image
              source={require("../../assets/banner.png")}
              style={isDesktopWeb ? styles.insuranceLeftImage : StyleSheet.absoluteFill}
              contentFit="cover"
            /></> : <>
              <Image
              source={require("../../assets/bannerm.png")}
              style={isDesktopWeb ? styles.insuranceLeftImage : StyleSheet.absoluteFill}
              contentFit="cover"
            />
            </>}
       
          </TouchableOpacity>

          {isDesktopWeb && (
            <View
              style={[
                styles.insuranceRightActions,
                {
                  backgroundColor: isDark ? "#111827" : "#F8FAFC",
                  borderTopRightRadius: Radius.lg,
                  borderBottomRightRadius: Radius.lg,
                },
              ]}
            >
              <InsuranceActionButton
                icon="magnifyingglass"
                label={t("hero.searchCars")}
                onPress={() => router.push("/search")}
                colors={colors}
                isDark={isDark}
                accentColor={colors.primary}
              />
              <InsuranceActionButton
                icon="person.crop.circle.badge.plus"
                label={t("home.registerAccount")}
                onPress={() => router.push("/auth/register" as any)}
                colors={colors}
                isDark={isDark}
                accentColor="#16A34A"
              />
            </View>
          )}
        </View>

        {/* Browse by Category - Mobile (desktop has its own version inside HeroSection) */}
        {!isDesktopWeb && categories.length > 0 && (
          <View style={[styles.browseSection, { borderBottomColor: colors.border }]}>
            <View style={{ position: "relative", alignSelf: "flex-start", zIndex: 999999 }}>
              <ThemedText style={[styles.browseLabel, { color: colors.icon }]}>
                {t("home.browseByCategoryLabel")}
              </ThemedText>
              <OnboardingHint
                id="browse-category-mobile"
                text={t("home.browseByCategoryHint")}
                icon="square.grid.2x2"
                placement="bottom"
                align="left"
                style={styles.marginDown}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.browseChips}
            >
              {categories.slice(0, 8).map((cat, index) => {
            const colorPalette = [
                { bg: isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.12)', icon: '#DB2777' }, // Pink
                { bg: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(59, 130, 246, 0.12)', icon: '#2563EB' }, // Blue
                { bg: isDark ? 'rgba(89, 78, 240, 0.2)' : 'rgba(15, 54, 228, 0.12)', icon: '#9333EA' }, // Purple
                { bg: isDark ? 'rgba(77, 236, 72, 0.2)' : 'rgba(72, 236, 86, 0.12)', icon: '#DB2777' }, // Pink
                { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)', icon: '#D97706' }, // Orange
                { bg: isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.12)', icon: '#0D9488' }, // Teal
                { bg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)', icon: '#4F46E5' }, // Indigo
                { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)', icon: '#DC2626' }, // Red
              ];
                const catColors = colorPalette[index % colorPalette.length];
                const customIcon = CATEGORY_ICON_IMAGES[cat.icon || ''];

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
                      {customIcon ? (
                        <Image source={customIcon} style={{ width: 40, height: 40 }} contentFit="contain" />
                      ) : (
                        <IconSymbol
                          name={(cat.icon || "car.fill") as any}
                          size={30}
                          color={catColors.icon}
                        />
                      )}
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
              {t("home.todaysPick")}
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
                 {t("home.refresh")}
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
              {dailyPicks.slice(0, 8).map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
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

        {/* Browse by Body Type */}
        <View style={[styles.section, isDesktopWeb && styles.webSection, { marginTop: 40, position: "relative", zIndex: 999999 }]}>
          <View
            style={[
              styles.bodyTypeSectionContainer,
              !isDesktopWeb && styles.bodyTypeSectionContainerMobile,
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
            <View style={{ position: "relative", alignSelf: "flex-start", zIndex: 999999 }}>
              <ThemedText type="defaultSemiBold" style={[styles.bodyTypeSectionTitle, { color: colors.text }]}>
                {t("header.browseByBodyType")}
              </ThemedText>
              <OnboardingHint
                id="browse-body-type"
                text={t("home.browseByBodyTypeHint")}
                icon="car.fill"
                placement="bottom"
                align="left"
                style={styles.bodyTypeHintOffset}
              />
            </View>
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
                "Station wagons",
              ].map((type) => {
                const matchedType = bodyTypes.find(
                  (bt) => bt.name.toLowerCase() === type.toLowerCase()
                );
                const count = matchedType?.count || 0;
                return (
                  <BodyTypeChip
                    key={type}
                    type={type}
                    count={count}
                    colors={colors}
                    isDark={isDark}
                    compact={!isDesktopWeb}
                    onPress={() =>
                      router.push({
                        pathname: "/explore",
                        params: { typebodies: type },
                      } as any)
                    }
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Vehicle Count — bold gradient stat strip */}
        {totalVehicleCount > 0 && (
          <View
            style={[
              styles.vehicleCountOuter,
              isDesktopWeb &&
                (is2Xl
                  ? styles.webVehicleCountWrap2Xl
                  : isXl
                    ? styles.webVehicleCountWrapXl
                    : isLg
                      ? styles.webVehicleCountWrapLg
                      : styles.webVehicleCountWrapMd),
            ]}
          >
            <LinearGradient
              colors={
                isDark
                  ? ["#1D4ED8", "#0D1B3E"]
                  : ["#0A2540", "#12406E"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vehicleCountWrap}
            >
              <IconSymbol
                name="car.rear.fill"
                size={72}
                color="rgba(255,255,255,0.10)"
                style={styles.vehicleCountGhostIcon}
              />
              <ThemedText style={styles.vehicleCountPrefix}>
                {t("home.vehiclesAvailablePrefix")}
              </ThemedText>
              <View style={styles.vehicleCountNumberRow}>
                <ThemedText style={styles.vehicleCountBigNumber}>
                  {totalVehicleCount.toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.vehicleCountPlus}>+</ThemedText>
              </View>
              <ThemedText style={styles.vehicleCountLabel}>
                {t("home.vehiclesAvailableSuffix")}
              </ThemedText>
            </LinearGradient>
          </View>
        )}

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
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "#F3F5F8",
              borderColor: `${colors.primary}45`,
            },
          ]}
          onPress={() => router.push("/contact" as any)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isDark ? ["#3B82F6", "#2563EB"] : ["#1E3A5F", "#0A2540"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.promoIconContainer, !isDesktopWeb && styles.promoIconContainerMobile]}
          >
            <IconSymbol name="sparkles" size={isDesktopWeb ? 24 : 20} color="#fff" />
          </LinearGradient>
          <View style={styles.promoContent}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.promoTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {t("home.customOrderTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.promoSubtitle, { color: colors.icon }]}
              numberOfLines={2}
            >
              {t("home.customOrderSubtitle")}
            </ThemedText>
          </View>
          <View style={[styles.promoArrow, !isDesktopWeb && styles.promoArrowMobile, { backgroundColor: colors.primary }]}>
            <IconSymbol name="arrow.right" size={isDesktopWeb ? 18 : 15} color="#fff" />
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
            <ThemedText style={styles.browseAllBtnText}>{t('home.browseAll')}</ThemedText>
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
                {t("home.carsByBrand")}
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
                        {t("home.carsCount", { count: brand.count })}
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
              {t("home.locationMenu")}
            </ThemedText>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={handleGoSupport}
            >
              <ThemedText style={styles.sheetItemText}>{t('home.support')}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={() => setShowCurrencyOptions((prev) => !prev)}
            >
              <View style={styles.currencyRow}>
                <ThemedText style={styles.sheetItemText}>{t('home.currency')}</ThemedText>
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
                {t("home.logout")}
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
                  {authUser?.fullName || t("home.defaultUserName")}
                </ThemedText>
                <ThemedText
                  style={[styles.dropdownType, { color: colors.icon }]}
                >
                  {authUser?.role || t("home.defaultRole")}
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
              <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>{t('home.profileMenu')}</ThemedText>

              <View style={[styles.dropdownHeader, { borderBottomColor: colors.border, paddingHorizontal: 0, paddingVertical: 12 }]}>
                <ThemedText style={styles.dropdownName}>
                  {authUser?.fullName || t("home.defaultUserName")}
                </ThemedText>
                <ThemedText style={[styles.dropdownType, { color: colors.icon }]}>
                  {authUser?.role || t("home.defaultRole")}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push("/(tabs)/profile" as any);
                }}
              >
                <ThemedText style={styles.sheetItemText}>{t('home.profile')}</ThemedText>
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
                <ThemedText style={[styles.sheetItemText, { color: errorColor }]}>{t('home.logout')}</ThemedText>
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
  },
  toastOverlay: {
    position: "absolute",
    top: 56,
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
  marginDown:{
    marginTop:60
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
  homeHeadline: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 10,
    ...Elevation.card,
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
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  promoIconContainerMobile: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  promoContent: {
    flex: 1,
    minWidth: 0,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  promoSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  promoArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  promoArrowMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    width: "100%",
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
  bodyTypeSectionContainerMobile: {
    marginHorizontal: 10,
    paddingHorizontal: 8,
    paddingVertical: 18,
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
  bodyTypeHintOffset: {
    marginTop: 110,
  },
  bodyTypesScroll: {
    gap: 16,
    alignItems: "flex-start",
  },
  bodyTypeItem: {
    alignItems: "center",
    width: 110,
  },
  bodyTypeItemCompact: {
    width: 84,
  },
  bodyTypeImageContainer: {
    width: 110,
    height: 80,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  bodyTypeImageContainerCompact: {
    width: 84,
    height: 64,
  },
  bodyTypeImage: {
    width: "96%",
    height: "82%",
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
    position: "relative",
    zIndex: 999999,
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
 width: 50,
    height: 50,
    borderRadius: 10,
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
  // Vehicle Count — bold gradient stat strip
  vehicleCountOuter: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  vehicleCountWrap: {
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  vehicleCountGhostIcon: {
    position: 'absolute',
    right: -8,
    bottom: -10,
    transform: [{ rotate: '-12deg' }],
  },
  vehicleCountPrefix: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.65)',
  },
  vehicleCountNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  vehicleCountBigNumber: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  vehicleCountPlus: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38BDF8',
    marginLeft: 2,
    marginTop: 4,
  },
  vehicleCountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    maxWidth: '80%',
  },
  webVehicleCountWrapMd: {
    marginHorizontal: 40,
  },
  webVehicleCountWrapLg: {
    marginHorizontal: 80,
  },
  webVehicleCountWrapXl: {
    marginHorizontal: 160,
  },
  webVehicleCountWrap2Xl: {
    marginHorizontal: 400,
  },
  // Insurance Ad — full-bleed image creative styled like a real ad unit
  insuranceBanner: {
    marginHorizontal: 10,
    marginTop: 16,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  webInsuranceBanner: {
    marginHorizontal: 40,
    marginTop: 24,
    height: 210,
    flexDirection: 'row',
  },
  webInsuranceBannerLg: {
    marginHorizontal: 80,
    marginTop: 24,
   height: 260,
    flexDirection: 'row',
  },
  webInsuranceBannerXl: {
    marginHorizontal: 160,
    marginTop: 32,
    height: 310,
    flexDirection: 'row',
  },
  webInsuranceBanner2Xl: {
    marginHorizontal: 400,
    marginTop: 32,
    height: 250,
    flexDirection: 'row',
  },
  insuranceBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  insuranceLeftImageWrap: {
    height: '100%',
    width: '80%',
  },
  insuranceLeftImage: {
    width: '100%',
    height: '100%',
  },
  insuranceRightActions: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  insuranceActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Elevation.card,
  },
  insuranceActionCardHovered: {
    ...Elevation.raised,
  },
  insuranceActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insuranceActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  insuranceActionChevron: {
    marginLeft: 4,
  },
  insuranceActionChevronHovered: {
    transform: [{ translateX: 2 }],
  },
});
