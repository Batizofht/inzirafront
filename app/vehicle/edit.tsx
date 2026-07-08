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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const USAGE_STATUS_OPTIONS = [
  "Brand New",
  "Imported Used",
  "Used In Rwanda",
] as const;

const PRIMARY_COLOR_OPTIONS = [
  "Pearl White","Silver","Black","Red","Blue","Gray","White","Green",
  "Yellow","Orange","Brown","Gold","Beige","Navy","Purple",
] as const;

const COLOR_DOTS: Record<string, string> = {
  "Pearl White": "#F5F5F0", Silver: "#C0C0C0", Black: "#1a1a1a", Red: "#DC2626",
  Blue: "#2563EB", Gray: "#6B7280", White: "#FFFFFF", Green: "#16A34A",
  Yellow: "#EAB308", Orange: "#EA580C", Brown: "#92400E", Gold: "#D97706",
  Beige: "#D4C5A9", Navy: "#1E3A5F", Purple: "#7C3AED",
};

const FUEL_TYPE_OPTIONS = [
  "Petrol","Diesel","Hybrid","Electric","CNG","LPG",
] as const;

const TRANSMISSION_OPTIONS = [
  "Automatic","Manual","Semi-Automatic","CVT",
] as const;

const DRIVE_TYPE_OPTIONS = [
  "Front Wheel Drive (FWD)","Rear Wheel Drive (RWD)",
  "All Wheel Drive (AWD)","4x4 / 4WD",
] as const;

const BODY_TYPE_OPTIONS = [
  "SUVs & Crossovers","Trucks","Sedans","Coupes",
  "Minivans","Hatchbacks","Convertibles","Station wagons",
] as const;

// ─── Shared UI helpers ────────────────────────────────────────────────────────

/** Rounded card section wrapper */
function FormCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

/** Section header row with icon badge */
function SectionHead({
  icon,
  title,
  subtitle,
  colors,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  colors: any;
}) {
  return (
    <View style={S.sectionHeadRow}>
      <View style={[S.sectionIconBadge, { backgroundColor: `${colors.primary}18` }]}>
        <IconSymbol name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold" style={S.sectionHeadTitle}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[S.sectionHeadSub, { color: colors.icon }]}>{subtitle}</ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/** Label + input wrapper */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
        <ThemedText style={S.fieldLabel}>{label}</ThemedText>
        {required && <ThemedText style={{ color: "#EF4444", fontSize: 12, marginLeft: 2 }}>*</ThemedText>}
      </View>
      {hint ? <ThemedText style={S.fieldHint}>{hint}</ThemedText> : null}
      {children}
    </View>
  );
}

/** Selector trigger button */
function SelectorTrigger({
  value,
  placeholder,
  onPress,
  colors,
  open,
  isDesktopWeb,
  triggerRef,
  colorDot,
}: {
  value: string;
  placeholder: string;
  onPress: () => void;
  colors: any;
  open?: boolean;
  isDesktopWeb?: boolean;
  triggerRef?: React.RefObject<View>;
  colorDot?: string;
}) {
  return (
    <View ref={triggerRef} collapsable={false}>
      <TouchableOpacity
        style={[S.selectorTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 8 }}>
          {colorDot ? (
            <View style={[S.colorDotInline, { backgroundColor: colorDot, borderColor: colors.border }]} />
          ) : null}
          <ThemedText style={{ color: value ? colors.text : colors.icon, fontSize: 14 }}>
            {value || placeholder}
          </ThemedText>
        </View>
        <IconSymbol
          name={open && isDesktopWeb ? "chevron.up" : "chevron.down"}
          size={16}
          color={colors.icon}
        />
      </TouchableOpacity>
    </View>
  );
}

/** Pill chips for usage status */
function ChipGroup({
  options,
  value,
  onChange,
  colors,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              S.chip,
              {
                borderColor: sel ? colors.primary : colors.border,
                backgroundColor: sel ? `${colors.primary}18` : colors.background,
              },
            ]}
          >
            <ThemedText
              style={{ fontSize: 12, fontWeight: sel ? "700" : "400", color: sel ? colors.primary : colors.text }}
            >
              {opt}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditVehicleScreen() {
  useEffect(() => {
    if (typeof document !== "undefined") document.title = "Edit Listing | Inzira";
  }, []);

  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const insets = useSafeAreaInsets();
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;

  const editContainerMaxWidth = isWebXl ? 980 : isWebLg ? 920 : isWebMd ? 840 : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;
  const selectorSheetHeight = Math.min(560, Math.max(420, Math.round(height * 0.72)));
  const isDark = theme === "dark";
  const skeletonBase = isDark ? "#1F2937" : "#E5E7EB";
  const skeletonSoft = isDark ? "#111827" : "#F3F4F6";

  // ── All original state (unchanged) ─────────────────────────────────────────
  const [listingTitle, setListingTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [vehicleCategoryHint, setVehicleCategoryHint] = useState<{
    id?: string; slug?: string; name?: string;
  } | null>(null);
  const [color, setColor] = useState("");
  const [transmission, setTransmission] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [vehicleIdentificationDoc, setVehicleIdentificationDoc] = useState<string | null>(null);

  const [showFuelTypeSelector, setShowFuelTypeSelector] = useState(false);
  const [fuelTypeDropdownPos, setFuelTypeDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const fuelTypeTriggerRef = useRef<View>(null);

  const [showTransmissionSelector, setShowTransmissionSelector] = useState(false);
  const [transmissionDropdownPos, setTransmissionDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const transmissionTriggerRef = useRef<View>(null);

  const [showDriveTypeSelector, setShowDriveTypeSelector] = useState(false);
  const [driveTypeDropdownPos, setDriveTypeDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const driveTypeTriggerRef = useRef<View>(null);

  const [showBodyTypeSelector, setShowBodyTypeSelector] = useState(false);
  const [bodyTypeSearch, setBodyTypeSearch] = useState("");
  const [bodyTypeDropdownPos, setBodyTypeDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const bodyTypeTriggerRef = useRef<View>(null);

  const [status, setStatus] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const colorTriggerRef = useRef<View>(null);

  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownPos, setCategoryDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const categoryTriggerRef = useRef<View>(null);

  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandDropdownPos, setBrandDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const brandTriggerRef = useRef<View>(null);

  // ── All original memos (unchanged) ─────────────────────────────────────────
  const filteredColorOptions = useMemo(() => {
    const query = colorSearch.trim().toLowerCase();
    return !query ? PRIMARY_COLOR_OPTIONS : PRIMARY_COLOR_OPTIONS.filter((o) => o.toLowerCase().includes(query));
  }, [colorSearch]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return !query ? categories : categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categorySearch, categories]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    return !query ? VEHICLE_BRAND_OPTIONS : VEHICLE_BRAND_OPTIONS.filter((o) => o.toLowerCase().includes(query));
  }, [brandSearch]);

  const filteredBodyTypes = useMemo(() => {
    const query = bodyTypeSearch.trim().toLowerCase();
    return !query ? BODY_TYPE_OPTIONS : BODY_TYPE_OPTIONS.filter((o) => o.toLowerCase().includes(query));
  }, [bodyTypeSearch]);

  const filteredFuelTypes = useMemo(() => {
    const selectedCat = categories.find((c) => c.id === selectedCategoryId);
    if (!selectedCat) return FUEL_TYPE_OPTIONS;
    const name = selectedCat.name?.toLowerCase() || "";
    if (name === "full electric car" || name === "electric motorcycle") return ["Electric"];
    if (name === "petrol car") return ["Petrol"];
    if (name === "hybrid car") return ["Hybrid"];
    if (name === "motorcycle" || name === "scooter") return ["Petrol"];
    if (name === "truck" || name === "bus") return ["Diesel"];
    return FUEL_TYPE_OPTIONS;
  }, [selectedCategoryId, categories]);

  const selectedCategoryName = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId)?.name || "";
  }, [categories, selectedCategoryId]);

  // ── All original handlers (unchanged) ──────────────────────────────────────
  const getWebPos = (ref: React.RefObject<View>) => {
    if (isWeb && ref.current) {
      const el = ref.current as unknown as HTMLElement;
      if (el?.getBoundingClientRect) {
        const r = el.getBoundingClientRect();
        return { top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width };
      }
    }
    return null;
  };

  const openColorSelector = () => { setColorSearch(""); setShowColorSelector(true); setDropdownPos(getWebPos(colorTriggerRef)); };
  const handleSelectColor = (selected: string) => { setColor(selected); setShowColorSelector(false); };

  const openCategorySelector = () => { setCategorySearch(""); setShowCategorySelector(true); setCategoryDropdownPos(getWebPos(categoryTriggerRef)); };
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setShowCategorySelector(false);
    const selectedCat = categories.find((c) => c.id === catId);
    if (selectedCat) {
      const name = selectedCat.name?.toLowerCase() || "";
      if (name === "full electric car" || name === "electric motorcycle") { setFuelType("Electric"); setTransmission("Automatic"); }
      else if (name === "petrol car") { setFuelType("Petrol"); setTransmission("Automatic"); }
      else if (name === "hybrid car") { setFuelType("Hybrid"); setTransmission("Automatic"); }
      else if (name === "motorcycle" || name === "scooter") { setFuelType("Petrol"); setTransmission("Manual"); }
      else if (name === "truck" || name === "bus") { setFuelType("Diesel"); setTransmission("Manual"); }
    }
  };

  const openBrandSelector = () => { setBrandSearch(""); setShowBrandSelector(true); setBrandDropdownPos(getWebPos(brandTriggerRef)); };
  const handleSelectBrand = (selected: string) => { setBrand(selected); setShowBrandSelector(false); };

  const openFuelTypeSelector = () => { setShowFuelTypeSelector(true); setFuelTypeDropdownPos(getWebPos(fuelTypeTriggerRef)); };
  const handleSelectFuelType = (value: string) => { setFuelType(value); setShowFuelTypeSelector(false); };

  const openTransmissionSelector = () => { setShowTransmissionSelector(true); setTransmissionDropdownPos(getWebPos(transmissionTriggerRef)); };
  const handleSelectTransmission = (value: string) => { setTransmission(value); setShowTransmissionSelector(false); };

  const openDriveTypeSelector = () => { setShowDriveTypeSelector(true); setDriveTypeDropdownPos(getWebPos(driveTypeTriggerRef)); };
  const handleSelectDriveType = (value: string) => { setDriveType(value); setShowDriveTypeSelector(false); };

  const openBodyTypeSelector = () => { setBodyTypeSearch(""); setShowBodyTypeSelector(true); setBodyTypeDropdownPos(getWebPos(bodyTypeTriggerRef)); };
  const handleSelectBodyType = (value: string) => { setBodyType(value); setShowBodyTypeSelector(false); };

  // ── All original effects (unchanged) ───────────────────────────────────────
  useEffect(() => {
    fetchCategories().then((res) => setCategories(res.data.categories)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadData = async () => {
      try {
        const res = await fetchVehicleById(id);
        const vehicle = res.data.vehicle;
        if (vehicle) {
          const normalizedVehicleBrand = String(vehicle.brand || "").trim().toLowerCase();
          const matchedBrandOption = VEHICLE_BRAND_OPTIONS.find((o) => o.toLowerCase() === normalizedVehicleBrand);
          setListingTitle(vehicle.title);
          setBrand(matchedBrandOption || vehicle.brand || "");
          setModel(vehicle.model);
          setYear(vehicle.year.toString());
          setFuelType(vehicle.fuelType || "");
          const vehicleCategoryId = (vehicle as any).categoryId || "";
          const vehicleCategorySlug = (vehicle as any).categorySlug || "";
          const vehicleCategoryName = (vehicle as any).vehicleType || (vehicle as any).type || "";
          setSelectedCategoryId(vehicleCategoryId);
          setVehicleCategoryHint({ id: vehicleCategoryId, slug: vehicleCategorySlug, name: vehicleCategoryName });
          setColor(vehicle.color || "");
          setTransmission(vehicle.transmission || "");
          setEngineSize((vehicle as any).engineSize || "");
          setDriveType((vehicle as any).driveType || "");
          setBodyType((vehicle as any).bodyType || "");
          setVehicleIdentificationDoc((vehicle as any).vehicleIdentificationDoc || null);
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
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (categories.length === 0 || !vehicleCategoryHint) return;
    const selectedCategoryStillValid = selectedCategoryId ? categories.some((cat) => cat.id === selectedCategoryId) : false;
    if (selectedCategoryStillValid) return;
    const normalizedSlug = vehicleCategoryHint.slug?.trim().toLowerCase();
    const normalizedName = vehicleCategoryHint.name?.trim().toLowerCase();
    const matchedCategory =
      (vehicleCategoryHint.id ? categories.find((cat) => cat.id === vehicleCategoryHint.id) : undefined) ||
      (normalizedSlug ? categories.find((cat) => String(cat.slug || "").trim().toLowerCase() === normalizedSlug) : undefined) ||
      (normalizedName ? categories.find((cat) => cat.name.trim().toLowerCase() === normalizedName) : undefined);
    if (matchedCategory) setSelectedCategoryId(matchedCategory.id);
  }, [categories, selectedCategoryId, vehicleCategoryHint]);

  // ── Save handler (unchanged) ────────────────────────────────────────────────
  const handleSave = async () => {
    setSubmitMessage(null);
    if (!id) { setSubmitMessage({ type: "error", text: "Missing listing id. Please reopen this page and try again." }); return; }
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
      if (!isWeb) Alert.alert("Missing Fields", message);
      return;
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      const message = "Please enter a valid price greater than 0.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Invalid Price", message);
      return;
    }
    const normalizedStatus = status.trim();
    const usageStatus = USAGE_STATUS_OPTIONS.find((o) => o === normalizedStatus);
    if (!usageStatus) {
      const message = "Status must be one of: Brand New, Imported Used, Used In Rwanda.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Invalid Status", message);
      return;
    }
    setIsSaving(true);
    try {
      await updateVehicle(id, {
        title: listingTitle.trim(), brand: brand.trim(), model: model.trim(), year: year.trim(),
        categoryId: selectedCategoryId,
        categorySlug: categories.find((c) => c.id === selectedCategoryId)?.slug,
        vehicleType: categories.find((c) => c.id === selectedCategoryId)?.name || "Car",
        bodyType: bodyType.trim() || undefined,
        fuelType: fuelType.trim(), color: color.trim(), transmission: transmission.trim(),
        usageStatus, mileage: mileage.trim(), price: parsedPrice,
        description: description.trim(), engineSize: engineSize.trim() || undefined,
        driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc || undefined,
        images,
      });
      setSubmitMessage({ type: "success", text: "Vehicle updated successfully." });
      if (!isWeb) Alert.alert("Success", "Vehicle updated successfully!");
      router.back();
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to update vehicle. Please try again.";
      if (errorMessage.includes("Invalid or expired session token") || errorMessage.includes("Missing authorization token")) {
        setSubmitMessage({ type: "error", text: "Your session expired. Please log in again." });
        await logout();
        router.replace("/auth/login");
        return;
      }
      setSubmitMessage({ type: "error", text: errorMessage });
      if (!isWeb) Alert.alert("Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const message = "Please allow access to your photo library.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Permission required", message);
      return;
    }
    const remainingSlots = Math.max(0, 6 - images.length);
    if (remainingSlots === 0) {
      const message = "You can upload up to 6 images only.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Limit reached", message);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.7, base64: false, selectionLimit: remainingSlots,
    });
    if (!result.canceled) {
      const newImages = result.assets.filter((a) => !!a.uri).map((a) => a.uri as string);
      if (newImages.length === 0) { setSubmitMessage({ type: "error", text: "Selected images could not be processed. Please try again." }); return; }
      setImages((prev) => [...prev, ...newImages].slice(0, 6));
    }
  };

  const handlePickVehicleIdentificationDoc = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!isWeb) Alert.alert("Permission required", "Please allow access to your photo library.");
      setSubmitMessage({ type: "error", text: "Please allow access to your photo library." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.8, base64: false });
    if (!result.canceled && result.assets[0]) setVehicleIdentificationDoc(result.assets[0].uri);
  };

  // ── Loading skeleton (restyled) ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background }]}>
        {/* Header skeleton */}
        <View style={[S.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={[S.headerContent, isDesktopWeb && S.webHeaderContent,
            isDesktopWeb && { maxWidth: editContainerMaxWidth, paddingHorizontal: webHorizontalPadding }]}>
            <View style={[S.backBtnWrap, { backgroundColor: skeletonSoft, borderRadius: 10 }]} />
            <View style={[S.skeletonLine, { width: 160, height: 20, backgroundColor: skeletonBase, marginBottom: 0 }]} />
            <View style={{ width: 40 }} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
          <View style={[S.scrollContent, isDesktopWeb && S.webScrollContent,
            isDesktopWeb && { maxWidth: editContainerMaxWidth, paddingHorizontal: webHorizontalPadding }]}>
            {/* Photo section skeleton */}
            <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
              <View style={[S.skeletonLine, { width: 180, height: 16, backgroundColor: skeletonBase }]} />
              <View style={[S.skeletonLine, { width: "100%", height: 110, borderRadius: 10, backgroundColor: skeletonSoft }]} />
            </View>
            {/* Info section skeleton */}
            <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
              <View style={[S.skeletonLine, { width: 200, height: 16, backgroundColor: skeletonBase }]} />
              {[...Array(4)].map((_, i) => (
                <View key={i} style={[S.skeletonLine, { width: "100%", height: 48, borderRadius: 10, backgroundColor: skeletonSoft }]} />
              ))}
            </View>
            {/* Specs section skeleton */}
            <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
              <View style={[S.skeletonLine, { width: 220, height: 16, backgroundColor: skeletonBase }]} />
              {[...Array(4)].map((_, i) => (
                <View key={i} style={[S.skeletonLine, { width: "100%", height: 48, borderRadius: 10, backgroundColor: skeletonSoft }]} />
              ))}
            </View>
            {/* Buttons skeleton */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={[S.skeletonLine, { width: "100%", height: 52, borderRadius: 10, backgroundColor: skeletonBase, marginBottom: 0 }]} />
              <View style={[S.skeletonLine, { width: "100%", height: 52, borderRadius: 10, backgroundColor: skeletonSoft, marginBottom: 0 }]} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <View style={[S.safeArea, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[S.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[S.headerContent, isDesktopWeb && S.webHeaderContent,
          isDesktopWeb && { maxWidth: editContainerMaxWidth, paddingHorizontal: webHorizontalPadding }]}>
          <TouchableOpacity onPress={() => router.back()} style={[S.backBtnWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={S.headerTitle}>Edit Vehicle</ThemedText>
          {/* Save shortcut on desktop */}
          {isDesktopWeb ? (
            <TouchableOpacity
              style={[S.headerSaveBtn, { backgroundColor: isSaving ? colors.border : colors.primary }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <ThemedText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Save Changes</ThemedText>
              }
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View style={[S.scrollContent, isDesktopWeb && S.webScrollContent,
          isDesktopWeb && { maxWidth: editContainerMaxWidth, paddingHorizontal: webHorizontalPadding }]}>

          {/* ── Alert banner ── */}
          {submitMessage && (
            <View style={[S.alertBox, {
              backgroundColor: submitMessage.type === "error" ? "#FEF2F2" : "#F0FDF4",
              borderColor: submitMessage.type === "error" ? "#FECACA" : "#BBF7D0",
            }]}>
              <IconSymbol
                name={submitMessage.type === "error" ? "exclamationmark.circle.fill" : "checkmark.circle.fill"}
                size={16}
                color={submitMessage.type === "error" ? "#DC2626" : "#16A34A"}
              />
              <ThemedText style={[S.alertText, { color: submitMessage.type === "error" ? "#991B1B" : "#166534" }]}>
                {submitMessage.text}
              </ThemedText>
            </View>
          )}

          {/* ══════════ PHOTOS ══════════ */}
          <FormCard colors={colors}>
            <SectionHead icon="photo" title="Vehicle Photos" subtitle="Up to 6 photos · First photo is the cover" colors={colors} />

            {images.length > 0 && (
              <View style={S.photosGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={S.photoThumb}>
                    <Image source={{ uri: resolveImageUrl(uri) }} style={S.photoThumbImg} contentFit="cover" />
                    {index === 0 && (
                      <View style={S.coverBadge}>
                        <ThemedText style={{ fontSize: 9, color: "#fff", fontWeight: "700", letterSpacing: 0.3 }}>COVER</ThemedText>
                      </View>
                    )}
                    <TouchableOpacity style={S.photoDeleteBtn} onPress={() => handleDeleteImage(index)}>
                      <IconSymbol name="trash" size={13} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[S.photoAddZone, {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: images.length >= 6 ? 0.5 : 1,
              }]}
              onPress={handlePickImages}
              disabled={images.length >= 6}
              activeOpacity={0.8}
            >
              <View style={[S.photoAddIcon, { backgroundColor: `${colors.primary}18` }]}>
                <IconSymbol name="plus.circle.fill" size={26} color={colors.primary} />
              </View>
              <ThemedText style={{ fontWeight: "600", fontSize: 13, color: colors.text, marginTop: 10 }}>
                {images.length >= 6 ? "Maximum photos reached (6/6)" : `Add More Photos (${images.length}/6)`}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 3 }}>
                Tap to upload additional images
              </ThemedText>
            </TouchableOpacity>
          </FormCard>

          {/* ══════════ VEHICLE INFORMATION ══════════ */}
          <FormCard colors={colors}>
            <SectionHead icon="car.fill" title="Vehicle Information" subtitle="Core details about the listing" colors={colors} />

            <Field label="Listing Title" required>
              <TextInput
                style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={listingTitle}
                onChangeText={setListingTitle}
                placeholder="e.g. 2021 Toyota RAV4 XLE"
                placeholderTextColor={colors.icon}
              />
            </Field>

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Brand" required>
                  <SelectorTrigger value={brand} placeholder="Select brand" onPress={openBrandSelector}
                    colors={colors} open={showBrandSelector} isDesktopWeb={isDesktopWeb} triggerRef={brandTriggerRef} />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Model" required>
                  <TextInput
                    style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={model} onChangeText={setModel} placeholder="Model" placeholderTextColor={colors.icon}
                  />
                </Field>
              </View>
            </View>

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Year" required>
                  <TextInput
                    style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={year} onChangeText={setYear} placeholder="YYYY" placeholderTextColor={colors.icon} keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Category" required>
                  <SelectorTrigger value={selectedCategoryName} placeholder="Select category" onPress={openCategorySelector}
                    colors={colors} open={showCategorySelector} isDesktopWeb={isDesktopWeb} triggerRef={categoryTriggerRef} />
                </Field>
              </View>
            </View>
          </FormCard>

          {/* ══════════ TECHNICAL SPECIFICATIONS ══════════ */}
          <FormCard colors={colors}>
            <SectionHead icon="gearshape.fill" title="Technical Specifications" subtitle="Powertrain, body and configuration" colors={colors} />

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Fuel Type" required>
                  <SelectorTrigger value={fuelType} placeholder="Select fuel type" onPress={openFuelTypeSelector}
                    colors={colors} open={showFuelTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={fuelTypeTriggerRef} />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Transmission" required>
                  <SelectorTrigger value={transmission} placeholder="Select transmission" onPress={openTransmissionSelector}
                    colors={colors} open={showTransmissionSelector} isDesktopWeb={isDesktopWeb} triggerRef={transmissionTriggerRef} />
                </Field>
              </View>
            </View>

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Engine Size">
                  <TextInput
                    style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. 2.0L, 1500cc" placeholderTextColor={colors.icon}
                    value={engineSize} onChangeText={setEngineSize}
                  />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Drive Type">
                  <SelectorTrigger value={driveType} placeholder="Select drive type" onPress={openDriveTypeSelector}
                    colors={colors} open={showDriveTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={driveTypeTriggerRef} />
                </Field>
              </View>
            </View>

            <View style={S.row}>
              <View style={{ flex: 1 }}>
                <Field label="Body Type">
                  <SelectorTrigger value={bodyType} placeholder="Select body type" onPress={openBodyTypeSelector}
                    colors={colors} open={showBodyTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={bodyTypeTriggerRef} />
                </Field>
              </View>
            </View>

            <Field label="Primary Color" required>
              <SelectorTrigger
                value={color} placeholder="Select primary color" onPress={openColorSelector}
                colors={colors} open={showColorSelector} isDesktopWeb={isDesktopWeb} triggerRef={colorTriggerRef}
                colorDot={color ? (COLOR_DOTS[color] ?? undefined) : undefined}
              />
            </Field>

            <View style={[S.divider, { backgroundColor: colors.border }]} />

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Usage Status" required>
                  <ChipGroup options={USAGE_STATUS_OPTIONS} value={status} onChange={setStatus} colors={colors} />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Mileage (km)" required>
                  <TextInput
                    style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={mileage} onChangeText={setMileage} placeholder="0" placeholderTextColor={colors.icon} keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>
          </FormCard>

          {/* ══════════ PRICING & DESCRIPTION ══════════ */}
          <FormCard colors={colors}>
            <SectionHead icon="tag.fill" title="Pricing & Description" subtitle="Set your asking price and vehicle story" colors={colors} />

            <Field label="Price (FRW)" required>
              <View style={S.priceRow}>
                <View style={[S.pricePrefixBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ThemedText style={{ fontSize: 11, fontWeight: "700", color: colors.icon, letterSpacing: 0.6 }}>FRW</ThemedText>
                </View>
                <TextInput
                  style={[S.priceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={price} onChangeText={setPrice} placeholder="0"
                  placeholderTextColor={colors.icon} keyboardType="numeric"
                />
              </View>
            </Field>

            <Field label="Description" required>
              <TextInput
                style={[S.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={description} onChangeText={setDescription}
                placeholder="Provide additional details about the vehicle's condition, features, and history..."
                placeholderTextColor={colors.icon} multiline numberOfLines={6} textAlignVertical="top"
              />
            </Field>
          </FormCard>

          {/* ══════════ VEHICLE ID DOCUMENT ══════════ */}
          <FormCard colors={colors}>
            <SectionHead icon="doc.badge.plus" title="Vehicle ID Document" subtitle="Registration or ownership doc (optional)" colors={colors} />

            {vehicleIdentificationDoc ? (
              <View>
                <View style={{ borderRadius: 10, overflow: "hidden", height: 150 }}>
                  <Image source={{ uri: vehicleIdentificationDoc }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </View>
                <TouchableOpacity
                  style={S.removeDocBtn}
                  onPress={() => setVehicleIdentificationDoc(null)}
                >
                  <IconSymbol name="trash" size={13} color="#EF4444" />
                  <ThemedText style={{ fontSize: 12, color: "#EF4444", marginLeft: 5 }}>Remove document</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[S.docUploadZone, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handlePickVehicleIdentificationDoc}
                activeOpacity={0.8}
              >
                <IconSymbol name="arrow.up.doc" size={20} color={colors.primary} />
                <ThemedText style={{ fontSize: 13, color: colors.text, marginLeft: 10, fontWeight: "500" }}>
                  Upload ID Document
                </ThemedText>
              </TouchableOpacity>
            )}
          </FormCard>

          {/* ══════════ ACTION BUTTONS ══════════ */}
          <View style={S.actionRow}>
            <TouchableOpacity
              style={[S.btnSave, { backgroundColor: isSaving ? colors.border : colors.primary }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                    <ThemedText style={S.btnText}>Save Changes</ThemedText>
                  </View>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.btnCancel, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <ThemedText style={[S.btnText, { color: colors.text }]}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

        </View>
        <WebFooter />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          ALL MODALS — logic 100% unchanged, just the outer sheet / dropdown
          wrapper uses the cleaner style from S.*
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Color ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showColorSelector} onRequestClose={() => setShowColorSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowColorSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Primary Color</ThemedText>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={colorSearch} onChangeText={setColorSearch} placeholder="Search colors..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {filteredColorOptions.length === 0 ? (
                <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No colors found matching "{colorSearch}"</ThemedText>
              ) : filteredColorOptions.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, color === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectColor(opt)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={[S.colorDotInline, { backgroundColor: COLOR_DOTS[opt] ?? "#888", borderColor: colors.border }]} />
                    <ThemedText style={{ fontSize: 14, color: color === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                  </View>
                  {color === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showColorSelector && dropdownPos && (
        <Modal transparent visible={showColorSelector} onRequestClose={() => setShowColorSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowColorSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 200) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={colorSearch} onChangeText={setColorSearch} placeholder="Search colors..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {filteredColorOptions.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, color === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectColor(opt)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={[S.colorDotInline, { backgroundColor: COLOR_DOTS[opt] ?? "#888", borderColor: colors.border }]} />
                    <ThemedText style={{ fontSize: 14, color: color === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                  </View>
                  {color === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Category ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showCategorySelector} onRequestClose={() => setShowCategorySelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowCategorySelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Category</ThemedText>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder="Search categories..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {filteredCategories.length === 0 ? (
                <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No categories found matching "{categorySearch}"</ThemedText>
              ) : filteredCategories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[S.optionRow, { borderBottomColor: colors.border }, selectedCategoryId === cat.id && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectCategory(cat.id)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <IconSymbol name={(cat.icon || "car.fill") as any} size={18} color={selectedCategoryId === cat.id ? colors.primary : colors.icon} />
                    <ThemedText style={{ fontSize: 14, color: selectedCategoryId === cat.id ? colors.primary : colors.text }}>{cat.name}</ThemedText>
                  </View>
                  {selectedCategoryId === cat.id && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showCategorySelector && categoryDropdownPos && (
        <Modal transparent visible={showCategorySelector} onRequestClose={() => setShowCategorySelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowCategorySelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: categoryDropdownPos.top, left: categoryDropdownPos.left, width: Math.max(categoryDropdownPos.width, 240) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder="Search categories..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[S.optionRow, { borderBottomColor: colors.border }, selectedCategoryId === cat.id && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectCategory(cat.id)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <IconSymbol name={(cat.icon || "car.fill") as any} size={18} color={selectedCategoryId === cat.id ? colors.primary : colors.icon} />
                    <ThemedText style={{ fontSize: 14, color: selectedCategoryId === cat.id ? colors.primary : colors.text }}>{cat.name}</ThemedText>
                  </View>
                  {selectedCategoryId === cat.id && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Brand ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showBrandSelector} onRequestClose={() => setShowBrandSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowBrandSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Brand</ThemedText>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder="Search brands..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {filteredBrands.length === 0 ? (
                <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No brands found matching "{brandSearch}"</ThemedText>
              ) : filteredBrands.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBrand(opt)}>
                  <ThemedText style={{ fontSize: 14, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showBrandSelector && brandDropdownPos && (
        <Modal transparent visible={showBrandSelector} onRequestClose={() => setShowBrandSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowBrandSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: brandDropdownPos.top, left: brandDropdownPos.left, width: Math.max(brandDropdownPos.width, 220) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder="Search brands..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
              {filteredBrands.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBrand(opt)}>
                  <ThemedText style={{ fontSize: 14, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Fuel Type ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showFuelTypeSelector} onRequestClose={() => setShowFuelTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowFuelTypeSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Fuel Type</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {filteredFuelTypes.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, fuelType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectFuelType(opt)}>
                  <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {fuelType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showFuelTypeSelector && fuelTypeDropdownPos && (
        <Modal transparent visible={showFuelTypeSelector} onRequestClose={() => setShowFuelTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowFuelTypeSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: fuelTypeDropdownPos.top, left: fuelTypeDropdownPos.left, width: Math.max(fuelTypeDropdownPos.width, 200) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {filteredFuelTypes.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, fuelType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectFuelType(opt)}>
                  <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {fuelType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Transmission ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showTransmissionSelector} onRequestClose={() => setShowTransmissionSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowTransmissionSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Transmission</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {TRANSMISSION_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, transmission === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectTransmission(opt)}>
                  <ThemedText style={{ fontSize: 14, color: transmission === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {transmission === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showTransmissionSelector && transmissionDropdownPos && (
        <Modal transparent visible={showTransmissionSelector} onRequestClose={() => setShowTransmissionSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowTransmissionSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: transmissionDropdownPos.top, left: transmissionDropdownPos.left, width: Math.max(transmissionDropdownPos.width, 200) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {TRANSMISSION_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, transmission === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectTransmission(opt)}>
                  <ThemedText style={{ fontSize: 14, color: transmission === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {transmission === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Drive Type ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showDriveTypeSelector} onRequestClose={() => setShowDriveTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowDriveTypeSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Drive Type</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {DRIVE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, driveType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectDriveType(opt)}>
                  <ThemedText style={{ fontSize: 14, color: driveType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {driveType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showDriveTypeSelector && driveTypeDropdownPos && (
        <Modal transparent visible={showDriveTypeSelector} onRequestClose={() => setShowDriveTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowDriveTypeSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: driveTypeDropdownPos.top, left: driveTypeDropdownPos.left, width: Math.max(driveTypeDropdownPos.width, 240) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {DRIVE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, driveType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectDriveType(opt)}>
                  <ThemedText style={{ fontSize: 14, color: driveType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {driveType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Body Type ── */}
      {!isDesktopWeb && showBodyTypeSelector && (
        <Modal transparent animationType="slide" visible={showBodyTypeSelector} onRequestClose={() => setShowBodyTypeSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowBodyTypeSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Body Type</ThemedText>
              <View style={{ marginBottom: 8 }}>
                <TextInput
                  style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Search body type..." placeholderTextColor={colors.icon}
                  value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 340 }} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredBodyTypes.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, bodyType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBodyType(opt)}>
                    <ThemedText style={{ fontSize: 14, color: bodyType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                    {bodyType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showBodyTypeSelector && bodyTypeDropdownPos && (
        <Modal transparent visible={showBodyTypeSelector} onRequestClose={() => setShowBodyTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowBodyTypeSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: bodyTypeDropdownPos.top, left: bodyTypeDropdownPos.left, width: Math.max(bodyTypeDropdownPos.width, 240) }]}>
            <View style={{ padding: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <TextInput
                style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Search body type..." placeholderTextColor={colors.icon}
                value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {filteredBodyTypes.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, bodyType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBodyType(opt)}>
                  <ThemedText style={{ fontSize: 14, color: bodyType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {bodyType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  // Header
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
  webHeaderContent: { width: "100%", alignSelf: "center" },
  headerTitle: { fontSize: 18 },
  backBtnWrap: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerSaveBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    justifyContent: "center", alignItems: "center", minWidth: 110,
  },

  // Layout
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  webScrollContent: { width: "100%", alignSelf: "center", paddingBottom: 48 },
  row: { flexDirection: "row" },

  // Card
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 20, marginBottom: 16,
  },

  // Section head
  sectionHeadRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionIconBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionHeadTitle: { fontSize: 15 },
  sectionHeadSub: { fontSize: 12, marginTop: 1 },

  // Field
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.55 },
  fieldHint: { fontSize: 11, marginBottom: 6 },

  // Input
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  textarea: { minHeight: 120, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingTop: 13, fontSize: 14 },

  // Selector trigger
  selectorTrigger: {
    height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },

  // Color dot
  colorDotInline: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },

  // Chip
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5 },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },

  // Price row
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pricePrefixBox: { height: 48, paddingHorizontal: 14, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  priceInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 20, fontWeight: "700" },

  // Photos
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  photoThumb: { width: 92, height: 92, borderRadius: 10, overflow: "hidden", position: "relative" },
  photoThumbImg: { width: "100%", height: "100%" },
  coverBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 3, alignItems: "center" },
  photoDeleteBtn: { position: "absolute", top: 5, right: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" },
  photoAddZone: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, padding: 24, alignItems: "center" },
  photoAddIcon: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  // Doc upload
  docUploadZone: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, padding: 16, flexDirection: "row", alignItems: "center" },
  removeDocBtn: { flexDirection: "row", alignItems: "center", marginTop: 10, alignSelf: "flex-start" },

  // Alert
  alertBox: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: "600", flex: 1, marginLeft: 8 },

  // Action buttons
  actionRow: { gap: 12, marginBottom: 40, marginTop: 4 },
  btnSave: { height: 52, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  btnCancel: { height: 52, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Skeleton
  skeletonLine: { borderRadius: 6, marginBottom: 12 },

  // Bottom sheet
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20,
  },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  sheetTitle: { fontSize: 17, marginBottom: 12 },
  sheetSearch: { height: 40, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8, marginBottom: 8 },
  sheetSearchInput: { flex: 1, fontSize: 14 },

  // Option row (shared between sheet and dropdown)
  optionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8,
  },

  // Desktop dropdown
  dropdown: {
    position: "absolute", borderWidth: 1, borderRadius: 12, padding: 8,
    zIndex: 9999999, elevation: 10000,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12,
  },
});