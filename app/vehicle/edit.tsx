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
import { VEHICLE_BRAND_OPTIONS, filterBrandGroups } from "@/constants/vehicle-brands";
import { Toast } from "@/components/Toast";

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

// Fuel type icons mapping - using the same custom image assets as sell.tsx
const FUEL_TYPE_ICONS: Record<string, any> = {
  Electric: require('@/assets/customericons/chargingelectric.png'),
  Hybrid: require('@/assets/customericons/hybrid.png'),
  Diesel: require('@/assets/customericons/diesel.png'),
  Petrol: require('@/assets/customericons/petrol-pump.png'),
  CNG: "cloud.fill", // Fallback to SF Symbol for CNG/LPG
  LPG: "cloud.fill",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => String(CURRENT_YEAR - i));

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
  const { t } = useTranslation();
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
  const [batteryRange, setBatteryRange] = useState("");
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [vehicleIdentificationDoc, setVehicleIdentificationDoc] = useState<string | null>(null);
  const [sellerType, setSellerType] = useState<'individual' | 'company' | undefined>(undefined);

  const [showYearSelector, setShowYearSelector] = useState(false);
  const [yearDropdownPos, setYearDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const yearTriggerRef = useRef<View>(null);

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
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  // ── Inventory (business sellers only, UI/local-storage feature) ────────────
  const [quantity, setQuantity] = useState("");
  const [differentColors, setDifferentColors] = useState(false);
  const [colorLabels, setColorLabels] = useState<{ color: string; count: string }[]>([
    { color: "", count: "" },
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [toast, setToast] = useState<{ title: string; body?: string; icon?: string } | null>(null);
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

  // Brands grouped by origin for the picker. Stored value is still the plain
  // brand name — grouping is display-only.
  const filteredBrandGroups = useMemo(() => filterBrandGroups(brandSearch), [brandSearch]);
  const hasBrandResults = useMemo(() => filteredBrandGroups.length > 0, [filteredBrandGroups]);

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

  const openYearSelector = () => { setShowYearSelector(true); setYearDropdownPos(getWebPos(yearTriggerRef)); };
  const handleSelectYear = (selected: string) => { setYear(selected); setShowYearSelector(false); };

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
          setBatteryRange((vehicle as any).batteryRange || "");
          setDriveType((vehicle as any).driveType || "");
          setBodyType((vehicle as any).bodyType || "");
          setVehicleIdentificationDoc((vehicle as any).vehicleIdentificationDoc || null);
          setSellerType(vehicle.sellerType);
          setStatus(vehicle.usageStatus || "");
          setMileage(vehicle.mileage?.toString() || "");
          setPrice(vehicle.price.toString());
          setLocation(vehicle.location || "");
          setDescription(vehicle.description || "");
          setImages(vehicle.images || []);

          // Prefill inventory (from backend) for this listing.
          const qty = Number((vehicle as any).quantity || 0);
          if (qty > 1) {
            setQuantity(String(qty));
            const labels = (vehicle as any).colorLabels;
            if (Array.isArray(labels) && labels.length > 0) {
              setDifferentColors(true);
              setColorLabels(labels.map((c: any) => ({ color: String(c.color), count: String(c.count) })));
            }
          }
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
    if (!color.trim()) missing.push("Color");
    if (!transmission.trim()) missing.push("Transmission");
    if (!status.trim()) missing.push("Status");
    if (!mileage.trim()) missing.push("Mileage");
    if (!price.trim()) missing.push("Price");
    if (!location.trim()) missing.push("Location");
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
      // Inventory for business sellers (backend-tracked). Sending quantity=1
      // clears tracking; the backend preserves already-sold units on edit.
      const qty = parseInt(quantity, 10);
      const isCompanyMulti = sellerType === 'company' && Number.isFinite(qty) && qty > 1;
      const inventoryColorLabels = isCompanyMulti
        ? (differentColors
            ? colorLabels
                .map((c) => ({ color: c.color.trim(), count: parseInt(c.count, 10) || 0 }))
                .filter((c) => c.color.length > 0 && c.count > 0)
            : color.trim()
              ? [{ color: color.trim(), count: qty }]
              : [])
        : [];

      await updateVehicle(id, {
        title: listingTitle.trim(), brand: brand.trim(), model: model.trim(), year: year.trim(),
        categoryId: selectedCategoryId,
        categorySlug: categories.find((c) => c.id === selectedCategoryId)?.slug,
        vehicleType: categories.find((c) => c.id === selectedCategoryId)?.name || "Car",
        bodyType: bodyType.trim() || undefined,
        fuelType: fuelType.trim(), color: color.trim(), transmission: transmission.trim(),
        usageStatus, mileage: mileage.trim(), price: parsedPrice,
        location: location.trim(),
        description: description.trim(),
        engineSize: fuelType === 'Electric' ? undefined : (engineSize.trim() || undefined),
        batteryRange: fuelType === 'Electric' ? (batteryRange.trim() || undefined) : undefined,
        driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc || undefined,
        images,
        quantity: sellerType === 'company' ? (isCompanyMulti ? qty : 1) : undefined,
        colorLabels: inventoryColorLabels,
      });

      setSubmitMessage({ type: "success", text: "Vehicle updated successfully." });
      setToast({ title: "Listing updated", body: "Your changes were saved successfully.", icon: "checkmark.circle.fill" });
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
      setToast({ title: "Update failed", body: errorMessage, icon: "exclamationmark.circle.fill" });
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

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      const message = "Please allow access to your camera.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Permission required", message);
      return;
    }
    if (images.length >= 6) {
      const message = "You can upload up to 6 images only.";
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) Alert.alert("Limit reached", message);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: false });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri as string].slice(0, 6));
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

  const handleTakeVehicleIdentificationDocPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      if (!isWeb) Alert.alert("Permission required", "Please allow access to your camera.");
      setSubmitMessage({ type: "error", text: "Please allow access to your camera." });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, base64: false });
    if (!result.canceled && result.assets[0]) setVehicleIdentificationDoc(result.assets[0].uri);
  };

  // Lets a slot in the 10-box image grid be filled from either the gallery or the camera.
  const handlePickImageForSlot = (index: number) => {
    Alert.alert("Add photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            setSubmitMessage({ type: "error", text: "Please allow access to your camera." });
            return;
          }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: false });
          if (!r.canceled && r.assets[0]) {
            const newImages = [...images];
            newImages[index] = r.assets[0].uri;
            setImages(newImages);
          }
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            setSubmitMessage({ type: "error", text: "Please allow access to your photo library." });
            return;
          }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.7, base64: false });
          if (!r.canceled && r.assets[0]) {
            const newImages = [...images];
            newImages[index] = r.assets[0].uri;
            setImages(newImages);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
      {!!toast && (
        <Toast
          visible={!!toast}
          title={toast.title}
          body={toast.body}
          icon={toast.icon}
          onHide={() => setToast(null)}
        />
      )}

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
            <SectionHead icon="photo" title="Vehicle Photos" subtitle="Upload photos in the order shown below" colors={colors} />

            {/* Info banner */}
            <View style={{ backgroundColor: `${colors.primary}12`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <IconSymbol name="info.circle.fill" size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <ThemedText style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 19 }}>
                The first image is your cover photo. Upload images in order for best results.
              </ThemedText>
            </View>

            {/* Labeled image boxes (10 boxes, 6 required) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {[
                { label: "Front View", required: true },
                { label: "Rear View", required: true },
                { label: "Driver Side", required: true },
                { label: "Passenger Side", required: true },
                { label: "Interior", required: true },
                { label: "Dashboard", required: true },
                { label: "Engine", required: false },
                { label: "Trunk/Boot", required: false },
                { label: "Wheel/Tire", required: false },
                { label: "Extra Detail", required: false },
              ].map((item, i) => (
                <View key={i} style={{ width: isDesktopWeb ? 'calc(20% - 8px)' as any : 'calc(50% - 5px)' as any }}>
                  <TouchableOpacity
                    style={[{
                      aspectRatio: 1,
                      borderRadius: 12,
                      borderWidth: images[i] ? 0 : 1.5,
                      borderStyle: images[i] ? 'solid' : 'dashed',
                      borderColor: colors.border,
                      backgroundColor: images[i] ? colors.card : colors.background,
                      overflow: 'hidden',
                      position: 'relative',
                    }]}
                    onPress={() => {
                      if (images[i]) return; // Don't allow re-upload in same slot
                      handlePickImageForSlot(i);
                    }}
                    activeOpacity={0.8}
                  >
                    {images[i] ? (
                      <>
                        <Image source={{ uri: resolveImageUrl(images[i]) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: 12,
                            width: 24,
                            height: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => handleDeleteImage(i)}
                        >
                          <IconSymbol name="xmark" size={14} color="#EF4444" />
                        </TouchableOpacity>
                        {i === 0 && (
                          <View style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            paddingVertical: 4,
                            alignItems: 'center',
                          }}>
                            <ThemedText style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.3 }}>COVER</ThemedText>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 }}>
                        <IconSymbol name="plus.circle.fill" size={26} color={colors.primary} style={{ opacity: 0.6 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <ThemedText style={{ fontSize: 11, color: colors.icon, textAlign: 'center' }}>
                      {item.label}
                    </ThemedText>
                    {item.required && <ThemedText style={{ fontSize: 11, color: '#EF4444' }}>*</ThemedText>}
                  </View>
                </View>
              ))}
            </View>

            {/* Quick action buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }]}
                onPress={handlePickImages}
                activeOpacity={0.8}
              >
                <IconSymbol name="photo.on.rectangle" size={18} color={colors.primary} />
                <ThemedText style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Choose Multiple
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                }]}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <IconSymbol name="camera.fill" size={18} color={colors.primary} />
                <ThemedText style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Take Photo
                </ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 16, textAlign: 'center' }}>
              Upload your best photo first — it will become the cover image displayed on search results and cards.
            </ThemedText>
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
                  <SelectorTrigger value={year} placeholder="Select year" onPress={openYearSelector}
                    colors={colors} open={showYearSelector} isDesktopWeb={isDesktopWeb} triggerRef={yearTriggerRef} />
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
                  <View ref={fuelTypeTriggerRef} collapsable={false}>
                    <TouchableOpacity
                      style={[S.selectorTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={openFuelTypeSelector} activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 8 }}>
                        {fuelType && FUEL_TYPE_ICONS[fuelType] ? (
                          typeof FUEL_TYPE_ICONS[fuelType] === "string" ? (
                            <IconSymbol name={FUEL_TYPE_ICONS[fuelType]} size={16} color={colors.primary} />
                          ) : (
                            <Image source={FUEL_TYPE_ICONS[fuelType]} style={{ width: 18, height: 18 }} contentFit="contain" />
                          )
                        ) : null}
                        <ThemedText style={{ color: fuelType ? colors.text : colors.icon, fontSize: 14 }}>
                          {fuelType || "Select fuel type"}
                        </ThemedText>
                      </View>
                      <IconSymbol name={showFuelTypeSelector && isDesktopWeb ? "chevron.up" : "chevron.down"} size={16} color={colors.icon} />
                    </TouchableOpacity>
                  </View>
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
                {fuelType === "Electric" ? (
                  <Field label="Battery Range (km)">
                    <TextInput
                      style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. 400" placeholderTextColor={colors.icon} keyboardType="numeric"
                      value={batteryRange} onChangeText={setBatteryRange}
                    />
                  </Field>
                ) : (
                  <Field label="Engine Size">
                    <TextInput
                      style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. 2.0L, 1500cc" placeholderTextColor={colors.icon}
                      value={engineSize} onChangeText={setEngineSize}
                    />
                  </Field>
                )}
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

            <Field label="Color" required>
              <SelectorTrigger
                value={color} placeholder="Select color" onPress={openColorSelector}
                colors={colors} open={showColorSelector} isDesktopWeb={isDesktopWeb} triggerRef={colorTriggerRef}
                colorDot={color ? (COLOR_DOTS[color] ?? undefined) : undefined}
              />
            </Field>

            <View style={[S.divider, { backgroundColor: colors.border }]} />

            <View style={S.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Usage Status" required>
                  <ChipGroup
                    options={USAGE_STATUS_OPTIONS}
                    value={status}
                    onChange={(v) => {
                      setStatus(v);
                      // Brand new cars have no mileage — force 0 and lock the field.
                      if (v === "Brand New") setMileage("0");
                      else if (mileage === "0") setMileage("");
                    }}
                    colors={colors}
                  />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Field label="Mileage (km)" required>
                  <TextInput
                    style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, opacity: status === "Brand New" ? 0.5 : 1 }]}
                    value={status === "Brand New" ? "0" : mileage} onChangeText={setMileage} placeholder="0" placeholderTextColor={colors.icon} keyboardType="numeric"
                    editable={status !== "Brand New"}
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

            <Field label="Location" required>
              <TextInput
                style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={location} onChangeText={setLocation} placeholder="e.g. Kigali, Rwanda"
                placeholderTextColor={colors.icon}
              />
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

          {/* ══════════ INVENTORY — business/company sellers only (local UI feature) ══════════ */}
          {sellerType === 'company' && (
          <FormCard colors={colors}>
            <SectionHead icon="square.grid.2x2" title={t("sell.inventoryTitle")} subtitle={t("sell.inventorySubtitle")} colors={colors} />

            <Field label={t("sell.quantityLabel")} hint={t("sell.quantityHint")}>
              <TextInput
                style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder={t("sell.quantityPlaceholder")}
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
                value={quantity}
                onChangeText={(v) => setQuantity(v.replace(/[^0-9]/g, ''))}
              />
            </Field>

            {(parseInt(quantity, 10) || 0) > 1 && (
              <>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
                  activeOpacity={0.7}
                  onPress={() => setDifferentColors((prev) => !prev)}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <ThemedText style={S.fieldLabel}>{t("sell.differentColorsLabel")}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>
                      {t("sell.differentColorsHint")}
                    </ThemedText>
                  </View>
                  <View style={{
                    width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center',
                    backgroundColor: differentColors ? colors.primary : colors.border,
                  }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: differentColors ? 'flex-end' : 'flex-start' }} />
                  </View>
                </TouchableOpacity>

                {differentColors ? (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    {colorLabels.map((row, idx) => (
                      <View key={`color-row-${idx}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TextInput
                          style={[S.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder={t("sell.colorLabelPlaceholder")}
                          placeholderTextColor={colors.icon}
                          value={row.color}
                          onChangeText={(v) => setColorLabels((prev) => prev.map((r, i) => i === idx ? { ...r, color: v } : r))}
                        />
                        <TextInput
                          style={[S.input, { width: 76, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder={t("sell.qtyShort")}
                          placeholderTextColor={colors.icon}
                          keyboardType="numeric"
                          value={row.count}
                          onChangeText={(v) => setColorLabels((prev) => prev.map((r, i) => i === idx ? { ...r, count: v.replace(/[^0-9]/g, '') } : r))}
                        />
                        {colorLabels.length > 1 && (
                          <TouchableOpacity onPress={() => setColorLabels((prev) => prev.filter((_, i) => i !== idx))}>
                            <IconSymbol name="trash" size={18} color={colors.icon} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
                      onPress={() => setColorLabels((prev) => [...prev, { color: "", count: "" }])}
                    >
                      <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
                      <ThemedText style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                        {t("sell.addColor")}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  !!color.trim() && (
                    <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 8 }}>
                      {t("sell.sameColorHint", { count: parseInt(quantity, 10) || 0, color })}
                    </ThemedText>
                  )
                )}
              </>
            )}
          </FormCard>
          )}

          {/* ══════════ VEHICLE ID DOCUMENT — not required for company/business listings ══════════ */}
          {sellerType !== 'company' && (
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
              <View>
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
                <TouchableOpacity style={S.removeDocBtn} onPress={handleTakeVehicleIdentificationDocPhoto}>
                  <IconSymbol name="camera.fill" size={13} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12, color: colors.primary, marginLeft: 5, fontWeight: "600" }}>Take Photo Instead</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </FormCard>
          )}

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
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Color</ThemedText>
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
              {!hasBrandResults ? (
                <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No brands found matching "{brandSearch}"</ThemedText>
              ) : filteredBrandGroups.map((group) => (
                <View key={group.region}>
                  <ThemedText style={[S.brandGroupHeader, { color: colors.icon }]}>{group.region}</ThemedText>
                  {group.brands.map((opt) => (
                    <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBrand(opt)}>
                      <ThemedText style={{ fontSize: 14, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                      {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
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
              {filteredBrandGroups.map((group) => (
                <View key={group.region}>
                  <ThemedText style={[S.brandGroupHeader, { color: colors.icon }]}>{group.region}</ThemedText>
                  {group.brands.map((opt) => (
                    <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectBrand(opt)}>
                      <ThemedText style={{ fontSize: 14, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                      {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    {FUEL_TYPE_ICONS[opt] ? (
                      typeof FUEL_TYPE_ICONS[opt] === "string" ? (
                        <IconSymbol name={FUEL_TYPE_ICONS[opt]} size={16} color={fuelType === opt ? colors.primary : colors.icon} />
                      ) : (
                        <Image source={FUEL_TYPE_ICONS[opt]} style={{ width: 18, height: 18 }} contentFit="contain" />
                      )
                    ) : null}
                    <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                  </View>
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    {FUEL_TYPE_ICONS[opt] ? (
                      typeof FUEL_TYPE_ICONS[opt] === "string" ? (
                        <IconSymbol name={FUEL_TYPE_ICONS[opt]} size={16} color={fuelType === opt ? colors.primary : colors.icon} />
                      ) : (
                        <Image source={FUEL_TYPE_ICONS[opt]} style={{ width: 18, height: 18 }} contentFit="contain" />
                      )
                    ) : null}
                    <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                  </View>
                  {fuelType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Year ── */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showYearSelector} onRequestClose={() => setShowYearSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setShowYearSelector(false)} />
          <Pressable style={[S.sheet, { backgroundColor: colors.background, height: selectorSheetHeight }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
            <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Year</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}>
              {YEAR_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, year === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectYear(opt)}>
                  <ThemedText style={{ fontSize: 14, color: year === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {year === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Modal>
      )}
      {isDesktopWeb && showYearSelector && yearDropdownPos && (
        <Modal transparent visible={showYearSelector} onRequestClose={() => setShowYearSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowYearSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: yearDropdownPos.top, left: yearDropdownPos.left, width: Math.max(yearDropdownPos.width, 140) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
              {YEAR_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, year === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectYear(opt)}>
                  <ThemedText style={{ fontSize: 14, color: year === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                  {year === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
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
  cameraBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12, marginTop: 10 },

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
  brandGroupHeader: {
    fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6,
    paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6, opacity: 0.7,
  },

  // Desktop dropdown
  dropdown: {
    position: "absolute", borderWidth: 1, borderRadius: 12, padding: 8,
    zIndex: 9999999, elevation: 10000,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12,
  },
});