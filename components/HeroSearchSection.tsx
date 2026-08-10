import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fetchBrandsWithImages, fetchModelsByBrand } from "@/lib/api-vehicles";
import { fetchCategories, type Category } from "@/lib/api-categories";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { isWeb } from "@/lib/platform";

const MILEAGE_OPTIONS = [
  { label: "Any Mileage", value: "" },
  { label: "0 - 50,000 km", value: "0-50000" },
  { label: "50,000 - 100,000 km", value: "50000-100000" },
  { label: "100,000 - 150,000 km", value: "100000-150000" },
  { label: "150,000 - 200,000 km", value: "150000-200000" },
  { label: "200,000+ km", value: "200000+" },
];

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function HeroSearchSection() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width, height } = useWindowDimensions();

  // State
  const [brands, setBrands] = useState<
    Array<{ name: string; image: string | null; count: number }>
  >([]);
  const [models, setModels] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedMileage, setSelectedMileage] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMileageDropdown, setShowMileageDropdown] = useState(false);

  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Refs for dropdown positioning
  const brandTriggerRef = useRef<View>(null);
  const modelTriggerRef = useRef<View>(null);
  const mileageTriggerRef = useRef<View>(null);

  const [brandDropdownPos, setBrandDropdownPos] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [modelDropdownPos, setModelDropdownPos] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [mileageDropdownPos, setMileageDropdownPos] =
    useState<DropdownPosition>({ top: 0, left: 0, width: 0 });

  // Responsive breakpoints
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // Only render on desktop web
  if (!isWeb || !isDesktop) {
    return null;
  }

  // Load data
  useEffect(() => {
    loadBrands();
    loadCategories();
  }, []);

  // Load models when brand changes
  useEffect(() => {
    if (selectedBrand) {
      loadModels(selectedBrand);
      setSelectedModel(""); // Reset model when brand changes
    } else {
      setModels([]);
      setSelectedModel("");
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      setIsLoadingBrands(true);
      const response = await fetchBrandsWithImages();
      if (response.status === 200) {
        setBrands(response.data.brands);
      }
    } catch (error) {
      console.error("Failed to load brands:", error);
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const loadModels = async (brand: string) => {
    try {
      setIsLoadingModels(true);
      const response = await fetchModelsByBrand(brand);
      if (response.status === 200) {
        setModels(response.data.models);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetchCategories();
      if (response.status === 200) {
        setCategories(
          response.data.categories
            .filter((cat) => cat.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  // Filtered lists for search
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const filteredModels = models.filter((model) =>
    model.toLowerCase().includes(modelSearch.toLowerCase()),
  );

  // Open dropdown handlers
  const openBrandDropdown = () => {
    if (isMobile) {
      setShowBrandDropdown(true);
    } else {
      brandTriggerRef.current?.measureInWindow((x, y, w, h) => {
        setBrandDropdownPos({ top: y + h + 4, left: x, width: w });
        setShowBrandDropdown(true);
      });
    }
  };

  const openModelDropdown = () => {
    if (!selectedBrand) return;
    if (isMobile) {
      setShowModelDropdown(true);
    } else {
      modelTriggerRef.current?.measureInWindow((x, y, w, h) => {
        setModelDropdownPos({ top: y + h + 4, left: x, width: w });
        setShowModelDropdown(true);
      });
    }
  };

  const openMileageDropdown = () => {
    if (isMobile) {
      setShowMileageDropdown(true);
    } else {
      mileageTriggerRef.current?.measureInWindow((x, y, w, h) => {
        setMileageDropdownPos({ top: y + h + 4, left: x, width: w });
        setShowMileageDropdown(true);
      });
    }
  };

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedBrand) params.append("brand", selectedBrand);
    if (selectedModel) params.append("model", selectedModel);
    if (selectedMileage) params.append("mileage", selectedMileage);
    if (selectedCategory) params.append("category", selectedCategory);

    const queryString = params.toString();
    router.push(queryString ? `/explore?${queryString}` : "/explore");
  };

  // Handle category selection
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
  };

  // Render desktop dropdown
  const renderDesktopDropdown = (
    visible: boolean,
    onClose: () => void,
    position: DropdownPosition,
    items: Array<{ label: string; value: string }>,
    onSelect: (value: string) => void,
    searchValue?: string,
    onSearchChange?: (value: string) => void,
    placeholder?: string,
    loading?: boolean,
  ) => {
    if (!visible || isMobile) return null;

    return (
      <>
        <Pressable style={styles.dropdownBackdrop} onPress={onClose} />
        <View
          style={[
            styles.desktopDropdown,
            {
              top: position.top,
              left: position.left,
              width: position.width,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {onSearchChange && (
            <View
              style={[styles.dropdownSearch, { borderColor: colors.border }]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={18}
                color={colors.icon}
              />
              <TextInput
                style={[styles.dropdownSearchInput, { color: colors.text }]}
                placeholder={placeholder || "Search..."}
                placeholderTextColor={colors.icon}
                value={searchValue}
                onChangeText={onSearchChange}
                autoFocus
              />
            </View>
          )}
          <ScrollView
            style={styles.dropdownList}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.dropdownItem}>
                <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                  Loading...
                </Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={[styles.dropdownItemText, { color: colors.icon }]}>
                  No results found
                </Text>
              </View>
            ) : (
              items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[styles.dropdownItemText, { color: colors.text }]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </>
    );
  };

  // Render mobile bottom sheet
  const renderMobileBottomSheet = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: Array<{ label: string; value: string }>,
    onSelect: (value: string) => void,
    searchValue?: string,
    onSearchChange?: (value: string) => void,
    placeholder?: string,
    loading?: boolean,
  ) => {
    if (!visible || !isMobile) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.bottomSheetClose}
              >
                <IconSymbol name="xmark" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {onSearchChange && (
              <View
                style={[
                  styles.dropdownSearch,
                  { borderColor: colors.border, marginHorizontal: 16 },
                ]}
              >
                <IconSymbol
                  name="magnifyingglass"
                  size={18}
                  color={colors.icon}
                />
                <TextInput
                  style={[styles.dropdownSearchInput, { color: colors.text }]}
                  placeholder={placeholder || "Search..."}
                  placeholderTextColor={colors.icon}
                  value={searchValue}
                  onChangeText={onSearchChange}
                />
              </View>
            )}

            <ScrollView
              style={styles.bottomSheetList}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.dropdownItem}>
                  <Text
                    style={[styles.dropdownItemText, { color: colors.text }]}
                  >
                    Loading...
                  </Text>
                </View>
              ) : items.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text
                    style={[styles.dropdownItemText, { color: colors.icon }]}
                  >
                    No results found
                  </Text>
                </View>
              ) : (
                items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <Text
                      style={[styles.dropdownItemText, { color: colors.text }]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <LinearGradient
        colors={
          theme === "dark"
            ? ["#1a237e", "#0d47a1", "#01579b"]
            : ["#0A2540", "#1E3A8A", "#1E40AF"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroSection, { height: height * 0.65 }]}
      >
        <View
          style={[styles.heroContent, { maxWidth: isDesktop ? 1200 : "100%" }]}
        >
          <Text style={styles.heroTitle}>Find Your Future Car</Text>
          <Text style={styles.heroSubtitle}>
            Browse thousands of quality vehicles
          </Text>
        </View>
      </LinearGradient>

      {/* Search Card - Overlapping */}
      <View
        style={[
          styles.searchCardContainer,
          { maxWidth: isDesktop ? 1200 : "100%" },
        ]}
      >
        <View
          style={[
            styles.searchCard,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.searchTitle, { color: colors.text }]}>
            Find Your Future Car
          </Text>

          {/* Search Inputs Row */}
          <View style={[styles.inputsRow, isMobile && styles.inputsColumn]}>
            {/* Brand */}
            <View style={styles.inputWrapper} ref={brandTriggerRef}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>
                BRAND
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={openBrandDropdown}
              >
                <Text
                  style={[
                    styles.inputValue,
                    { color: selectedBrand ? colors.text : colors.icon },
                  ]}
                >
                  {selectedBrand || "Select Brand"}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Model */}
            <View style={styles.inputWrapper} ref={modelTriggerRef}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>
                MODEL
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: selectedBrand ? 1 : 0.5,
                  },
                ]}
                onPress={openModelDropdown}
                disabled={!selectedBrand}
              >
                <Text
                  style={[
                    styles.inputValue,
                    { color: selectedModel ? colors.text : colors.icon },
                  ]}
                >
                  {isLoadingModels
                    ? "Loading..."
                    : selectedModel || "Select Model"}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Mileage */}
            <View style={styles.inputWrapper} ref={mileageTriggerRef}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>
                MILEAGE
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={openMileageDropdown}
              >
                <Text
                  style={[
                    styles.inputValue,
                    { color: selectedMileage ? colors.text : colors.icon },
                  ]}
                >
                  {MILEAGE_OPTIONS.find((opt) => opt.value === selectedMileage)
                    ?.label || "Any Mileage"}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Browse by Category */}
          {categories.length > 0 && (
            <View style={styles.browseSection}>
              <Text style={[styles.browseLabel, { color: colors.secondary }]}>
                BROWSE BY CATEGORY
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                <View style={styles.categoryChips}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          borderColor:
                            selectedCategory === category.slug
                              ? colors.primary
                              : colors.border,
                          backgroundColor:
                            selectedCategory === category.slug
                              ? colors.primary + "10"
                              : "transparent",
                        },
                      ]}
                      onPress={() => handleCategorySelect(category.slug)}
                    >
                      {category.icon && (
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                      )}
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color:
                              selectedCategory === category.slug
                                ? colors.primary
                                : colors.text,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Search Button */}
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <IconSymbol name="magnifyingglass" size={20} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>Search Cars</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Desktop Dropdowns */}
      {renderDesktopDropdown(
        showBrandDropdown,
        () => setShowBrandDropdown(false),
        brandDropdownPos,
        filteredBrands.map((brand) => ({
          label: brand.name,
          value: brand.name,
        })),
        setSelectedBrand,
        brandSearch,
        setBrandSearch,
        "Search brands...",
        isLoadingBrands,
      )}

      {renderDesktopDropdown(
        showModelDropdown,
        () => setShowModelDropdown(false),
        modelDropdownPos,
        filteredModels.map((model) => ({ label: model, value: model })),
        setSelectedModel,
        modelSearch,
        setModelSearch,
        "Search models...",
        isLoadingModels,
      )}

      {renderDesktopDropdown(
        showMileageDropdown,
        () => setShowMileageDropdown(false),
        mileageDropdownPos,
        MILEAGE_OPTIONS,
        setSelectedMileage,
      )}

      {/* Mobile Bottom Sheets */}
      {renderMobileBottomSheet(
        showBrandDropdown,
        () => setShowBrandDropdown(false),
        "Select Brand",
        filteredBrands.map((brand) => ({
          label: brand.name,
          value: brand.name,
        })),
        setSelectedBrand,
        brandSearch,
        setBrandSearch,
        "Search brands...",
        isLoadingBrands,
      )}

      {renderMobileBottomSheet(
        showModelDropdown,
        () => setShowModelDropdown(false),
        "Select Model",
        filteredModels.map((model) => ({ label: model, value: model })),
        setSelectedModel,
        modelSearch,
        setModelSearch,
        "Search models...",
        isLoadingModels,
      )}

      {renderMobileBottomSheet(
        showMileageDropdown,
        () => setShowMileageDropdown(false),
        "Select Mileage Range",
        MILEAGE_OPTIONS,
        setSelectedMileage,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  heroSection: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heroContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    ...Platform.select({
      web: {
        fontSize: 56,
      },
      default: {
        fontSize: 36,
      },
    }),
  },
  heroSubtitle: {
    fontWeight: "400",
    color: "#E0E7FF",
    textAlign: "center",
    ...Platform.select({
      web: {
        fontSize: 24,
      },
      default: {
        fontSize: 18,
      },
    }),
  },
  searchCardContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: -80,
    alignSelf: "center",
    zIndex: 10,
  },
  searchCard: {
    borderRadius: 16,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    ...Platform.select({
      web: {
        padding: 32,
      },
    }),
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    ...Platform.select({
      web: {
        fontSize: 28,
      },
    }),
  },
  inputsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  inputsColumn: {
    flexDirection: "column",
  },
  inputWrapper: {
    flex: 1,
    minWidth: 200,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 52,
  },
  inputValue: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  browseSection: {
    marginBottom: 24,
  },
  browseLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: 1,
  },
  categoryScroll: {
    marginHorizontal: -4,
  },
  categoryChips: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 8,
    ...Platform.select({
      web: {
        paddingVertical: 18,
      },
    }),
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  desktopDropdown: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
    maxHeight: 320,
  },
  dropdownSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 4,
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
      },
    }),
  },
  dropdownList: {
    maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CCC",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  bottomSheetClose: {
    padding: 4,
  },
  bottomSheetList: {
    maxHeight: 400,
  },
});
