import { StyleSheet, View, TouchableOpacity, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { createPortal } from "react-dom";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { Heading } from "@/components/heading";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { isWeb } from "@/lib/platform";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { filterBrandGroups } from "@/constants/vehicle-brands";
import { fetchModelsByBrand } from "@/lib/api-vehicles";
import type { Category } from "@/lib/api-categories";
import { useTranslation } from "react-i18next";
import { OnboardingHint } from "@/components/onboarding-hint";

interface HeroSectionProps {
  categories: Category[];
}

// Custom category icon images — used when a category's fuel-type icon has a matching
// custom asset. Falls back to the existing IconSymbol mapping when not present.
const CATEGORY_ICON_IMAGES: Record<string, any> = {
  "car.fill": require('@/assets/customericons/petrol-pump.png'),
  "fuelpump.fill": require('@/assets/customericons/petrol-pump.png'),
  "drop.fill": require('@/assets/customericons/diesel.png'),
  "leaf.fill": require('@/assets/customericons/hybrid.png'),
  "bolt.car.fill": require('@/assets/customericons/chargingelectric.png'),

};

const MILEAGE_OPTIONS = [
  "Any",
  "0 - 10,000 km",
  "10,000 - 30,000 km",
  "30,000 - 50,000 km",
  "50,000 - 80,000 km",
  "80,000 - 100,000 km",
  "100,000 - 150,000 km",
  "150,000+ km",
];

export function HeroSection({ categories }: HeroSectionProps) {
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === "dark";
  const { width } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState<string>("Cars");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedMileage, setSelectedMileage] = useState<string>("Any");

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredField, setHoveredField] = useState<
    "brand" | "model" | "mileage" | null
  >(null);

  // Dropdown states
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMileageDropdown, setShowMileageDropdown] = useState(false);

  // Search queries
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  // Refs for positioning
  const brandTriggerRef = useRef<View>(null);
  const modelTriggerRef = useRef<View>(null);
  const mileageTriggerRef = useRef<View>(null);
  // The rendered dropdown panel — used to tell inside clicks from outside ones.
  const dropdownPanelRef = useRef<View>(null);

  const [brandDropdownPos, setBrandDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [modelDropdownPos, setModelDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mileageDropdownPos, setMileageDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const fieldActiveBg = isDark ? "rgba(96,165,250,0.14)" : "rgba(37,99,235,0.06)";
  const fieldIconBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.045)";

  const isTabletWeb = width >= 768 && width < 1024;
  const isLg = width >= 1024 && width < 1440;
  const isXl = width >= 1440 && width < 1920;
  const is2Xl = width >= 1920;

  const heroPadding = is2Xl
    ? 200
    : isXl
      ? 120
      : isLg
        ? 80
        : isTabletWeb
          ? 40
          : 24;

  const categoryTabs = [
    "Cars",
    ...(categories?.slice(0, 6).map((c) => c.name) || []),
  ];

  // Fetch models when brand changes
  useEffect(() => {
    if (selectedBrand) {
      setIsLoadingModels(true);
      fetchModelsByBrand(selectedBrand)
        .then((res) => {
          setAvailableModels(res.data.models || []);
        })
        .catch(() => {
          setAvailableModels([]);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    } else {
      setAvailableModels([]);
    }
    setSelectedModel("");
  }, [selectedBrand]);

  // Reset all states when screen comes into focus (navigation back)
  useFocusEffect(
    useCallback(() => {
      setIsSearching(false);
      setSelectedCategory("Cars");
      setSelectedBrand("");
      setSelectedModel("");
      setSelectedMileage("Any");
      setBrandSearch("");
      setModelSearch("");
      setShowBrandDropdown(false);
      setShowModelDropdown(false);
      setShowMileageDropdown(false);
      setAvailableModels([]);
    }, [])
  );

  // Brands grouped by origin (Japanese, Korean, …) for the picker. Grouping is
  // display-only — the value stored/searched is still the plain brand name.
  const filteredBrandGroups = useMemo(() => filterBrandGroups(brandSearch), [brandSearch]);

  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return availableModels;
    return availableModels.filter((m) => m.toLowerCase().includes(query));
  }, [modelSearch, availableModels]);

  // Dropdown positioning. Panels are portaled to <body> and positioned with
  // `position: fixed`, so the measurement is viewport-relative (no scroll
  // offset) and gets re-taken while the page scrolls — see the effect below.
  const measureTrigger = (
    ref: React.RefObject<View | null>,
    setPos: (pos: { top: number; left: number; width: number }) => void,
  ) => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  const closeAllDropdowns = () => {
    setShowBrandDropdown(false);
    setShowModelDropdown(false);
    setShowMileageDropdown(false);
  };

  const openBrandDropdown = () => {
    if (showBrandDropdown) {
      setShowBrandDropdown(false);
      return;
    }
    setBrandSearch("");
    closeAllDropdowns();
    setShowBrandDropdown(true);
    measureTrigger(brandTriggerRef, setBrandDropdownPos);
  };

  const openModelDropdown = () => {
    if (!selectedBrand) return;
    if (showModelDropdown) {
      setShowModelDropdown(false);
      return;
    }
    setModelSearch("");
    closeAllDropdowns();
    setShowModelDropdown(true);
    measureTrigger(modelTriggerRef, setModelDropdownPos);
  };

  const openMileageDropdown = () => {
    if (showMileageDropdown) {
      setShowMileageDropdown(false);
      return;
    }
    closeAllDropdowns();
    setShowMileageDropdown(true);
    measureTrigger(mileageTriggerRef, setMileageDropdownPos);
  };

  const activeDropdown = showBrandDropdown
    ? "brand"
    : showModelDropdown
      ? "model"
      : showMileageDropdown
        ? "mileage"
        : null;

  // Keep the open panel glued to its field while the page scrolls or resizes.
  // The page scrolls inside a ScrollView, whose scroll event doesn't bubble —
  // hence the capture-phase listener on document.
  useEffect(() => {
    if (!isWeb || !activeDropdown) return;

    const sync = () => {
      if (activeDropdown === "brand") measureTrigger(brandTriggerRef, setBrandDropdownPos);
      else if (activeDropdown === "model") measureTrigger(modelTriggerRef, setModelDropdownPos);
      else measureTrigger(mileageTriggerRef, setMileageDropdownPos);
    };

    sync();
    document.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      document.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [activeDropdown]);

  // Close on outside click / Escape. Done with document listeners rather than a
  // full-screen backdrop so nothing sits over the page swallowing wheel events.
  useEffect(() => {
    if (!isWeb || !activeDropdown) return;

    const isInside = (ref: React.RefObject<View | null>, target: Node) => {
      const el = ref.current as unknown as HTMLElement | null;
      return !!el?.contains?.(target);
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        isInside(dropdownPanelRef, target) ||
        isInside(brandTriggerRef, target) ||
        isInside(modelTriggerRef, target) ||
        isInside(mileageTriggerRef, target)
      ) {
        return;
      }
      closeAllDropdowns();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAllDropdowns();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeDropdown]);

  const goToExplore = () => {
    setIsSearching(true);

    setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "Cars") {
        params.set("category", selectedCategory);
      }
      if (selectedBrand) {
        params.set("brand", selectedBrand);
      }
      if (selectedModel) {
        params.set("model", selectedModel);
      }
      if (selectedMileage && selectedMileage !== "Any") {
        params.set("mileage", selectedMileage);
      }
      const query = params.toString();
      router.push(`/explore${query ? `?${query}` : ""}` as any);
    }, 600);
  };

  const renderDropdown = (
    show: boolean,
    position: { top: number; left: number; width: number } | null,
    onClose: () => void,
    children: React.ReactNode,
  ) => {
    if (!show || !isWeb || !position || typeof document === "undefined") return null;

    // Portaled to <body> so the panel escapes the search card's overflow and
    // stacking context while the page underneath stays scrollable.
    return createPortal(
      <View
        ref={dropdownPanelRef}
        style={[
          styles.dropdown,
          {
            top: position.top,
            left: position.left,
            width: position.width,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {children}
      </View>,
      document.body,
    );
  };

  if (!isWeb || width < 768) return null;

  return (
    <View style={styles.container}>
      {/* Hero Banner */}
      <View style={styles.heroWrapper}>
        <View
          style={[
            styles.heroLeft,
            { backgroundColor: isDark ? '#1E3A5F' : colors.primary, paddingHorizontal: heroPadding },
          ]}
        >
          <Heading level={1} style={styles.heroTitle}>
            {t('hero.welcomeTitle')}
          </Heading>
          <View style={styles.heroTag}>
            <ThemedText style={styles.heroTagText}>{t('hero.tagline')}</ThemedText>
          </View>

        </View>

        <View style={styles.heroRight}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=90",
            }}
            style={styles.heroImage}
            contentFit="cover"
          />
        </View>
      </View>

      {/* Mega Search Card */}
      <View
        style={[
          styles.searchCard,
          {
            // Light mode: page canvas is pure white, so the card needs a fill
            // that's visibly off-white or it disappears into the page.
            backgroundColor: isDark ? colors.card : '#F3F5F8',
            borderColor: isDark ? colors.border : '#D8DDE6',
            marginHorizontal: is2Xl
              ? 200
              : isXl
                ? 120
                : isLg
                  ? 80
                  : isTabletWeb
                    ? 40
                    : 24,
          },
        ]}
      >
        {/* Category Tabs */}
        <View style={{ position: 'relative', zIndex: 999999 }}>
          {/* Painted first so it sits underneath the tabs — it shares the same
              bottom edge as each tab's own border, and rendering it after the
              ScrollView (as before) drew it on top, masking the active tab's
              colored underline. */}
          <View style={[styles.tabsDivider, { backgroundColor: colors.border }]} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabs}
          >
            {categoryTabs.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat && {
                    borderBottomColor: colors.primary,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.categoryTabText,
                    { color: selectedCategory === cat ? colors.primary : colors.text },
                  ]}
                >
                  {cat === "Cars" ? t('categories.cars') : cat}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <OnboardingHint
            id="mega-search"
            text={t('hero.megaSearchHint')}
            icon="magnifyingglass"
            placement="bottom"
            align="right"
                   style={styles.browseTabHintOffset}
          />
        </View>

        {/* Search Inputs Row */}
        <View style={[styles.inputsRow, { borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.fieldsBar,
              {
                backgroundColor: colors.background,
                borderColor:
                  showBrandDropdown || showModelDropdown || showMileageDropdown || hoveredField
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            {/* Brand Dropdown */}
            <View style={{ flex: 1 }} ref={brandTriggerRef}>
              <Pressable
                style={[
                  styles.field,
                  {
                    backgroundColor:
                      showBrandDropdown || selectedBrand || hoveredField === "brand"
                        ? fieldActiveBg
                        : "transparent",
                  },
                ]}
                onPress={openBrandDropdown}
                onHoverIn={() => setHoveredField("brand")}
                onHoverOut={() => setHoveredField(null)}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: selectedBrand ? colors.primary : fieldIconBg },
                  ]}
                >
                  <IconSymbol
                    name="car.fill"
                    size={15}
                    color={selectedBrand ? "#fff" : colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.fieldLabel,
                      { color: selectedBrand ? colors.primary : colors.icon },
                    ]}
                  >
                    {t('hero.brand')}
                  </ThemedText>
                  <ThemedText
                    style={[styles.fieldValue, { color: selectedBrand ? colors.text : colors.icon }]}
                    numberOfLines={1}
                  >
                    {selectedBrand || t('hero.allBrands')}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </Pressable>
              <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
            </View>

            {/* Model Dropdown */}
            <View style={{ flex: 1 }} ref={modelTriggerRef}>
              <Pressable
                style={[
                  styles.field,
                  {
                    backgroundColor:
                      showModelDropdown || selectedModel || hoveredField === "model"
                        ? fieldActiveBg
                        : "transparent",
                    opacity: selectedBrand ? 1 : 0.55,
                  },
                ]}
                onPress={openModelDropdown}
                onHoverIn={() => selectedBrand && setHoveredField("model")}
                onHoverOut={() => setHoveredField(null)}
                disabled={!selectedBrand}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: selectedModel ? colors.primary : fieldIconBg },
                  ]}
                >
                  <IconSymbol
                    name="list.bullet"
                    size={15}
                    color={selectedModel ? "#fff" : colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.fieldLabel,
                      { color: selectedModel ? colors.primary : colors.icon },
                    ]}
                  >
                    {t('hero.model')}
                  </ThemedText>
                  <ThemedText
                    style={[styles.fieldValue, { color: selectedModel ? colors.text : colors.icon }]}
                    numberOfLines={1}
                  >
                    {isLoadingModels
                      ? t('hero.loadingModels')
                      : selectedModel || t('hero.allModels')}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </Pressable>
              <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
            </View>

            {/* Mileage Dropdown */}
            <View style={{ flex: 1 }} ref={mileageTriggerRef}>
              <Pressable
                style={[
                  styles.field,
                  {
                    backgroundColor:
                      showMileageDropdown || selectedMileage !== "Any" || hoveredField === "mileage"
                        ? fieldActiveBg
                        : "transparent",
                  },
                ]}
                onPress={openMileageDropdown}
                onHoverIn={() => setHoveredField("mileage")}
                onHoverOut={() => setHoveredField(null)}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: selectedMileage !== "Any" ? colors.primary : fieldIconBg },
                  ]}
                >
                  <IconSymbol
                    name="gauge"
                    size={15}
                    color={selectedMileage !== "Any" ? "#fff" : colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.fieldLabel,
                      { color: selectedMileage !== "Any" ? colors.primary : colors.icon },
                    ]}
                  >
                    {t('hero.mileage')}
                  </ThemedText>
                  <ThemedText
                    style={[styles.fieldValue, { color: selectedMileage !== "Any" ? colors.text : colors.icon }]}
                    numberOfLines={1}
                  >
                    {selectedMileage === "Any" ? t('hero.mileageAny') : selectedMileage}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </Pressable>
            </View>
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              {
                backgroundColor: colors.primary,
                opacity: isSearching ? 0.6 : 1,
              },
            ]}
            onPress={goToExplore}
            activeOpacity={0.85}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol name="magnifyingglass" size={18} color="#fff" />
                <ThemedText style={styles.searchButtonText}>
                  {t('hero.searchCars')}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Brand Dropdown Content */}
        {renderDropdown(
          showBrandDropdown,
          brandDropdownPos,
          () => setShowBrandDropdown(false),
          <>
            <View
              style={[
                styles.dropdownSearch,
                {
                  backgroundColor: colors.background,
                },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={14}
                color={colors.icon}
              />
              <TextInput
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder={t('hero.searchBrandsPlaceholder')}
                placeholderTextColor={colors.icon}
                style={[styles.dropdownSearchInput, { color: colors.text }]}
                autoFocus
              />
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={true}
            >
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedBrand("");
                  setShowBrandDropdown(false);
                }}
              >
                <ThemedText
                  style={{ color: colors.primary, fontWeight: "700" }}
                >
                  {t('hero.allBrands')}
                </ThemedText>
              </TouchableOpacity>
              {filteredBrandGroups.map((group) => (
                <View key={group.region}>
                  <ThemedText style={[styles.brandGroupHeader, { color: colors.icon }]}>
                    {group.region}
                  </ThemedText>
                  {group.brands.map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => {
                        setSelectedBrand(brand);
                        setShowBrandDropdown(false);
                      }}
                    >
                      <ThemedText
                        style={{
                          color:
                            selectedBrand === brand ? colors.primary : colors.text,
                          fontWeight: selectedBrand === brand ? "700" : "400",
                        }}
                      >
                        {brand}
                      </ThemedText>
                      {selectedBrand === brand && (
                        <IconSymbol
                          name="checkmark"
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </>,
        )}

        {/* Model Dropdown Content */}
        {renderDropdown(
          showModelDropdown,
          modelDropdownPos,
          () => setShowModelDropdown(false),
          <>
            <View
              style={[
                styles.dropdownSearch,
                {
                  backgroundColor: colors.background,
                },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={14}
                color={colors.icon}
              />
              <TextInput
                value={modelSearch}
                onChangeText={setModelSearch}
                placeholder={t('hero.searchModelsPlaceholder')}
                placeholderTextColor={colors.icon}
                style={[styles.dropdownSearchInput, { color: colors.text }]}
                autoFocus
              />
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={true}
            >
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedModel("");
                  setShowModelDropdown(false);
                }}
              >
                <ThemedText
                  style={{ color: colors.primary, fontWeight: "700" }}
                >
                  {t('hero.allModels')}
                </ThemedText>
              </TouchableOpacity>
              {filteredModels.map((model) => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setSelectedModel(model);
                    setShowModelDropdown(false);
                  }}
                >
                  <ThemedText
                    style={{
                      color:
                        selectedModel === model ? colors.primary : colors.text,
                      fontWeight: selectedModel === model ? "700" : "400",
                    }}
                  >
                    {model}
                  </ThemedText>
                  {selectedModel === model && (
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>,
        )}

        {/* Mileage Dropdown Content */}
        {renderDropdown(
          showMileageDropdown,
          mileageDropdownPos,
          () => setShowMileageDropdown(false),
          <ScrollView
            style={styles.dropdownList}
            showsVerticalScrollIndicator={true}
          >
            {MILEAGE_OPTIONS.map((mileage) => (
              <TouchableOpacity
                key={mileage}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  setSelectedMileage(mileage);
                  setShowMileageDropdown(false);
                }}
              >
                <ThemedText
                  style={{
                    color:
                      selectedMileage === mileage
                        ? colors.primary
                        : colors.text,
                    fontWeight: selectedMileage === mileage ? "700" : "400",
                  }}
                >
                  {mileage === "Any" ? t('hero.mileageAny') : mileage}
                </ThemedText>
                {selectedMileage === mileage && (
                  <IconSymbol
                    name="checkmark"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>,
        )}

        {/* Browse by Category */}
        <View style={styles.browseSection}>
          <View style={{ position: 'relative', alignSelf: 'flex-start', zIndex: 999999 }}>
            <ThemedText style={[styles.browseLabel, { color: colors.icon }]}>
              {t('hero.browseByCategory')}
            </ThemedText>
            <OnboardingHint
              id="browse-category-desktop"
              text={t('home.browseByCategoryHint')}
              icon="square.grid.2x2"
              placement="bottom"
              align="left"
              style={styles.browseCategoryHintOffset}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.browseChips}
          >
            {categories?.slice(0, 8).map((cat, index) => {
              // Cute color palette for different categories
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
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.name);
                    router.push(`/category/${cat.slug}` as any);
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.iconContainer,
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
                  <ThemedText style={styles.browseChipText}>
                    {cat.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    zIndex: 999999,
  },
  heroWrapper: {
    width: "100%",
    height: 340,
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
  },
  heroLeft: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
    zIndex: 2,
    clipPath: "polygon(0 0, 100% 0, 97% 100%, 0 100%)",
  } as any,
  heroTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  heroTagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
    color: "#fff",
    marginBottom: 8,
  },
  heroRight: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    clipPath: "polygon(3.5% 0, 100% 0, 100% 100%, 0% 100%)",
    borderLeftWidth: 3,
    borderLeftColor: "#fff",
  } as any,
  heroImage: {
    width: "100%",
    height: "100%",
  },
  searchCard: {
    marginTop: -70,
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 999999,
    position: "relative",
  },
  categoryTabs: {
    flexDirection: "row",
    gap: 4,
    paddingBottom: 0,
  },
  categoryTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    paddingBottom: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
    marginRight: 4,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabsDivider: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    width: "100%",
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    marginTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  fieldsBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 64,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldDivider: {
    position: "absolute",
    right: 0,
    top: 12,
    bottom: 12,
    width: 1,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
    borderRadius: 14,
    height: 64,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dropdown: {
    // `fixed` (not `absolute`): the panel is portaled to <body> and anchored to
    // viewport coordinates that are re-measured on scroll.
    position: "fixed",
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 24,
    zIndex: 1000,
    maxHeight: 380,
    overflow: "hidden",
  },
  dropdownSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: "none",
  } as any,
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0,
  },
  brandGroupHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    opacity: 0.7,
  },
  browseSection: {
    marginTop: 16,
    position: "relative",
    zIndex: 10,
  },
  browseCategoryHintOffset: {
    marginTop: 62,
  },
  browseTabHintOffset:{
    marginTop:100,
    zIndex:999999
  },
  browseLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  browseChips: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
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
  browseChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default HeroSection;
