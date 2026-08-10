import { useState, useEffect, useRef } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { Heading } from "@/components/heading";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { isWeb } from "@/lib/platform";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebFooter } from "@/components/web-footer";
import { fetchBrandsWithImages } from "@/lib/api-vehicles";

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
export default function BrandsScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Browse Brands | Inzira';
    }
  }, []);

  const { t } = useTranslation();
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
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
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
            <Heading level={1} type="defaultSemiBold" style={styles.headerTitle}>
              {t('legal.brands.title')}
            </Heading>
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
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
              <Heading level={1} type="defaultSemiBold" style={styles.headerTitle}>
                {t('legal.brands.title')}
              </Heading>
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
                  {t('legal.brands.noBrandsTitle')}
                </ThemedText>
                <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>
                  {t('legal.brands.noBrandsDesc')}
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
                    {brand.count || 0} {brand.count === 1 ? t('legal.brands.carSingular') : t('legal.brands.carPlural')}
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
                      {t('legal.brands.explore')}
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
