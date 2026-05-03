import {
  StyleSheet,
  View,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { isWeb } from "@/lib/platform";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { VEHICLE_BRAND_OPTIONS } from "@/constants/vehicle-brands";
import { fetchModelsByBrand } from "@/lib/api-vehicles";
import type { Category } from "@/lib/api-categories";

interface HeroSectionProps {
  categories: Category[];
}

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

  if (!isWeb || width < 768) return null;

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

  // Filtered options
  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    if (!query) return VEHICLE_BRAND_OPTIONS;
    return VEHICLE_BRAND_OPTIONS.filter((b) => b.toLowerCase().includes(query));
  }, [brandSearch]);

  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return availableModels;
    return availableModels.filter((m) => m.toLowerCase().includes(query));
  }, [modelSearch, availableModels]);

  // Dropdown positioning
  const openBrandDropdown = () => {
    setBrandSearch("");
    setShowBrandDropdown(true);
    if (isWeb && brandTriggerRef.current) {
      const el = brandTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setBrandDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const openModelDropdown = () => {
    if (!selectedBrand) return;
    setModelSearch("");
    setShowModelDropdown(true);
    if (isWeb && modelTriggerRef.current) {
      const el = modelTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setModelDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const openMileageDropdown = () => {
    setShowMileageDropdown(true);
    if (isWeb && mileageTriggerRef.current) {
      const el = mileageTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setMileageDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

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
    }, 3000);
  };

  const renderDropdown = (
    show: boolean,
    position: { top: number; left: number; width: number } | null,
    onClose: () => void,
    children: React.ReactNode,
  ) => {
    if (!show || !isWeb) return null;

    return (
      <Modal transparent visible={show} onRequestClose={onClose}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.dropdown,
            {
              top: position?.top,
              left: position?.left,
              width: position?.width,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {children}
        </View>
      </Modal>
    );
  };

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
        <ThemedText style={styles.heroTitle}>
            Welcome To Inzira
          </ThemedText>
          <View style={styles.heroTag}>
            <ThemedText style={styles.heroTagText}>The Verified Car Marketplace</ThemedText>
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
            backgroundColor: colors.card,
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryTabs, { borderBottomColor: colors.border }]}
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
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Inputs Row */}
        <View style={[styles.inputsRow, { borderBottomColor: colors.border }]}>
          {/* Brand Dropdown */}
          <View
            style={[styles.inputWrapper, { flex: 1 }]}
            ref={brandTriggerRef}
          >
            <TouchableOpacity
              style={[
                styles.input,
                {
                  borderColor: (showBrandDropdown || (selectedBrand && selectedBrand !== "")) ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  borderWidth: (showBrandDropdown || (selectedBrand && selectedBrand !== "")) ? 2 : 1
                },
              ]}
              onPress={openBrandDropdown}
              activeOpacity={0.85}
            >
              <ThemedText style={[styles.inputLabel, { color: colors.icon }]}>
                Brand
              </ThemedText>
              <View style={styles.inputValueRow}>
                <ThemedText style={[styles.inputValue, { color: selectedBrand ? colors.text : colors.icon }]} numberOfLines={1}>
                  {selectedBrand || "All brands"}
                </ThemedText>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Model Dropdown */}
          <View
            style={[styles.inputWrapper, { flex: 1 }]}
            ref={modelTriggerRef}
          >
            <TouchableOpacity
              style={[
                styles.input,
                {
                  borderColor: (showModelDropdown || (selectedModel && selectedBrand !== "")) ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  opacity: selectedBrand ? 1 : 0.5,
                  borderWidth: (showModelDropdown || (selectedModel && selectedBrand !== "")) ? 2 : 1
                },
              ]}
              onPress={openModelDropdown}
              activeOpacity={selectedBrand ? 0.85 : 1}
              disabled={!selectedBrand}
            >
              <ThemedText style={[styles.inputLabel, { color: colors.icon }]}>
                Model
              </ThemedText>
              <View style={styles.inputValueRow}>
                <ThemedText style={[styles.inputValue, { color: selectedModel ? colors.text : colors.icon }]} numberOfLines={1}>
                  {isLoadingModels
                    ? "Loading..."
                    : selectedModel || "All models"}
                </ThemedText>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Mileage Dropdown */}
          <View
            style={[styles.inputWrapper, { flex: 1 }]}
            ref={mileageTriggerRef}
          >
            <TouchableOpacity
              style={[
                styles.input,
                {
                  borderColor: (showMileageDropdown || selectedMileage !== "Any") ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  borderWidth: (showMileageDropdown || selectedMileage !== "Any") ? 2 : 1,
                  opacity: selectedMileage === "Any" ? 0.5 : 1,
                },
              ]}
              onPress={openMileageDropdown}
              activeOpacity={0.85}
            >
              <ThemedText style={[styles.inputLabel, { color: colors.icon }]}>
                Mileage
              </ThemedText>
              <View style={styles.inputValueRow}>
                <ThemedText style={[styles.inputValue, { color: selectedMileage !== "Any" ? colors.text : colors.icon }]} numberOfLines={1}>
                  {selectedMileage}
                </ThemedText>
                <IconSymbol name="chevron.down" size={14} color={colors.icon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              {
                backgroundColor: colors.primary,
                opacity: isSearching ? 0.8 : 1,
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
                  Search Cars
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
                  borderColor: colors.border,
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
                placeholder="Search brands..."
                placeholderTextColor={colors.icon}
                style={[styles.dropdownSearchInput, { color: colors.text }]}
                autoFocus
              />
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
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
                  All brands
                </ThemedText>
              </TouchableOpacity>
              {filteredBrands.map((brand) => (
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
                  borderColor: colors.border,
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
                placeholder="Search models..."
                placeholderTextColor={colors.icon}
                style={[styles.dropdownSearchInput, { color: colors.text }]}
                autoFocus
              />
            </View>
            <ScrollView
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
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
                  All models
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
            showsVerticalScrollIndicator={false}
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
                  {mileage}
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
          <ThemedText style={[styles.browseLabel, { color: colors.icon }]}>
            Browse by category
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.browseChips}
          >
            {categories?.slice(0, 8).map((cat, index) => {
              // Cute color palette for different categories
              const colorPalette = [
                { bg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.12)', icon: '#16A34A' }, // Green
                { bg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)', icon: '#2563EB' }, // Blue
                { bg: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.12)', icon: '#9333EA' }, // Purple
                { bg: isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.12)', icon: '#DB2777' }, // Pink
                { bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)', icon: '#D97706' }, // Orange
                { bg: isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.12)', icon: '#0D9488' }, // Teal
                { bg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)', icon: '#4F46E5' }, // Indigo
                { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)', icon: '#DC2626' }, // Red
              ];
              const catColors = colorPalette[index % colorPalette.length];

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
                    <IconSymbol
                      name={(cat.icon || "car.fill") as any}
                      size={18}
                      color={catColors.icon}
                    />
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
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
    position: "relative",
  },
  categoryTabs: {
    flexDirection: "row",
    gap: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {

    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 56,
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputValue: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 10,
    height: 56,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  dropdown: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 1000,
    maxHeight: 350,
  },
  dropdownSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  dropdownList: {
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  browseSection: {
    marginTop: 16,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default HeroSection;
