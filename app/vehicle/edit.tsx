import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { fetchVehicleById, updateVehicle } from "@/lib/api-vehicles";
import type { Vehicle } from "@/types/vehicle";
import { getAuthUser, logout } from "@/lib/userPreference";
import { fetchCategories, type Category } from "@/lib/api-categories";
import { Image } from "expo-image";
import { resolveImageUrl } from "@/lib/image-url";
import { VEHICLE_BRAND_OPTIONS } from "@/constants/vehicle-brands";

const USAGE_STATUS_OPTIONS = [
  "Brand New",
  "Imported Used",
  "Used In Rwanda",
] as const;
const PRIMARY_COLOR_OPTIONS = [
  "Pearl White",
  "Silver",
  "Black",
  "Red",
  "Blue",
  "Gray",
  "White",
  "Green",
  "Yellow",
  "Orange",
  "Brown",
  "Gold",
  "Beige",
  "Navy",
  "Purple",
] as const;

const FUEL_TYPE_OPTIONS = [
  "Petrol",
  "Diesel",
  "Hybrid",
  "Electric",
  "CNG",
  "LPG",
] as const;
const TRANSMISSION_OPTIONS = [
  "Automatic",
  "Manual",
  "Semi-Automatic",
  "CVT",
] as const;
const DRIVE_TYPE_OPTIONS = [
  "Front Wheel Drive (FWD)",
  "Rear Wheel Drive (RWD)",
  "All Wheel Drive (AWD)",
  "4x4 / 4WD",
] as const;

const BODY_TYPE_OPTIONS = [
  "SUVs & Crossovers",
  "Trucks",
  "Sedans",
  "Coupes",
  "Minivans",
  "Hatchbacks",
  "Convertibles",
  "Station wagons",
] as const;

export default function EditVehicleScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Edit Listing | Inzira';
    }
  }, []);

  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;

  const editContainerMaxWidth = isWebXl
    ? 980
    : isWebLg
      ? 920
      : isWebMd
        ? 840
        : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;
  const selectorSheetHeight = Math.min(
    560,
    Math.max(420, Math.round(height * 0.72)),
  );
  const isDark = theme === "dark";
  const skeletonBase = isDark ? "#1F2937" : "#E5E7EB";
  const skeletonSoft = isDark ? "#111827" : "#F3F4F6";

  // Form state - initialized empty, populated from vehicle data
  const [listingTitle, setListingTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [vehicleCategoryHint, setVehicleCategoryHint] = useState<{
    id?: string;
    slug?: string;
    name?: string;
  } | null>(null);
  const [color, setColor] = useState("");
  const [transmission, setTransmission] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [vehicleIdentificationDoc, setVehicleIdentificationDoc] = useState<
    string | null
  >(null);

  // Fuel Type selector
  const [showFuelTypeSelector, setShowFuelTypeSelector] = useState(false);
  const [fuelTypeDropdownPos, setFuelTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const fuelTypeTriggerRef = useRef<View>(null);

  // Transmission selector
  const [showTransmissionSelector, setShowTransmissionSelector] =
    useState(false);
  const [transmissionDropdownPos, setTransmissionDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const transmissionTriggerRef = useRef<View>(null);

  // Drive type selector
  const [showDriveTypeSelector, setShowDriveTypeSelector] = useState(false);
  const [driveTypeDropdownPos, setDriveTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const driveTypeTriggerRef = useRef<View>(null);

  // Body Type selector
  const [showBodyTypeSelector, setShowBodyTypeSelector] = useState(false);
  const [bodyTypeSearch, setBodyTypeSearch] = useState("");
  const [bodyTypeDropdownPos, setBodyTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const bodyTypeTriggerRef = useRef<View>(null);

  const [status, setStatus] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const colorTriggerRef = useRef<View>(null);

  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownPos, setCategoryDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const categoryTriggerRef = useRef<View>(null);

  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandDropdownPos, setBrandDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const brandTriggerRef = useRef<View>(null);

  const filteredColorOptions = useMemo(() => {
    const query = colorSearch.trim().toLowerCase();
    if (!query) {
      return PRIMARY_COLOR_OPTIONS;
    }
    return PRIMARY_COLOR_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [colorSearch]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categorySearch, categories]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    if (!query) {
      return VEHICLE_BRAND_OPTIONS;
    }
    return VEHICLE_BRAND_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [brandSearch]);

  const filteredBodyTypes = useMemo(() => {
    const query = bodyTypeSearch.trim().toLowerCase();
    if (!query) {
      return BODY_TYPE_OPTIONS;
    }
    return BODY_TYPE_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [bodyTypeSearch]);

  const filteredFuelTypes = useMemo(() => {
    const selectedCat = categories.find((c) => c.id === selectedCategoryId);
    if (!selectedCat) return FUEL_TYPE_OPTIONS;

    const name = selectedCat.name?.toLowerCase() || "";

    if (name === "full electric car" || name === "electric motorcycle") {
      return ["Electric"];
    } else if (name === "petrol car") {
      return ["Petrol"];
    } else if (name === "hybrid car") {
      return ["Hybrid"];
    } else if (name === "motorcycle" || name === "scooter") {
      return ["Petrol"];
    } else if (name === "truck" || name === "bus") {
      return ["Diesel"];
    }
    // For "Other" or any other category, show all options
    return FUEL_TYPE_OPTIONS;
  }, [selectedCategoryId, categories]);

  const openColorSelector = () => {
    setColorSearch("");
    setShowColorSelector(true);
    // Calculate position for portal dropdown on web
    if (isWeb && colorTriggerRef.current) {
      // On web, ref.current is the actual DOM element
      const el = colorTriggerRef.current as unknown as HTMLElement;
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const handleSelectColor = (selected: string) => {
    setColor(selected);
    setShowColorSelector(false);
  };

  const openCategorySelector = () => {
    setCategorySearch("");
    setShowCategorySelector(true);
    // Calculate position for portal dropdown on web
    if (isWeb && categoryTriggerRef.current) {
      const el = categoryTriggerRef.current as unknown as HTMLElement;
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setCategoryDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setShowCategorySelector(false);
    // Auto-fill fuel type and transmission based on category
    const selectedCat = categories.find((c) => c.id === catId);
    if (selectedCat) {
      const name = selectedCat.name?.toLowerCase() || "";
      if (name === "full electric car" || name === "electric motorcycle") {
        setFuelType("Electric");
        setTransmission("Automatic");
      } else if (name === "petrol car") {
        setFuelType("Petrol");
        setTransmission("Automatic");
      } else if (name === "hybrid car") {
        setFuelType("Hybrid");
        setTransmission("Automatic");
      } else if (name === "motorcycle" || name === "scooter") {
        setFuelType("Petrol");
        setTransmission("Manual");
      } else if (name === "truck" || name === "bus") {
        setFuelType("Diesel");
        setTransmission("Manual");
      }
      // For "Other" or any other category, leave as is (user selects)
    }
  };

  const openBrandSelector = () => {
    setBrandSearch("");
    setShowBrandSelector(true);
    if (isWeb && brandTriggerRef.current) {
      const el = brandTriggerRef.current as unknown as HTMLElement;
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setBrandDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const handleSelectBrand = (selected: string) => {
    setBrand(selected);
    setShowBrandSelector(false);
  };

  const openFuelTypeSelector = () => {
    setShowFuelTypeSelector(true);
    if (isWeb && fuelTypeTriggerRef.current) {
      const el = fuelTypeTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setFuelTypeDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };
  const handleSelectFuelType = (value: string) => {
    setFuelType(value);
    setShowFuelTypeSelector(false);
  };

  const openTransmissionSelector = () => {
    setShowTransmissionSelector(true);
    if (isWeb && transmissionTriggerRef.current) {
      const el = transmissionTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setTransmissionDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };
  const handleSelectTransmission = (value: string) => {
    setTransmission(value);
    setShowTransmissionSelector(false);
  };

  const openDriveTypeSelector = () => {
    setShowDriveTypeSelector(true);
    if (isWeb && driveTypeTriggerRef.current) {
      const el = driveTypeTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setDriveTypeDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };
  const handleSelectDriveType = (value: string) => {
    setDriveType(value);
    setShowDriveTypeSelector(false);
  };

  const openBodyTypeSelector = () => {
    setBodyTypeSearch("");
    setShowBodyTypeSelector(true);
    if (isWeb && bodyTypeTriggerRef.current) {
      const el = bodyTypeTriggerRef.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        setBodyTypeDropdownPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }
  };

  const handleSelectBodyType = (value: string) => {
    setBodyType(value);
    setShowBodyTypeSelector(false);
  };

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat?.name || "";
  }, [categories, selectedCategoryId]);

  // Load vehicle data
  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadData = async () => {
      try {
        const res = await fetchVehicleById(id);
        const vehicle = res.data.vehicle;
        if (vehicle) {
          const normalizedVehicleBrand = String(vehicle.brand || "")
            .trim()
            .toLowerCase();
          const matchedBrandOption = VEHICLE_BRAND_OPTIONS.find(
            (option) => option.toLowerCase() === normalizedVehicleBrand,
          );
          setListingTitle(vehicle.title);
          setBrand(matchedBrandOption || vehicle.brand || "");
          setModel(vehicle.model);
          setYear(vehicle.year.toString());
          setFuelType(vehicle.fuelType || "");
          const vehicleCategoryId = (vehicle as any).categoryId || "";
          const vehicleCategorySlug = (vehicle as any).categorySlug || "";
          const vehicleCategoryName =
            (vehicle as any).vehicleType || (vehicle as any).type || "";
          setSelectedCategoryId(vehicleCategoryId);
          setVehicleCategoryHint({
            id: vehicleCategoryId,
            slug: vehicleCategorySlug,
            name: vehicleCategoryName,
          });
          setColor(vehicle.color || "");
          setTransmission(vehicle.transmission || "");
          setEngineSize((vehicle as any).engineSize || "");
          setDriveType((vehicle as any).driveType || "");
          setBodyType((vehicle as any).bodyType || "");
          setVehicleIdentificationDoc(
            (vehicle as any).vehicleIdentificationDoc || null,
          );
          setStatus(vehicle.usageStatus || "");
          setMileage(vehicle.mileage?.toString() || "");
          setPrice(vehicle.price.toString());
          setDescription(vehicle.description || "");
          setImages(vehicle.images || []);
        }
      } catch (err) {
        console.error("Failed to load vehicle:", err);
        Alert.alert("Error", "Failed to load vehicle data");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (categories.length === 0 || !vehicleCategoryHint) return;

    const selectedCategoryStillValid = selectedCategoryId
      ? categories.some((cat) => cat.id === selectedCategoryId)
      : false;

    if (selectedCategoryStillValid) return;

    const normalizedSlug = vehicleCategoryHint.slug?.trim().toLowerCase();
    const normalizedName = vehicleCategoryHint.name?.trim().toLowerCase();

    const matchedCategory =
      (vehicleCategoryHint.id
        ? categories.find((cat) => cat.id === vehicleCategoryHint.id)
        : undefined) ||
      (normalizedSlug
        ? categories.find(
            (cat) =>
              String(cat.slug || "")
                .trim()
                .toLowerCase() === normalizedSlug,
          )
        : undefined) ||
      (normalizedName
        ? categories.find(
            (cat) => cat.name.trim().toLowerCase() === normalizedName,
          )
        : undefined);

    if (matchedCategory) {
      setSelectedCategoryId(matchedCategory.id);
    }
  }, [categories, selectedCategoryId, vehicleCategoryHint]);

  const handleSave = async () => {
    setSubmitMessage(null);
    if (!id) {
      setSubmitMessage({
        type: "error",
        text: "Missing listing id. Please reopen this page and try again.",
      });
      return;
    }

    const missing: string[] = [];
    if (!listingTitle.trim()) missing.push("Listing Title");
    if (!brand.trim()) missing.push("Brand");
    if (!model.trim()) missing.push("Model");
    if (!year.trim()) missing.push("Year");
    if (!selectedCategoryId) missing.push("Category");
    if (!fuelType.trim()) missing.push("Fuel Type");
    if (!color.trim()) missing.push("Primary Color");
    if (!transmission.trim()) missing.push("Transmission");
    if (!status.trim()) missing.push("Status");
    if (!mileage.trim()) missing.push("Mileage");
    if (!price.trim()) missing.push("Price");
    if (!description.trim()) missing.push("Description");

    if (missing.length > 0) {
      const message = `Please fill in: ${missing.join(", ")}`;
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Missing Fields", message);
      }
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      const message = "Please enter a valid price greater than 0.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Invalid Price", message);
      }
      return;
    }

    const normalizedStatus = status.trim();
    const usageStatus = USAGE_STATUS_OPTIONS.find(
      (option) => option === normalizedStatus,
    );
    if (!usageStatus) {
      const message =
        "Status must be one of: Brand New, Imported Used, Used In Rwanda.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Invalid Status", message);
      }
      return;
    }

    setIsSaving(true);
    try {
      await updateVehicle(id, {
        title: listingTitle.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: year.trim(),
        categoryId: selectedCategoryId,
        categorySlug: categories.find((c) => c.id === selectedCategoryId)?.slug,
        vehicleType:
          categories.find((c) => c.id === selectedCategoryId)?.name || "Car",
        bodyType: bodyType.trim() || undefined,
        fuelType: fuelType.trim(),
        color: color.trim(),
        transmission: transmission.trim(),
        usageStatus,
        mileage: mileage.trim(),
        price: parsedPrice,
        description: description.trim(),
        engineSize: engineSize.trim() || undefined,
        driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc || undefined,
        images,
      });
      setSubmitMessage({
        type: "success",
        text: "Vehicle updated successfully.",
      });
      if (!isWeb) {
        Alert.alert("Success", "Vehicle updated successfully!");
      }
      router.back();
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to update vehicle. Please try again.";

      if (
        errorMessage.includes("Invalid or expired session token") ||
        errorMessage.includes("Missing authorization token")
      ) {
        const sessionMessage = "Your session expired. Please log in again.";
        setSubmitMessage({ type: "error", text: sessionMessage });
        await logout();
        router.replace("/auth/login");
        return;
      }

      setSubmitMessage({ type: "error", text: errorMessage });
      if (!isWeb) {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const message = "Please allow access to your photo library.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Permission required", message);
      }
      return;
    }

    const remainingSlots = Math.max(0, 6 - images.length);
    if (remainingSlots === 0) {
      const message = "You can upload up to 6 images only.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Limit reached", message);
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: false,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled) {
      const newImages = result.assets
        .filter((asset) => !!asset.uri)
        .map((asset) => asset.uri as string);

      if (newImages.length === 0) {
        const message =
          "Selected images could not be processed. Please try again.";
        setSubmitMessage({ type: "error", text: message });
        return;
      }

      setImages((prev) => [...prev, ...newImages].slice(0, 6));
    }
  };

  const handlePickVehicleIdentificationDoc = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!isWeb)
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library.",
        );
      setSubmitMessage({
        type: "error",
        text: "Please allow access to your photo library.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setVehicleIdentificationDoc(result.assets[0].uri);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.headerContent,
              isDesktopWeb && styles.webHeaderContent,
              isDesktopWeb && {
                maxWidth: editContainerMaxWidth,
                paddingHorizontal: webHorizontalPadding,
              },
            ]}
          >
            <View
              style={[
                styles.backBtn,
                { backgroundColor: skeletonSoft, borderRadius: 10 },
              ]}
            />
            <View
              style={[
                styles.loadingSkeletonLine,
                {
                  width: 160,
                  height: 20,
                  backgroundColor: skeletonBase,
                  marginBottom: 0,
                },
              ]}
            />
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
          <View
            style={[
              styles.scrollContent,
              isDesktopWeb && styles.webScrollContent,
              isDesktopWeb && {
                maxWidth: editContainerMaxWidth,
                paddingHorizontal: webHorizontalPadding,
              },
            ]}
          >
            <View style={styles.section}>
              <View
                style={[
                  styles.loadingSkeletonLine,
                  { width: 180, height: 18, backgroundColor: skeletonBase },
                ]}
              />
              <View
                style={[
                  styles.photoUploadBox,
                  { backgroundColor: skeletonSoft, borderColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.section}>
              <View
                style={[
                  styles.loadingSkeletonLine,
                  { width: 210, height: 18, backgroundColor: skeletonBase },
                ]}
              />
              {Array.from({ length: 8 }).map((_, idx) => (
                <View
                  key={`edit-input-skeleton-${idx}`}
                  style={[
                    styles.loadingSkeletonLine,
                    {
                      width: "100%",
                      height: 48,
                      borderRadius: 8,
                      backgroundColor: skeletonSoft,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.actionButtons}>
              <View
                style={[
                  styles.loadingSkeletonLine,
                  {
                    width: "100%",
                    height: 52,
                    borderRadius: 8,
                    backgroundColor: skeletonBase,
                  },
                ]}
              />
              <View
                style={[
                  styles.loadingSkeletonLine,
                  {
                    width: "100%",
                    height: 52,
                    borderRadius: 8,
                    backgroundColor: skeletonSoft,
                  },
                ]}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.headerContent,
            isDesktopWeb && styles.webHeaderContent,
            isDesktopWeb && {
              maxWidth: editContainerMaxWidth,
              paddingHorizontal: webHorizontalPadding,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Edit Vehicle
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View
          style={[
            styles.scrollContent,
            isDesktopWeb && styles.webScrollContent,
            isDesktopWeb && {
              maxWidth: editContainerMaxWidth,
              paddingHorizontal: webHorizontalPadding,
            },
          ]}
        >
          {/* Photo Upload Section */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Photos
            </ThemedText>

            {/* Existing Images */}
            {images.length > 0 && (
              <View style={styles.imagesGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image
                      source={{ uri: resolveImageUrl(uri) }}
                      style={styles.existingImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={[
                        styles.deleteImageBtn,
                        { backgroundColor: "rgba(0,0,0,0.6)" },
                      ]}
                      onPress={() => handleDeleteImage(index)}
                    >
                      <IconSymbol name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.photoUploadBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: images.length >= 6 ? 0.6 : 1,
                },
              ]}
              onPress={handlePickImages}
              disabled={images.length >= 6}
            >
              <IconSymbol
                name="plus.circle.fill"
                size={32}
                color={colors.icon}
              />
              <ThemedText
                style={{ color: colors.text, marginTop: 12, fontWeight: "500" }}
              >
                {images.length >= 6
                  ? "Maximum photos reached (6/6)"
                  : `Add More Photos (${images.length}/6)`}
              </ThemedText>
              <ThemedText
                style={{ color: colors.icon, marginTop: 4, fontSize: 13 }}
              >
                Tap to upload additional images
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Vehicle Information
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Listing Title</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={listingTitle}
                onChangeText={setListingTitle}
                placeholder="e.g. 2021 Toyota RAV4 XLE"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Brand</ThemedText>
                <View ref={brandTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openBrandSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: brand ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {brand || "Select brand"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showBrandSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>Model</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={model}
                  onChangeText={setModel}
                  placeholder="Model"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Year</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={year}
                  onChangeText={setYear}
                  placeholder="YYYY"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>Category *</ThemedText>
                <View ref={categoryTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openCategorySelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: selectedCategoryName ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {selectedCategoryName || "Select category"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showCategorySelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Technical Specs */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Technical Specifications
            </ThemedText>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Fuel Type</ThemedText>
                <View ref={fuelTypeTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openFuelTypeSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: fuelType ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {fuelType || "Select fuel type"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showFuelTypeSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>Transmission</ThemedText>
                <View ref={transmissionTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openTransmissionSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: transmission ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {transmission || "Select transmission"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showTransmissionSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Engine Size + Drive Type row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Engine Size</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="e.g. 2.0L, 1500cc"
                  placeholderTextColor={colors.icon}
                  value={engineSize}
                  onChangeText={setEngineSize}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>Drive Type</ThemedText>
                <View ref={driveTypeTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openDriveTypeSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: driveType ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {driveType || "Select drive type"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showDriveTypeSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Body Type row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Body Type</ThemedText>
                <View ref={bodyTypeTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openBodyTypeSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: bodyType ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {bodyType || "Select body type"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showBodyTypeSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Primary Color</ThemedText>
                <View ref={colorTriggerRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.selectorInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={openColorSelector}
                    activeOpacity={0.85}
                  >
                    <ThemedText
                      style={{
                        color: color ? colors.text : colors.icon,
                        fontSize: 14,
                      }}
                    >
                      {color || "Select primary color"}
                    </ThemedText>
                    <IconSymbol
                      name={
                        showColorSelector && isDesktopWeb
                          ? "chevron.up"
                          : "chevron.down"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Status</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={status}
                  onChangeText={setStatus}
                  placeholder="New/Used"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>Mileage (km)</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={mileage}
                  onChangeText={setMileage}
                  placeholder="0"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Pricing & Details */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Pricing & Description
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Price (RWF)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "600",
                  },
                ]}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Provide additional details about the vehicle's condition, features, and history..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Vehicle Identification Document */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Vehicle Identification Document
              </ThemedText>
              <ThemedText
                style={{ color: colors.icon, fontSize: 12, marginBottom: 8 }}
              >
                Upload a photo of the vehicle's registration or ID document
                (optional)
              </ThemedText>
              {vehicleIdentificationDoc ? (
                <View
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 160,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={{ uri: vehicleIdentificationDoc }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderRadius: 16,
                      padding: 4,
                    }}
                    onPress={() => setVehicleIdentificationDoc(null)}
                  >
                    <IconSymbol
                      name="xmark.circle.fill"
                      size={20}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.photoUploadBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      height: 100,
                    },
                  ]}
                  onPress={handlePickVehicleIdentificationDoc}
                >
                  <IconSymbol
                    name="doc.badge.plus"
                    size={28}
                    color={colors.primary}
                  />
                  <ThemedText
                    style={{ color: colors.text, marginTop: 8, fontSize: 13 }}
                  >
                    Upload ID Document
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {submitMessage && (
              <View
                style={[
                  styles.submitMessageBox,
                  {
                    borderColor:
                      submitMessage.type === "error" ? "#DC2626" : "#16A34A",
                    backgroundColor:
                      submitMessage.type === "error" ? "#FEE2E2" : "#DCFCE7",
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color:
                      submitMessage.type === "error" ? "#991B1B" : "#166534",
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {submitMessage.text}
                </ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: isSaving ? colors.border : colors.primary },
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <ThemedText style={styles.buttonText}>
                {isSaving ? "Saving..." : "Save Changes"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <ThemedText style={[styles.buttonText, { color: colors.text }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <WebFooter />
      </ScrollView>

      {/* Mobile Color Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showColorSelector}
          onRequestClose={() => setShowColorSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowColorSelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Primary Color
            </ThemedText>

            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={colorSearch}
                onChangeText={setColorSearch}
                placeholder="Search colors..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              {filteredColorOptions.length === 0 ? (
                <ThemedText
                  style={{
                    color: colors.icon,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No colors found matching "{colorSearch}"
                </ThemedText>
              ) : (
                filteredColorOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectorOptionRow,
                      { borderBottomColor: colors.border },
                      color === opt && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => handleSelectColor(opt)}
                  >
                    <ThemedText
                      style={[
                        styles.selectorOptionText,
                        { color: color === opt ? colors.primary : colors.text },
                      ]}
                    >
                      {opt}
                    </ThemedText>
                    {color === opt && (
                      <IconSymbol
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Color Dropdown */}
      {isDesktopWeb && showColorSelector && dropdownPos && (
        <Modal
          transparent
          visible={showColorSelector}
          onRequestClose={() => setShowColorSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowColorSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: Math.max(dropdownPos.width, 200),
              },
            ]}
          >
            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={colorSearch}
                onChangeText={setColorSearch}
                placeholder="Search colors..."
                placeholderTextColor={colors.icon}
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {filteredColorOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    color === opt && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleSelectColor(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      { color: color === opt ? colors.primary : colors.text },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {color === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Mobile Category Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showCategorySelector}
          onRequestClose={() => setShowCategorySelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowCategorySelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Category
            </ThemedText>

            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
              {filteredCategories.length === 0 ? (
                <ThemedText
                  style={{
                    color: colors.icon,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No categories found matching "{categorySearch}"
                </ThemedText>
              ) : (
                filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.selectorOptionRow,
                      { borderBottomColor: colors.border },
                      selectedCategoryId === cat.id && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => handleSelectCategory(cat.id)}
                  >
                    <View style={styles.categoryOptionContent}>
                      <IconSymbol
                        name={(cat.icon || "car.fill") as any}
                        size={20}
                        color={
                          selectedCategoryId === cat.id
                            ? colors.primary
                            : colors.icon
                        }
                      />
                      <ThemedText
                        style={[
                          styles.selectorOptionText,
                          {
                            color:
                              selectedCategoryId === cat.id
                                ? colors.primary
                                : colors.text,
                          },
                        ]}
                      >
                        {cat.name}
                      </ThemedText>
                    </View>
                    {selectedCategoryId === cat.id && (
                      <IconSymbol
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Category Dropdown */}
      {isDesktopWeb && showCategorySelector && categoryDropdownPos && (
        <Modal
          transparent
          visible={showCategorySelector}
          onRequestClose={() => setShowCategorySelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowCategorySelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: categoryDropdownPos.top,
                left: categoryDropdownPos.left,
                width: Math.max(categoryDropdownPos.width, 240),
              },
            ]}
          >
            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                placeholderTextColor={colors.icon}
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 240 }}
            >
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    selectedCategoryId === cat.id && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectCategory(cat.id)}
                >
                  <View style={styles.categoryOptionContent}>
                    <IconSymbol
                      name={(cat.icon || "car.fill") as any}
                      size={20}
                      color={
                        selectedCategoryId === cat.id
                          ? colors.primary
                          : colors.icon
                      }
                    />
                    <ThemedText
                      style={[
                        styles.selectorOptionText,
                        {
                          color:
                            selectedCategoryId === cat.id
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {cat.name}
                    </ThemedText>
                  </View>
                  {selectedCategoryId === cat.id && (
                    <IconSymbol
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Mobile Brand Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showBrandSelector}
          onRequestClose={() => setShowBrandSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowBrandSelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Brand
            </ThemedText>

            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder="Search brands..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
            >
              {filteredBrands.length === 0 ? (
                <ThemedText
                  style={{
                    color: colors.icon,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No brands found matching "{brandSearch}"
                </ThemedText>
              ) : (
                filteredBrands.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectorOptionRow,
                      { borderBottomColor: colors.border },
                      brand === opt && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => handleSelectBrand(opt)}
                  >
                    <ThemedText
                      style={[
                        styles.selectorOptionText,
                        { color: brand === opt ? colors.primary : colors.text },
                      ]}
                    >
                      {opt}
                    </ThemedText>
                    {brand === opt && (
                      <IconSymbol
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Brand Dropdown */}
      {isDesktopWeb && showBrandSelector && brandDropdownPos && (
        <Modal
          transparent
          visible={showBrandSelector}
          onRequestClose={() => setShowBrandSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowBrandSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: brandDropdownPos.top,
                left: brandDropdownPos.left,
                width: Math.max(brandDropdownPos.width, 220),
              },
            ]}
          >
            <View
              style={[
                styles.selectorSearchWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.selectorSearchInput, { color: colors.text }]}
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder="Search brands..."
                placeholderTextColor={colors.icon}
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 240 }}
            >
              {filteredBrands.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    brand === opt && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleSelectBrand(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      { color: brand === opt ? colors.primary : colors.text },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {brand === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
      {/* Mobile Fuel Type Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showFuelTypeSelector}
          onRequestClose={() => setShowFuelTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowFuelTypeSelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Fuel Type
            </ThemedText>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              {filteredFuelTypes.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    fuelType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectFuelType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: fuelType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {fuelType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Fuel Type Dropdown */}
      {isDesktopWeb && showFuelTypeSelector && fuelTypeDropdownPos && (
        <Modal
          transparent
          visible={showFuelTypeSelector}
          onRequestClose={() => setShowFuelTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowFuelTypeSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: fuelTypeDropdownPos.top,
                left: fuelTypeDropdownPos.left,
                width: Math.max(fuelTypeDropdownPos.width, 200),
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {filteredFuelTypes.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    fuelType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectFuelType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: fuelType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {fuelType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Mobile Transmission Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showTransmissionSelector}
          onRequestClose={() => setShowTransmissionSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowTransmissionSelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Transmission
            </ThemedText>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              {TRANSMISSION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    transmission === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectTransmission(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color:
                          transmission === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {transmission === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Transmission Dropdown */}
      {isDesktopWeb && showTransmissionSelector && transmissionDropdownPos && (
        <Modal
          transparent
          visible={showTransmissionSelector}
          onRequestClose={() => setShowTransmissionSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowTransmissionSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: transmissionDropdownPos.top,
                left: transmissionDropdownPos.left,
                width: Math.max(transmissionDropdownPos.width, 200),
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {TRANSMISSION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    transmission === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectTransmission(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color:
                          transmission === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {transmission === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Mobile Drive Type Bottom Sheet */}
      {!isDesktopWeb && (
        <Modal
          transparent
          animationType="slide"
          visible={showDriveTypeSelector}
          onRequestClose={() => setShowDriveTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowDriveTypeSelector(false)}
          />
          <View
            style={[
              styles.selectorSheetContainer,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Drive Type
            </ThemedText>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              {DRIVE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    driveType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectDriveType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: driveType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {driveType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Drive Type Dropdown */}
      {isDesktopWeb && showDriveTypeSelector && driveTypeDropdownPos && (
        <Modal
          transparent
          visible={showDriveTypeSelector}
          onRequestClose={() => setShowDriveTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowDriveTypeSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: driveTypeDropdownPos.top,
                left: driveTypeDropdownPos.left,
                width: Math.max(driveTypeDropdownPos.width, 240),
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {DRIVE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    driveType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectDriveType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: driveType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {driveType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Mobile Body Type Bottom Sheet */}
      {!isDesktopWeb && showBodyTypeSelector && (
        <Modal
          transparent
          animationType="slide"
          visible={showBodyTypeSelector}
          onRequestClose={() => setShowBodyTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowBodyTypeSelector(false)}
          />
          <View
            style={[
              styles.selectorSheet,
              {
                backgroundColor: colors.background,
                height: selectorSheetHeight,
              },
            ]}
          >
            <View
              style={[
                styles.selectorSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.selectorSheetTitle}
            >
              Select Body Type
            </ThemedText>
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Search body type..."
                placeholderTextColor={colors.icon}
                value={bodyTypeSearch}
                onChangeText={setBodyTypeSearch}
                autoFocus
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            >
              {filteredBodyTypes.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    bodyType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectBodyType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: bodyType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {bodyType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Desktop Body Type Dropdown */}
      {isDesktopWeb && showBodyTypeSelector && bodyTypeDropdownPos && (
        <Modal
          transparent
          visible={showBodyTypeSelector}
          onRequestClose={() => setShowBodyTypeSelector(false)}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "transparent" },
            ]}
            onPress={() => setShowBodyTypeSelector(false)}
          />
          <View
            style={[
              styles.portalDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: bodyTypeDropdownPos.top,
                left: bodyTypeDropdownPos.left,
                width: Math.max(bodyTypeDropdownPos.width, 240),
              },
            ]}
          >
            <View style={{ padding: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    marginBottom: 0,
                  },
                ]}
                placeholder="Search body type..."
                placeholderTextColor={colors.icon}
                value={bodyTypeSearch}
                onChangeText={setBodyTypeSearch}
                autoFocus
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {filteredBodyTypes.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.selectorOptionRow,
                    { borderBottomColor: colors.border },
                    bodyType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectBodyType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.selectorOptionText,
                      {
                        color: bodyType === opt ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {opt}
                  </ThemedText>
                  {bodyType === opt && (
                    <IconSymbol
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },
  webHeaderContent: {
    width: "100%",
    alignSelf: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  webScrollContent: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  existingImage: {
    width: "100%",
    height: "100%",
  },
  deleteImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  photoUploadBox: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  selectorInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  portalDropdown: {
    position: "fixed",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    zIndex: 9999999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  selectorDropdown: {
    position: "absolute",
    top: 74,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    zIndex: 9999999,
    elevation: 10000,
  },
  selectorSearchWrap: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  selectorSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  selectorOptionsList: {
    maxHeight: 220,
  },
  selectorOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  selectorOptionRowActive: {
    borderBottomWidth: 0,
  },
  selectorOptionText: {
    fontSize: 14,
  },
  selectorOptionTextActive: {
    fontWeight: "700",
  },
  selectorEmptyText: {
    paddingVertical: 12,
    textAlign: "center",
    fontSize: 13,
  },
  selectorSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  selectorSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  selectorSheetOptionsList: {
    flex: 1,
  },
  selectorSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  selectorSheetTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 15,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryOptionContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 40,
  },
  submitMessageBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSkeletonLine: {
    borderRadius: 6,
    marginBottom: 12,
  },
});
