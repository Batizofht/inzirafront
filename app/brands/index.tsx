import { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { fetchBrandsWithImages } from "@/lib/api-vehicles";

const BRAND_LOGOS: Record<string, string> = {
  // ✅ Confirmed working by user
  Toyota: "https://www.carlogos.org/logo/Toyota-logo-1989-2560x1440.png",
  Honda: "https://www.carlogos.org/car-logos/honda-logo-2000-full-download.png",

  // Brandfetch CDN
  "Mercedes-Benz": "https://cdn.brandfetch.io/mercedes-benz.com/w/400/h/400/logo",
  Mercedes: "https://cdn.brandfetch.io/mercedes-benz.com/w/400/h/400/logo",
  BMW: "https://cdn.brandfetch.io/bmw.com/w/400/h/400/logo",
  Audi: "https://cdn.brandfetch.io/audi.com/w/400/h/400/logo",
  Nissan: "https://cdn.brandfetch.io/nissan.com/w/400/h/400/logo",
  Ford: "https://cdn.brandfetch.io/ford.com/w/400/h/400/logo",
  Volkswagen: "https://cdn.brandfetch.io/volkswagen.com/w/400/h/400/logo",
  Hyundai: "https://cdn.brandfetch.io/hyundai.com/w/400/h/400/logo",
  Kia: "https://cdn.brandfetch.io/kia.com/w/400/h/400/logo",
  Chevrolet: "https://cdn.brandfetch.io/chevrolet.com/w/400/h/400/logo",
  Mazda: "https://cdn.brandfetch.io/mazda.com/w/400/h/400/logo",
  Subaru: "https://cdn.brandfetch.io/subaru.com/w/400/h/400/logo",
  Lexus: "https://cdn.brandfetch.io/lexus.com/w/400/h/400/logo",
  Jeep: "https://cdn.brandfetch.io/jeep.com/w/400/h/400/logo",
  "Land Rover": "https://cdn.brandfetch.io/landrover.com/w/400/h/400/logo",
  Porsche: "https://cdn.brandfetch.io/porsche.com/w/400/h/400/logo",
  Volvo: "https://cdn.brandfetch.io/volvocars.com/w/400/h/400/logo",
  Tesla: "https://cdn.brandfetch.io/tesla.com/w/400/h/400/logo",
  Mitsubishi: "https://cdn.brandfetch.io/mitsubishi.com/w/400/h/400/logo",
  Peugeot: "https://cdn.brandfetch.io/peugeot.com/w/400/h/400/logo",
  Renault: "https://cdn.brandfetch.io/renault.com/w/400/h/400/logo",
  Suzuki: "https://cdn.brandfetch.io/suzuki.com/w/400/h/400/logo",
  Isuzu: "https://cdn.brandfetch.io/isuzu.com/w/400/h/400/logo",
  Fiat: "https://cdn.brandfetch.io/fiat.com/w/400/h/400/logo",
  Jaguar: "https://cdn.brandfetch.io/jaguar.com/w/400/h/400/logo",
  "Range Rover": "https://cdn.brandfetch.io/landrover.com/w/400/h/400/logo",
  Acura: "https://cdn.brandfetch.io/acura.com/w/400/h/400/logo",
  Infiniti: "https://cdn.brandfetch.io/infiniti.com/w/400/h/400/logo",
  Cadillac: "https://cdn.brandfetch.io/cadillac.com/w/400/h/400/logo",
  Dodge: "https://cdn.brandfetch.io/dodge.com/w/400/h/400/logo",
  RAM: "https://cdn.brandfetch.io/ramtrucks.com/w/400/h/400/logo",
  GMC: "https://cdn.brandfetch.io/gmc.com/w/400/h/400/logo",
  "Aston Martin": "https://cdn.brandfetch.io/astonmartin.com/w/400/h/400/logo",
};

export default function BrandsScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Browse Brands | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktopWeb = isWeb && width >= 1024;
  const isTablet = isWeb && width >= 768 && width < 1024;
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const containerPadding = is2Xl ? 200 : isXl ? 120 : isLg ? 80 : isTablet ? 40 : 20;
  const gridColumns = is2Xl ? 6 : isXl ? 5 : isLg ? 4 : isTablet ? 3 : 2;
  const itemGap = 16;
  const headerMaxWidth = is2Xl ? 1600 : isXl ? 1400 : isLg ? 1200 : undefined;

  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    loadBrands();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadBrands = async () => {
    try {
      const res = await fetchBrandsWithImages();
      if (mountedRef.current) {
        // Sort brands by car count (highest first)
        const brandsData = res.data?.brands || [];
        const sortedBrands = brandsData.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
        setBrands(sortedBrands);
      }
    } catch (err) {
      console.error("Failed to load brands:", err);
      if (mountedRef.current) {
        setBrands([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleBrandPress = (brandName: string) => {
    router.push({
      pathname: "/(tabs)/explore",
      params: { brand: brandName },
    } as any);
  };

  const itemWidth =
    (width - containerPadding * 2 - (gridColumns - 1) * itemGap) / gridColumns;

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              paddingTop: !isWeb ? insets.top : 8,
              borderBottomWidth: 0,
            },
            isDesktopWeb && {
              paddingHorizontal: webPaddingHorizontal,
              borderBottomWidth: 1,
            },
          ]}
        >
          <View style={[styles.headerInner, isDesktopWeb && headerMaxWidth && { maxWidth: headerMaxWidth, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              All Brands
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isDesktopWeb ? { alignItems: 'center', justifyContent:"center" } : undefined}
      >
        <View style={{ width: '100%', maxWidth: isDesktopWeb ? "100%" : undefined, alignSelf: 'center' }}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
                paddingTop: !isWeb ? insets.top : 8,
                borderBottomWidth: 0,
              },
              isDesktopWeb && {
                borderBottomWidth: 1,
                paddingHorizontal: containerPadding,
              },
            ]}
          >
            <View style={styles.headerInner}>
              <TouchableOpacity onPress={() => router.back()}>
                <IconSymbol name="chevron.left" size={24} color={colors.text} />
              </TouchableOpacity>
              <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                All Brands
              </ThemedText>
              <View style={{ width: 24 }} />
            </View>
          </View>

          {/* Content */}
          <View
            style={[
              styles.container,
              {
                paddingHorizontal: (isDesktopWeb || isTablet) ? containerPadding : 20,
              },
            ]}
          >
            {brands.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol name="car.fill" size={64} color={colors.icon} />
                <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                  No brands available
                </ThemedText>
                <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>
                  Check back later for available car brands
                </ThemedText>
              </View>
            ) : (
            <View
              style={[
                styles.brandsGrid,
                {
                  gap: itemGap,
                },
              ]}
            >
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand.name}
                  style={[
                    styles.brandCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      width: itemWidth,
                    },
                  ]}
                  onPress={() => handleBrandPress(brand.name)}
                  activeOpacity={0.7}
                >
                  {/* Logo Container */}
                  <View
                    style={[
                      styles.logoContainer,
                      {
                        backgroundColor: theme === 'dark' ? '#E5E7EB' : '#F9FAFB',
                        borderColor: `${colors.primary}20`,
                      },
                    ]}
                  >
                    {BRAND_LOGOS[brand.name as keyof typeof BRAND_LOGOS] ? (
                      <Image
                        source={{
                          uri: BRAND_LOGOS[
                            brand.name as keyof typeof BRAND_LOGOS
                          ],
                        }}
                        style={styles.brandLogo}
                        contentFit="contain"
                        cachePolicy="disk"
                      />
                    ) : (
                      <IconSymbol
                        name="car.fill"
                        size={48}
                        color={colors.primary}
                      />
                    )}
                  </View>

                  {/* Brand Name */}
                  <ThemedText
                    style={[styles.brandName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {brand.name}
                  </ThemedText>

                  {/* Car Count */}
                  <ThemedText
                    style={[styles.carCount, { color: colors.icon }]}
                    numberOfLines={1}
                  >
                    {brand.count || 0} {brand.count === 1 ? "car" : "cars"}
                  </ThemedText>

                  {/* Explore Button */}
                  <View
                    style={[
                      styles.exploreButton,
                      {
                        backgroundColor: `${colors.primary}10`,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.exploreButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      Explore
                    </ThemedText>
                    <IconSymbol
                      name="arrow.right"
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            )}
          </View>
        </View>

        {isDesktopWeb && <WebFooter />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    paddingVertical: 24,
    paddingBottom: 40,
  },
  brandsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  brandCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  logoContainer: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  brandLogo: {
    width: "85%",
    height: "85%",
  },
  brandName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  carCount: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  exploreButton: {
    width: "100%",
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
