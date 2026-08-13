import { StyleSheet, TextInput, ScrollView, View, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, Pressable, Animated, Easing, Button } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { pollPaymentUntilResolved, checkCanListVehicle, payListingFee, cancelPayment, fetchConfigPrices } from '@/lib/api-subscriptions';

import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { createVehicle } from "@/lib/api-vehicles";
import { SellSEO } from "@/components/page-meta";
import { getAuthUser, logout, updateStoredAuthUser, type AuthUser } from '@/lib/userPreference';
import { fetchCategories, type Category } from "@/lib/api-categories";
import { fetchMyVerificationStatus } from "@/lib/api-verifications";
import { filterBrandGroups } from "@/constants/vehicle-brands";
import { PaymentModal } from '@/components/PaymentModal';
import { PaymentProcessingModal } from '@/components/PaymentProcessingModal';
import { PaymentExplainerModal } from '@/components/PaymentExplainerModal';
import { Toast } from '@/components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_COLOR_OPTIONS = [
  "Pearl White", "Silver", "Black", "Red", "Blue", "Gray", "White", "Green",
  "Yellow", "Orange", "Brown", "Gold", "Beige", "Navy", "Purple",
] as const;

const COLOR_DOTS: Record<string, string> = {
  "Pearl White": "#F5F5F0", Silver: "#C0C0C0", Black: "#1a1a1a", Red: "#DC2626",
  Blue: "#2563EB", Gray: "#6B7280", White: "#FFFFFF", Green: "#16A34A",
  Yellow: "#EAB308", Orange: "#EA580C", Brown: "#92400E", Gold: "#D97706",
  Beige: "#D4C5A9", Navy: "#1E3A5F", Purple: "#7C3AED",
};

const FUEL_TYPE_OPTIONS = ["Petrol", "Diesel", "Hybrid", "Electric", "CNG", "LPG"] as const;

// Fuel type icons mapping - using custom image assets
const FUEL_TYPE_ICONS: Record<string, any> = {
  Electric: require('@/assets/customericons/chargingelectric.png'),
  Hybrid: require('@/assets/customericons/hybrid.png'),
  Diesel: require('@/assets/customericons/diesel.png'),
  Petrol: require('@/assets/customericons/petrol-pump.png'),
  CNG: "cloud.fill", // Fallback to SF Symbol for CNG/LPG
  LPG: "cloud.fill",
};
const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "Semi-Automatic", "CVT"] as const;
const DRIVE_TYPE_OPTIONS = ["Front Wheel Drive (FWD)", "Rear Wheel Drive (RWD)", "All Wheel Drive (AWD)", "Four Wheel Drive (4WD)"] as const;
const BODY_TYPE_OPTIONS = ["SUVs & Crossovers", "Trucks", "Sedans", "Coupes", "Minivans", "Hatchbacks", "Convertibles", "Station wagons"] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => String(CURRENT_YEAR - i));

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

function FormCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function SectionHead({ icon, title, subtitle, colors }: { icon: string; title: string; subtitle?: string; colors: any }) {
  return (
    <View style={S.sectionHeadRow}>
      <View style={[S.sectionIconBadge, { backgroundColor: `${colors.primary}18` }]}>
        <IconSymbol name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold" style={S.sectionHeadTitle}>{title}</ThemedText>
        {subtitle ? <ThemedText style={[S.sectionHeadSub, { color: colors.icon }]}>{subtitle}</ThemedText> : null}
      </View>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
        <ThemedText style={S.fieldLabel}>{label}</ThemedText>
        {required && <ThemedText style={{ color: "#EF4444", fontSize: 12, marginLeft: 2 }}>*</ThemedText>}
      </View>
      {children}
    </View>
  );
}

function SelectorTrigger({ value, placeholder, onPress, colors, open, isDesktopWeb, triggerRef, colorDot }: {
  value: string; placeholder: string; onPress: () => void; colors: any;
  open?: boolean; isDesktopWeb?: boolean; triggerRef?: React.RefObject<View>; colorDot?: string;
}) {
  return (
    <View ref={triggerRef} collapsable={false}>
      <TouchableOpacity
        style={[S.selectorTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={onPress} activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 8 }}>
          {colorDot ? <View style={[S.colorDotInline, { backgroundColor: colorDot, borderColor: colors.border }]} /> : null}
          <ThemedText style={{ color: value ? colors.text : colors.icon, fontSize: 14 }}>
            {value || placeholder}
          </ThemedText>
        </View>
        <IconSymbol name={open && isDesktopWeb ? "chevron.up" : "chevron.down"} size={16} color={colors.icon} />
      </TouchableOpacity>
    </View>
  );
}

function ChipGroup({ options, value, onChange, colors }: { options: readonly string[]; value: string; onChange: (v: string) => void; colors: any }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <TouchableOpacity key={opt} onPress={() => onChange(opt)}
            style={[S.chip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? `${colors.primary}18` : colors.background }]}>
            <ThemedText style={{ fontSize: 12, fontWeight: sel ? "700" : "400", color: sel ? colors.primary : colors.text }}>{opt}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Step Progress ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Photos", icon: "photo" },
  { id: 2, label: "Vehicle", icon: "car.fill" },
  { id: 3, label: "Specs", icon: "gearshape.fill" },
  { id: 4, label: "Pricing", icon: "tag.fill" },
];

function StepProgress({ step, colors }: { step: number; colors: any }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: (step - 1) / (STEPS.length - 1),
      duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [step]);
  return (
    <View style={P.wrap}>
      <View style={[P.track, { backgroundColor: colors.border }]} />
      <Animated.View style={[P.fill, { backgroundColor: colors.primary, width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      <View style={P.dots}>
        {STEPS.map((s) => {
          const done = step > s.id; const active = step === s.id;
          return (
            <View key={s.id} style={P.dotCol}>
              <View style={[P.dot, {
                backgroundColor: done ? colors.primary : colors.background,
                borderColor: done || active ? colors.primary : colors.border,
                borderWidth: active ? 2.5 : 1.5,
              }]}>
                {done
                  ? <IconSymbol name="checkmark" size={10} color="#fff" />
                  : <IconSymbol name={s.icon as any} size={11} color={active ? colors.primary : colors.icon} />}
              </View>
              <ThemedText style={[P.dotLabel, { color: active ? colors.primary : done ? colors.icon : colors.icon, fontWeight: active ? "700" : "400" }]}>
                {s.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const P = StyleSheet.create({
  wrap: { marginBottom: 24, paddingHorizontal: 4, position: "relative" },
  track: { position: "absolute", top: 15, left: 20, right: 20, height: 1.5, borderRadius: 2 },
  fill: { position: "absolute", top: 15, left: 20, height: 1.5, borderRadius: 2 },
  dots: { flexDirection: "row", justifyContent: "space-between" },
  dotCol: { alignItems: "center", gap: 6, width: 56 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dotLabel: { fontSize: 10, letterSpacing: 0.2, textAlign: "center" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SellScreen() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document !== "undefined") document.title = t("sell.pageTitle");
  }, [t]);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;
  const sellContainerMaxWidth = isWebXl ? 980 : isWebLg ? 920 : isWebMd ? 840 : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;
  const [sellerType, setSellerType] = useState<string>("")
  const [companyHasSub, setCompanyHasSub] = useState<boolean | null>(null);

  // ── Auth & verification ──────────────────────────────────────────────────
  const [userRole, setUserRole] = useState<"buyer" | "seller" | "admin" | "loading">("loading");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingVerification, setChecking] = useState(false);
  const [verificationStatus, setVStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [verificationReviewNote, setReviewNote] = useState<string>("");

  // ── Form step ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [toast, setToast] = useState<{ title: string; body?: string; icon?: string } | null>(null);
  // Persisted success confirmation shown after a listing is submitted (instead of a fleeting toast).
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // ── Step 1: Photos & ID doc ───────────────────────────────────────────────
  const [images, setImages] = useState<string[]>([]);
  const [vehicleIdentificationDoc, setVehicleIdentificationDoc] = useState<string | null>(null);

  // ── Step 2: Vehicle info ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // ── Step 3: Tech specs ────────────────────────────────────────────────────
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [batteryRange, setBatteryRange] = useState("");
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [color, setColor] = useState("");
  const [usageStatus, setUsageStatus] = useState("");
  const [mileage, setMileage] = useState("");

  // ── Step 4: Pricing & details ─────────────────────────────────────────────
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  // ── Inventory (business sellers only, UI/local-storage feature) ────────────
  const [quantity, setQuantity] = useState("");
  const [differentColors, setDifferentColors] = useState(false);
  const [colorLabels, setColorLabels] = useState<{ color: string; count: string }[]>([
    { color: "", count: "" },
  ]);
  const [location, setLocation] = useState("");
  const [providesAssurance, setProvidesAssurance] = useState(false);

  // ── Selector states ───────────────────────────────────────────────────────
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [yearDropdownPos, setYearDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const yearTriggerRef = useRef<View>(null);

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

  const [isRequesting, setIsRequesting] = useState(false);
  const [sellerContact, setSellerContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [phone, setPhone] = useState<string>("")
  const [email, setEmails] = useState<string>("")

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Non-invasive explainer shown BEFORE the real payment modal. It never starts
  // a payment — accepting it simply opens the existing PaymentModal unchanged.
  const [showPaymentExplainer, setShowPaymentExplainer] = useState(false);
  const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentPurpose, setPaymentPurpose] = useState<'verification_fee' | 'listing_fee'>('listing_fee');
  const [configPrices, setConfigPrices] = useState<Record<string, string>>({});

  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    fetchConfigPrices()
      .then(r => {
        setConfigPrices(r.data?.prices || {});
        setPricesLoaded(true);
      })
      .catch(() => setPricesLoaded(false));
  }, []);

  // A missing/failed config fetch used to render the plans as "RWF 0", which
  // reads as a free listing. Resolve prices through a checked accessor instead
  // and block the payment modal until we actually have real numbers.
  const priceOf = useCallback((key: string): number => {
    const n = Number(configPrices[key]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [configPrices]);

  const listingFeeSingle = priceOf('listing_fee_single');
  const listingFeeBundle3 = priceOf('listing_fee_bundle_3');
  const hasValidPricing = pricesLoaded && listingFeeSingle > 0;

  // ── Filtered option lists ─────────────────────────────────────────────────
  const filteredColorOptions = useMemo(() => {
    const q = colorSearch.trim().toLowerCase();
    return !q ? PRIMARY_COLOR_OPTIONS : PRIMARY_COLOR_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [colorSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return !q ? categories : categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categorySearch, categories]);

  // Brands grouped by origin (Japanese, Korean, …) for the picker. The stored
  // value is still just the brand name — grouping is display-only.
  const filteredBrandGroups = useMemo(() => filterBrandGroups(brandSearch), [brandSearch]);
  const hasBrandResults = useMemo(() => filteredBrandGroups.length > 0, [filteredBrandGroups]);

  const filteredBodyTypes = useMemo(() => {
    const q = bodyTypeSearch.trim().toLowerCase();
    return !q ? BODY_TYPE_OPTIONS : BODY_TYPE_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [bodyTypeSearch]);

  const filteredFuelTypes = useMemo(() => {
    const name = (categories.find((c) => c.id === selectedCategoryId)?.name ?? "").toLowerCase();
    if (name === "full electric car" || name === "electric motorcycle") return ["Electric"];
    if (name === "petrol car") return ["Petrol"];
    if (name === "hybrid car") return ["Hybrid"];
    if (name === "motorcycle" || name === "scooter") return ["Petrol"];
    if (name === "truck" || name === "bus") return ["Diesel"];
    return [...FUEL_TYPE_OPTIONS];
  }, [selectedCategoryId, categories]);

  const selectedCategoryName = useMemo(() => categories.find((c) => c.id === selectedCategoryId)?.name ?? "", [categories, selectedCategoryId]);

  // ── Web position helper ───────────────────────────────────────────────────
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

  // ── Selector openers ──────────────────────────────────────────────────────
  const openYearSelector = () => { setShowYearSelector(true); setYearDropdownPos(getWebPos(yearTriggerRef)); };
  const handleSelectYear = (v: string) => { setYear(v); setShowYearSelector(false); };

  const openColorSelector = () => { setColorSearch(""); setShowColorSelector(true); setDropdownPos(getWebPos(colorTriggerRef)); };
  const handleSelectColor = (v: string) => { setColor(v); setShowColorSelector(false); };




  useEffect(() => {
    
    let mounted = true;
    const loadData = async () => {
      try {
      
        const user = await getAuthUser();

        if (mounted) {
       
          setAuthUser(user);
        }
      } catch (err) {
        console.error('Failed to load vehicle:', err);
      } finally {
        // if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);






  const openCategorySelector = () => { setCategorySearch(""); setShowCategorySelector(true); setCategoryDropdownPos(getWebPos(categoryTriggerRef)); };
  const handleSelectCategory = (id: string) => {
    setSelectedCategoryId(id); setShowCategorySelector(false);
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      const name = cat.name?.toLowerCase() || "";
      if (name === "full electric car" || name === "electric motorcycle") { setFuelType("Electric"); setTransmission("Automatic"); }
      else if (name === "petrol car") { setFuelType("Petrol"); setTransmission("Automatic"); }
      else if (name === "hybrid car") { setFuelType("Hybrid"); setTransmission("Automatic"); }
      else if (name === "motorcycle" || name === "scooter") { setFuelType("Petrol"); setTransmission("Manual"); }
      else if (name === "truck" || name === "bus") { setFuelType("Diesel"); setTransmission("Manual"); }
    }
  };

  const openBrandSelector = () => { setBrandSearch(""); setShowBrandSelector(true); setBrandDropdownPos(getWebPos(brandTriggerRef)); };
  const handleSelectBrand = (v: string) => { setBrand(v); setShowBrandSelector(false); };

  const openFuelTypeSelector = () => { setShowFuelTypeSelector(true); setFuelTypeDropdownPos(getWebPos(fuelTypeTriggerRef)); };
  const handleSelectFuelType = (v: string) => { setFuelType(v); setShowFuelTypeSelector(false); };

  const openTransmissionSelector = () => { setShowTransmissionSelector(true); setTransmissionDropdownPos(getWebPos(transmissionTriggerRef)); };
  const handleSelectTransmission = (v: string) => { setTransmission(v); setShowTransmissionSelector(false); };

  const openDriveTypeSelector = () => { setShowDriveTypeSelector(true); setDriveTypeDropdownPos(getWebPos(driveTypeTriggerRef)); };
  const handleSelectDriveType = (v: string) => { setDriveType(v); setShowDriveTypeSelector(false); };

  const openBodyTypeSelector = () => { setBodyTypeSearch(""); setShowBodyTypeSelector(true); setBodyTypeDropdownPos(getWebPos(bodyTypeTriggerRef)); };
  const handleSelectBodyType = (v: string) => { setBodyType(v); setShowBodyTypeSelector(false); };

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCategories().then((r) => setCategories(r.data.categories)).catch(() => setCategories([]));
  }, []);

  // ── Auth check on focus ───────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      getAuthUser().then(async (user) => {
        if (!user) { router.replace("/auth/register?role=seller"); return; }
        setUserRole(user.role);
        setAuthUser(user);
        setPhone(user.phone || "");
        setEmails(user.email || "");
        if (user.role === "seller") {
          setSellerType(user?.sellerType || "");
          setChecking(true);
          try {
            const verification = await fetchMyVerificationStatus();
            if (!verification) {
              setVStatus(user.isVerifiedSeller ? "approved" : "none");
              setReviewNote("");
            } else {
              setVStatus(verification.status);
              setReviewNote(verification.reviewNote || "");
            }
          } catch {
            setVStatus(user.isVerifiedSeller ? "approved" : "none");
            setReviewNote("");
          } finally {
            setChecking(false);
          }
          // For company sellers, check subscription status up-front so we can
          // show a proper guard screen instead of silently redirecting on submit.
          if (user?.sellerType === 'company') {
            try {
              const canListRes = await checkCanListVehicle().catch(() => null);
              setCompanyHasSub(canListRes?.data?.canList ?? null);
            } catch {
              setCompanyHasSub(null);
            }
          }
        } else {
          setVStatus("approved");
        }
      });
    }, []),
  );

  // ── Image picking ─────────────────────────────────────────────────────────
  const handlePickImages = async () => {
    // "Choose Multiple" and the per-slot boxes share one images array, so mixing
    // them would scramble the slot order — ask the user to clear slots first.
    if (images.some((img) => !!img)) {
      setToast({
        title: t("sell.removeIndividualImagesTitle"),
        body: t("sell.removeIndividualImagesBody"),
        icon: "exclamationmark.circle.fill",
      });
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("sell.permissionRequired"), t("sell.photoLibraryPermissionMsg")); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.7, base64: false, selectionLimit: 10 });
    if (r.canceled) return;
    const picked = r.assets.filter((a) => !!a.uri).map((a) => a.uri as string);
    // Fill the labelled slots in order, keeping each image in its own position.
    setImages((prev) => {
      const next = [...prev];
      let p = 0;
      for (let i = 0; i < 10 && p < picked.length; i++) {
        if (!next[i]) next[i] = picked[p++];
      }
      return next;
    });
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("sell.permissionRequired"), t("sell.cameraPermissionMsg")); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: false });
    if (!r.canceled && r.assets[0]) setImages((p) => [...p, r.assets[0].uri as string].slice(0, 10));
  };

  const handleRemoveImage = (index: number) => setImages((p) => p.filter((_, i) => i !== index));

  const handlePickVehicleIdentificationDoc = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("sell.permissionRequired"), t("sell.photoLibraryPermissionMsg")); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.8, base64: false });
    if (!r.canceled && r.assets[0]) setVehicleIdentificationDoc(r.assets[0].uri);
  };

  const handleTakeVehicleIdentificationDocPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("sell.permissionRequired"), t("sell.cameraPermissionMsg")); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, base64: false });
    if (!r.canceled && r.assets[0]) setVehicleIdentificationDoc(r.assets[0].uri);
  };

  // Fill a single slot in the labelled image grid from the gallery.
  const fillSlotFromGallery = async (index: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setSubmitMessage({ type: "error", text: t("sell.photoLibraryPermissionMsg") });
      if (!isWeb) Alert.alert(t("sell.permissionRequired"), t("sell.photoLibraryPermissionMsg"));
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.7, base64: false });
    if (!r.canceled && r.assets[0]) {
      setImages((prev) => {
        const next = [...prev];
        next[index] = r.assets[0].uri;
        return next;
      });
    }
  };

  // Fill a single slot from the camera.
  const fillSlotFromCamera = async (index: number) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setSubmitMessage({ type: "error", text: t("sell.cameraPermissionMsg") });
      if (!isWeb) Alert.alert(t("sell.permissionRequired"), t("sell.cameraPermissionMsg"));
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: false });
    if (!r.canceled && r.assets[0]) {
      setImages((prev) => {
        const next = [...prev];
        next[index] = r.assets[0].uri;
        return next;
      });
    }
  };

  // Lets a slot in the 10-box image grid be filled from either the gallery or the camera.
  // Alert.alert with multiple buttons is unsupported on web, so open the gallery directly there.
  const handlePickImageForSlot = (index: number) => {
    if (isWeb) {
      fillSlotFromGallery(index);
      return;
    }
    Alert.alert(t("sell.addPhotoTitle"), t("sell.chooseOptionMsg"), [
      { text: t("sell.takePhoto"), onPress: () => fillSlotFromCamera(index) },
      { text: t("sell.chooseFromGallery"), onPress: () => fillSlotFromGallery(index) },
      { text: t("sell.cancel"), style: "cancel" },
    ]);
  };

  // ── Step animation ────────────────────────────────────────────────────────
  const animateStep = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -18, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
    setStep(next);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep = (): string | null => {
    if (step === 1) return images.filter(Boolean).length === 0 ? t("sell.errAddPhoto") : null;
    if (step === 2) {
      if (!title.trim()) return t("sell.errTitleRequired");
      if (!brand.trim()) return t("sell.errSelectBrand");
      if (!model.trim()) return t("sell.errEnterModel");
      if (!year.trim()) return t("sell.errEnterYear");
      if (!selectedCategoryId) return t("sell.errSelectCategory");
      return null;
    }
    if (step === 3) {
      if (!fuelType) return t("sell.errSelectFuelType");
      if (!transmission) return t("sell.errSelectTransmission");
      if (!color) return t("sell.errSelectColor");
      if (!usageStatus) return t("sell.errSelectUsageStatus");
      if (!mileage.trim()) return t("sell.errEnterMileage");
      return null;
    }
    if (step === 4) {
      if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) return t("sell.errValidPrice");
      if (!location.trim()) return t("sell.errEnterLocation");
      if (!description.trim()) return t("sell.errAddDescription");
      return null;
    }
    return null;
  };

  const handleNext = () => {
    setSubmitMessage(null);
    const err = validateStep();
    if (err) { setSubmitMessage({ type: "error", text: err }); if (!isWeb) Alert.alert(t("sell.missingInfoTitle"), err); return; }
    if (step < 4) { animateStep(step + 1); return; }
    handleSubmit();
  };
  const checkAccountType = async () => {
    router.push("/verify/phone");
  }

  const paymentCancelSignalRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const currentReferenceIdRef = useRef<string | null>(null);

  // Every terminal branch below funnels through here so the processing modal can
  // never be left spinning: it always ends up either closed or on a final state
  // the user can dismiss.
  const finishPayment = (
    status: 'success' | 'failed',
    message: string,
    onClosed?: () => void | Promise<void>,
  ) => {
    setPaymentStatus(status);
    setPaymentMessage(message);
    setTimeout(async () => {
      setShowPaymentProcessing(false);
      await onClosed?.();
    }, status === 'success' ? 2000 : 3000);
  };

  const handlePaymentConfirm = async (phoneNumber: string, planId?: string) => {
    try {
      setShowPaymentModal(false);
      setPaymentStatus('processing');
      setPaymentMessage(t("sell.paymentApproveMsg"));
      setShowPaymentProcessing(true);
      setIsRequesting(true);
      paymentCancelSignalRef.current.cancelled = false;

      const bundleSize = planId === 'bundle3' ? 3 : 1;
      const result = await payListingFee(phoneNumber, bundleSize) as any;

      // No referenceId means the charge was never initiated. Treating that as
      // success (the old behaviour) handed out a free listing and desynced the
      // credit balance, so fail loudly instead.
      if (!result?.data?.referenceId) {
        finishPayment('failed', t("sell.unableToProcessListingFeeMsg"));
        return;
      }

      currentReferenceIdRef.current = result.data.referenceId;
      const finalStatus = await pollPaymentUntilResolved(result.data.referenceId, {
        intervalMs: 4000,
        maxAttempts: 45,
        cancelSignal: paymentCancelSignalRef.current,
      });

      // The user may have hit Cancel while the last poll was in flight — that
      // already closed the modal, so don't reopen it or submit the listing.
      if (paymentCancelSignalRef.current.cancelled) return;

      if (finalStatus.data.paymentStatus === 'successful') {
        finishPayment('success', t("sell.listingFeePaidMsg"), handleSubmitVehicle);
      } else if (finalStatus.data.paymentStatus === 'failed') {
        finishPayment('failed', finalStatus.data.failureReason || t("sell.transactionFailedMsg"));
      } else {
        finishPayment('failed', t("sell.paymentStillProcessingMsg"));
      }
    } catch (err: any) {
      finishPayment('failed', err?.message || t("sell.unableToProcessListingFeeMsg"));
    } finally {
      setIsRequesting(false);
      currentReferenceIdRef.current = null;
    }
  };

  const handleDismissPayment = async () => {
    // Stop the poll first: cancelPayment can be slow (or fail) and the modal
    // must close regardless of what the network does.
    paymentCancelSignalRef.current.cancelled = true;
    setShowPaymentProcessing(false);
    setIsRequesting(false);

    const refId = currentReferenceIdRef.current;
    if (refId) {
      try {
        await cancelPayment(refId);
      } catch (_) {
        // best-effort
      }
    }
  };
  
  // ── Submit Vehicle (after payment check or directly for company) ───────────
  const handleSubmitVehicle = async () => {
    try {
      setIsSubmitting(true);

      // Business sellers can list several identical cars — send quantity + optional
      // per-colour breakdown so the backend tracks remaining stock.
      const qty = parseInt(quantity, 10);
      const isCompanyMulti = authUser?.sellerType === 'company' && Number.isFinite(qty) && qty > 1;
      const inventoryColorLabels = isCompanyMulti
        ? (differentColors
            ? colorLabels
                .map((c) => ({ color: c.color.trim(), count: parseInt(c.count, 10) || 0 }))
                .filter((c) => c.color.length > 0 && c.count > 0)
            : color.trim()
              ? [{ color: color.trim(), count: qty }]
              : undefined)
        : undefined;

      await createVehicle({
        title: title.trim(), brand: brand.trim(), model: model.trim(), year: year.trim(),
        categoryId: selectedCategoryId,
        categorySlug: categories.find((c) => c.id === selectedCategoryId)?.slug,
        vehicleType: categories.find((c) => c.id === selectedCategoryId)?.name || "Car",
        bodyType: bodyType.trim() || undefined, fuelType, color, transmission,
        usageStatus: usageStatus.trim() as "Brand New" | "Imported Used" | "Used In Rwanda",
        mileage: mileage.trim(), price: Number(price),
        description: description.trim(), location: location.trim(), images: images.filter(Boolean),
        engineSize: fuelType === 'Electric' ? undefined : (engineSize.trim() || undefined),
        batteryRange: fuelType === 'Electric' ? (batteryRange.trim() || undefined) : undefined,
        driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc ?? undefined,
        isBrokered: Boolean(authUser?.isBroker),
        quantity: isCompanyMulti ? qty : undefined,
        colorLabels: inventoryColorLabels,
      } as any);

      // NOTE: the listing credit is consumed server-side inside createVehicle
      // (see VehicleController). Calling consumeListingCredit() here as well
      // burned a second credit per listing and, once the balance hit zero, made
      // a *successful* submission report "No listing credits available" after
      // the seller had already been charged.
      const msg = t("sell.submissionSuccessMsg");
      setSubmitMessage({ type: "success", text: msg });
      setToast({ title: t("sell.listingSubmittedToastTitle"), body: msg, icon: "checkmark.circle.fill" });
      // Show a persisted confirmation (with a clear next step) instead of a
      // fleeting toast + immediate redirect, so the user knows what happens next.
      setShowSubmitSuccess(true);
    } catch (err: any) {
      const msg = err?.message ?? t("sell.errSubmitListing");
      if (msg.includes("Invalid or expired session token") || msg.includes("Missing authorization token")) {
        setSubmitMessage({ type: "error", text: t("sell.errSessionExpired") });
        await logout();
        router.replace("/auth/login");
        return;
      }
      setSubmitMessage({ type: "error", text: msg });
      setToast({ title: t("sell.submissionFailedToastTitle"), body: msg, icon: "exclamationmark.circle.fill" });
      if (!isWeb) Alert.alert(t("profile.error"), msg);
    } finally { setIsSubmitting(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      // Check if seller can list (listing fee or dealership sub)
      const canListRes = await checkCanListVehicle().catch(() => null);
      if (canListRes && !canListRes.data.canList) {
        if (canListRes.data.needsVerificationFee) {
          Alert.alert(
            t("sell.verificationRequiredTitle"),
            t("sell.verificationRequiredMsg"),
            [
              { text: t("sell.goToVerify"), onPress: () => router.push('/verify/phone' as any) },
              { text: t("sell.cancel"), style: 'cancel' },
            ]
          );
          setIsSubmitting(false);
          return;
        }
        if (canListRes.data.needsListingFee) {
          // Don't open a payment sheet we can't price — retry the config fetch
          // once and only continue when we have a real amount to show.
          let priced = hasValidPricing;
          if (!priced) {
            try {
              const r = await fetchConfigPrices();
              const prices = r.data?.prices || {};
              setConfigPrices(prices);
              setPricesLoaded(true);
              priced = Number(prices['listing_fee_single']) > 0;
            } catch {
              priced = false;
            }
          }
          if (!priced) {
            const msg = t("sell.errCheckEligibility");
            setSubmitMessage({ type: "error", text: msg });
            if (!isWeb) Alert.alert(t("profile.error"), msg);
            setIsSubmitting(false);
            return;
          }
          setPaymentPurpose('listing_fee');
          setShowPaymentExplainer(true);
          setIsSubmitting(false);
          return;
        }
        if (canListRes.data.reason?.includes('Dealership')) {
          setCompanyHasSub(false);
          setIsSubmitting(false);
          return;
        }
      }

      // If no payment needed (company with subscription), submit directly
      await handleSubmitVehicle();
    } catch (err: any) {
      const msg = err?.message ?? t("sell.errCheckEligibility");
      setSubmitMessage({ type: "error", text: msg });
      if (!isWeb) Alert.alert(t("profile.error"), msg);
      setIsSubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GUARD SCREENS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Loading ───────────────────────────────────────────────────────────────
  if (userRole === "loading") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── Buyer account ─────────────────────────────────────────────────────────
  if (userRole === "buyer") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            {/* Icon */}
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name="car.fill" size={40} color={colors.primary} />
            </View>

            <ThemedText type="defaultSemiBold" style={S.guardTitle}>{t("sell.guardTitleBuyer")}</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              {t("sell.guardDescBuyer")}
            </ThemedText>

            {/* Steps card */}
            <View style={[S.guardStepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: "person.2.fill", title: t("sell.guardStepSwitchTitle"), sub: t("sell.guardStepSwitchSub") },
                { icon: "checkmark.shield.fill", title: t("sell.guardStepVerifyTitle"), sub: t("sell.guardStepVerifySub") },
              ].map((item, i, arr) => (
                <View key={i} style={[S.guardStep, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <View style={[S.guardStepIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                    <IconSymbol name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={S.guardStepText}>
                    <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>{item.title}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>{item.sub}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/profile" as any)}>
              <ThemedText style={S.guardPrimaryBtnText}>{t("sell.switchToSeller")}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[S.guardSecondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}>
              <ThemedText style={[S.guardSecondaryBtnText, { color: colors.text }]}>{t("sell.goBack")}</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ── Seller – checking verification ────────────────────────────────────────
  if (userRole === "seller" && authUser && isCheckingVerification) {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <ThemedText style={{ color: colors.icon, marginTop: 12, fontSize: 13 }}>{t("sell.checkingVerification")}</ThemedText>
      </View>
    );
  }

  // ── Seller – pending ──────────────────────────────────────────────────────
  if (userRole === "seller" && authUser && verificationStatus === "pending") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name="clock.fill" size={40} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>{t("sell.pendingTitle")}</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              {t("sell.pendingDesc")}
            </ThemedText>

            {/* Status pill */}
            <View style={[S.statusPill, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
              <View style={[S.statusDot, { backgroundColor: "#D97706" }]} />
              <ThemedText style={{ fontSize: 13, color: "#92400E", fontWeight: "600" }}>{t("sell.underReview")}</ThemedText>
            </View>

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/profile")}>
              <ThemedText style={S.guardPrimaryBtnText}>{t("sell.viewProfileStatus")}</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ── Seller – rejected ─────────────────────────────────────────────────────
  if (userRole === "seller" && authUser && verificationStatus === "rejected") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#DC2626" />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>{t("sell.rejectedTitle")}</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              {t("sell.rejectedDesc")}
            </ThemedText>

            {/* Status pill */}
            <View style={[S.statusPill, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <View style={[S.statusDot, { backgroundColor: "#DC2626" }]} />
              <ThemedText style={{ fontSize: 13, color: "#991B1B", fontWeight: "600" }}>{t("sell.rejectedBadge")}</ThemedText>
            </View>

            {/* Rejection reason card */}
            {verificationReviewNote ? (
              <View style={[S.rejectionCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <IconSymbol name="exclamationmark.circle.fill" size={18} color="#DC2626" />
                  <ThemedText style={{ fontSize: 14, fontWeight: "700", color: "#991B1B" }}>{t("sell.rejectionReason")}</ThemedText>
                </View>
                <ThemedText style={{ fontSize: 14, color: "#7F1D1D", lineHeight: 22 }}>{verificationReviewNote}</ThemedText>
              </View>
            ) : null}

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/verify/phone")}>
              <ThemedText style={S.guardPrimaryBtnText}>{t("sell.resubmitVerification")}</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ── Seller – not verified (none) — individual AND company ──────────────────
  if (userRole === "seller" && authUser && verificationStatus === "none") {
    const isCompany = sellerType === 'company';
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name={isCompany ? "building.2.fill" : "person.fill"} size={40} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>
              {isCompany ? t("sell.businessVerificationRequired") : t("sell.sellerVerificationRequired")}
            </ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              {isCompany
                ? t("sell.businessVerificationDesc")
                : t("sell.sellerVerificationDesc")}
            </ThemedText>

            {/* Steps card */}
            <View style={[S.guardStepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(isCompany
                ? [
                    { icon: "phone.fill", title: t("sell.stepVerifyPhoneTitle"), sub: t("sell.stepVerifyPhoneSub") },
                    { icon: "doc.text.fill", title: t("sell.stepUploadRdbTitle"), sub: t("sell.stepUploadRdbSub") },
                  ]
                : [
                    { icon: "phone.fill", title: t("sell.stepVerifyPhoneTitle"), sub: t("sell.stepVerifyPhoneSub") },
                    { icon: "person.fill", title: t("sell.stepUploadIdTitle"), sub: t("sell.stepUploadIdSub") },
                    { icon: "camera.fill", title: t("sell.stepSelfieTitle"), sub: t("sell.stepSelfieSub") },
                  ]
              ).map((item, i, arr) => (
                <View key={i} style={[S.guardStep, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <View style={[S.guardStepIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                    <IconSymbol name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={S.guardStepText}>
                    <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>{item.title}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>{item.sub}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={checkAccountType}>
              <ThemedText style={S.guardPrimaryBtnText}>{t("sell.startVerif")}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[S.guardSecondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}>
              <ThemedText style={[S.guardSecondaryBtnText, { color: colors.text }]}>{t("sell.goBack")}</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>

        <PaymentProcessingModal
          visible={showPaymentProcessing}
          status={paymentStatus}
          message={paymentMessage}
          onDismiss={handleDismissPayment}
        />
      </View>
    );
  }

  // ── Company seller – no active subscription ───────────────────────────────
  if (userRole === "seller" && sellerType === 'company' && companyHasSub === false) {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)' }]}>
              <IconSymbol name="building.2.fill" size={40} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>{t("sell.dealershipSubRequired")}</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              {t("sell.dealershipSubDesc")}
            </ThemedText>

            <View style={[S.guardStepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: "checkmark.circle.fill", title: t("sell.unlimitedListingsTitle"), sub: t("sell.unlimitedListingsSub") },
                { icon: "star.fill", title: t("sell.featuredPlacementTitle"), sub: t("sell.featuredPlacementSub") },
              ].map((item, i, arr) => (
                <View key={i} style={[S.guardStep, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                  <View style={[S.guardStepIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                    <IconSymbol name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={S.guardStepText}>
                    <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>{item.title}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>{item.sub}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              <ThemedText style={S.guardPrimaryBtnText}>{t("sell.viewSubscriptionPlans")}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.guardSecondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}
            >
              <ThemedText style={[S.guardSecondaryBtnText, { color: colors.text }]}>{t("sell.goBack")}</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN FORM  (approved sellers + admins only reach here)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[S.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <SellSEO />
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
      <View style={[S.header, { backgroundColor: colors.background, borderBottomColor: colors.border },
      isDesktopWeb && { maxWidth: sellContainerMaxWidth, alignSelf: "center", width: "100%", paddingHorizontal: webHorizontalPadding }]}>
        <ThemedText type="defaultSemiBold" style={S.headerTitle}>{t("sell.title")}</ThemedText>
        <View style={[S.stepBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}35` }]}>
          <ThemedText style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.3 }}>{step} / {STEPS.length}</ThemedText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View style={[S.scrollContent,
        isDesktopWeb && { maxWidth: sellContainerMaxWidth, alignSelf: "center", width: "100%", paddingHorizontal: webHorizontalPadding, paddingTop: 32 }]}>

          {/* Progress */}
          <StepProgress step={step} colors={colors as any} />

          {/* Alert */}
          {submitMessage && (
            <View style={[S.alertBox, {
              backgroundColor: submitMessage.type === "error" ? "#FEF2F2" : "#F0FDF4",
              borderColor: submitMessage.type === "error" ? "#FECACA" : "#BBF7D0",
            }]}>
              <IconSymbol name={submitMessage.type === "error" ? "exclamationmark.circle.fill" : "checkmark.circle.fill"} size={16}
                color={submitMessage.type === "error" ? "#DC2626" : "#16A34A"} />
              <ThemedText style={[S.alertText, { color: submitMessage.type === "error" ? "#991B1B" : "#166534" }]}>
                {submitMessage.text}
              </ThemedText>
            </View>
          )}

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

            {/* ══════════ STEP 1: Photos ══════════ */}
            {step === 1 && (
              <>
                <FormCard colors={colors}>
                  <SectionHead icon="camera.fill" title={t("sell.photos")} subtitle={t("sell.uploadPhotosOrderSubtitle")} colors={colors} />
                  
                  {/* Info banner */}
                  <View style={{ backgroundColor: `${colors.primary}12`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <IconSymbol name="info.circle.fill" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                    <ThemedText style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 19 }}>
                      {t("sell.coverPhotoInfo")}
                    </ThemedText>
                  </View>

                  {/* Labeled image boxes (10 boxes, 6 required) */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: t("sell.frontView"), required: true },
                      { label: t("sell.rearView"), required: true },
                      { label: t("sell.driverSide"), required: true },
                      { label: t("sell.passengerSide"), required: true },
                      { label: t("sell.interior"), required: true },
                      { label: t("sell.dashboard"), required: true },
                      { label: t("sell.engine"), required: false },
                      { label: t("sell.trunkBoot"), required: false },
                      { label: t("sell.wheelTire"), required: false },
                      { label: t("sell.extraDetail"), required: false },
                    ].map((item, i) => (
                      <View key={i} style={isDesktopWeb ? { width: '18.4%' } : { width: '30.66%' }}>
                        <TouchableOpacity
                          style={[{
                            width: '100%',
                            height: isDesktopWeb ? undefined : 100,
                            aspectRatio: isDesktopWeb ? 1 : undefined,
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
                              <Image source={{ uri: images[i] }} style={{ width: '100%', height: '100%' }} />
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
                                onPress={() => {
                                  // Clear this slot in place — do NOT shift other slots.
                                  setImages((prev) => {
                                    const next = [...prev];
                                    next[i] = undefined as any;
                                    return next;
                                  });
                                }}
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
                                  <ThemedText style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.3 }}>{t("sell.coverBadge")}</ThemedText>
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
                        {t("sell.chooseMultiple")}
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
                        {t("sell.takePhoto")}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 16, textAlign: 'center' }}>
                    {t("sell.uploadBestPhotoFirst")}
                  </ThemedText>
                </FormCard>

                {/* ID Document — not required for company/business listings */}
                {sellerType !== 'company' && (
                  <FormCard colors={colors}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 }}>
                      <View style={[S.sectionIconBadge, { backgroundColor: `${colors.primary}18` }]}>
                        <IconSymbol name="doc.badge.plus" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold" style={S.sectionHeadTitle}>{t("sell.vehicleIdDocument")}</ThemedText>
                        <ThemedText style={[S.sectionHeadSub, { color: colors.icon }]}>{t("sell.registrationDocSubtitle")}</ThemedText>
                      </View>
                      <View style={[S.optionalBadge, { borderColor: colors.border }]}>
                        <ThemedText style={{ fontSize: 10, color: colors.icon }}>{t("sell.optionalLabel")}</ThemedText>
                      </View>
                    </View>

                    {vehicleIdentificationDoc ? (
                      <View>
                        <View style={{ borderRadius: 10, overflow: "hidden", height: 140 }}>
                          <Image source={{ uri: vehicleIdentificationDoc }} style={{ width: "100%", height: "100%" }} />
                        </View>
                        <TouchableOpacity style={S.removeLinkBtn} onPress={() => setVehicleIdentificationDoc(null)}>
                          <IconSymbol name="trash" size={13} color="#EF4444" />
                          <ThemedText style={{ fontSize: 12, color: "#EF4444", marginLeft: 5 }}>{t("sell.removeDocument")}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <TouchableOpacity style={[S.docZone, { borderColor: colors.border, backgroundColor: colors.background }]}
                          onPress={handlePickVehicleIdentificationDoc} activeOpacity={0.8}>
                          <IconSymbol name="arrow.up.doc" size={20} color={colors.primary} />
                          <ThemedText style={{ fontSize: 13, color: colors.text, marginLeft: 10, fontWeight: "500" }}>{t("sell.uploadIdDocument")}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={S.removeLinkBtn} onPress={handleTakeVehicleIdentificationDocPhoto}>
                          <IconSymbol name="camera.fill" size={13} color={colors.primary} />
                          <ThemedText style={{ fontSize: 12, color: colors.primary, marginLeft: 5, fontWeight: "600" }}>{t("sell.takePhotoInstead")}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </FormCard>
                )}
              </>
            )}

            {/* ══════════ STEP 2: Vehicle Info ══════════ */}
            {step === 2 && (
              <FormCard colors={colors}>
                <SectionHead icon="car.fill" title={t("sell.vehicleInfo")} subtitle={t("sell.vehicleInfoSubtitle")} colors={colors} />

                <Field label={t("sell.listingTitle")} required>
                  <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder={t("sell.listingTitlePlaceholder")} placeholderTextColor={colors.icon} value={title} onChangeText={setTitle} />
                </Field>

                <View style={S.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label={t("sell.brand")} required>
                      <SelectorTrigger value={brand} placeholder={t("sell.selectBrandPlaceholder")} onPress={openBrandSelector} colors={colors}
                        open={showBrandSelector} isDesktopWeb={isDesktopWeb} triggerRef={brandTriggerRef} />
                    </Field>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Field label={t("sell.model")} required>
                      <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder={t("sell.model")} placeholderTextColor={colors.icon} value={model} onChangeText={setModel} />
                    </Field>
                  </View>
                </View>

                <View style={S.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label={t("sell.year")} required>
                      <SelectorTrigger value={year} placeholder={t("sell.selectYearPlaceholder")} onPress={openYearSelector} colors={colors}
                        open={showYearSelector} isDesktopWeb={isDesktopWeb} triggerRef={yearTriggerRef} />
                    </Field>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Field label={t("sell.category")} required>
                      <SelectorTrigger value={selectedCategoryName} placeholder={t("sell.selectCategoryPlaceholder")} onPress={openCategorySelector} colors={colors}
                        open={showCategorySelector} isDesktopWeb={isDesktopWeb} triggerRef={categoryTriggerRef} />
                    </Field>
                  </View>
                </View>
              </FormCard>
            )}

            {/* ══════════ STEP 3: Tech Specs ══════════ */}
            {step === 3 && (
              <>
                <FormCard colors={colors}>
                  <SectionHead icon="gearshape.fill" title={t("sell.techSpecs")} subtitle={t("sell.techSpecsSubtitle")} colors={colors} />

                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field label={t("sell.fuelType")} required>
                        <SelectorTrigger value={fuelType} placeholder={t("sell.selectFuelTypePlaceholder")} onPress={openFuelTypeSelector} colors={colors}
                          open={showFuelTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={fuelTypeTriggerRef} />
                      </Field>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label={t("sell.transmission")} required>
                        <SelectorTrigger value={transmission} placeholder={t("sell.selectTransmissionPlaceholder")} onPress={openTransmissionSelector} colors={colors}
                          open={showTransmissionSelector} isDesktopWeb={isDesktopWeb} triggerRef={transmissionTriggerRef} />
                      </Field>
                    </View>
                  </View>

                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      {fuelType === 'Electric' ? (
                        <Field label={t("sell.batteryRange")}>
                          <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder={t("sell.batteryRangePlaceholder")} placeholderTextColor={colors.icon} keyboardType="numeric" value={batteryRange} onChangeText={setBatteryRange} />
                        </Field>
                      ) : (
                        <Field label={t("sell.engineSize")}>
                          <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder={t("sell.engineSizePlaceholder")} placeholderTextColor={colors.icon} value={engineSize} onChangeText={setEngineSize} />
                        </Field>
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label={t("sell.driveType")}>
                        <SelectorTrigger value={driveType} placeholder={t("sell.selectDriveTypePlaceholder")} onPress={openDriveTypeSelector} colors={colors}
                          open={showDriveTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={driveTypeTriggerRef} />
                      </Field>
                    </View>
                  </View>

                  <Field label={t("sell.bodyType")}>
                    <SelectorTrigger value={bodyType} placeholder={t("sell.selectBodyTypePlaceholder")} onPress={openBodyTypeSelector} colors={colors}
                      open={showBodyTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={bodyTypeTriggerRef} />
                  </Field>

                  <Field label={t("sell.color")} required>
                    <SelectorTrigger value={color} placeholder={t("sell.selectColorPlaceholder")} onPress={openColorSelector} colors={colors}
                      open={showColorSelector} isDesktopWeb={isDesktopWeb} triggerRef={colorTriggerRef}
                      colorDot={color ? (COLOR_DOTS[color] ?? undefined) : undefined} />
                  </Field>
                </FormCard>

                <FormCard colors={colors}>
                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field label={t("sell.status")} required>
                        <ChipGroup
                          options={["Brand New", "Imported Used", "Used In Rwanda"]}
                          value={usageStatus}
                          onChange={(v) => {
                            setUsageStatus(v);
                            // Brand new cars have no mileage — force 0 and lock the field.
                            if (v === "Brand New") setMileage("0");
                            else if (mileage === "0") setMileage("");
                          }}
                          colors={colors}
                        />
                      </Field>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label={t("sell.mileage")} required>
                        <TextInput
                          style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, opacity: usageStatus === "Brand New" ? 0.5 : 1 }]}
                          placeholder={t("sell.mileagePlaceholder")} placeholderTextColor={colors.icon} keyboardType="numeric"
                          value={usageStatus === "Brand New" ? "0" : mileage}
                          onChangeText={setMileage}
                          editable={usageStatus !== "Brand New"} />
                      </Field>
                    </View>
                  </View>
                </FormCard>
              </>
            )}

            {/* ══════════ STEP 4: Pricing & Details ══════════ */}
            {step === 4 && (
              <>
                <FormCard colors={colors}>
                  <SectionHead icon="tag.fill" title={t("sell.pricingDesc")} subtitle={t("sell.pricingSubtitle")} colors={colors} />

                  <Field label={t("sell.location")} required>
                    <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder={t("sell.locationPlaceholder")} placeholderTextColor={colors.icon} value={location} onChangeText={setLocation} />
                  </Field>

                  <Field label={t("sell.priceFrw")} required>
                    <View style={S.priceRow}>
                      <View style={[S.pricePrefixBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <ThemedText style={{ fontSize: 11, fontWeight: "700", color: colors.icon, letterSpacing: 0.6 }}>FRW</ThemedText>
                      </View>
                      <TextInput style={[S.priceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="0" placeholderTextColor={colors.icon} keyboardType="numeric" value={price} onChangeText={setPrice} />
                    </View>
                  </Field>
                </FormCard>

                <FormCard colors={colors}>
                  <Field label={t("sell.description")} required>
                    <TextInput style={[S.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder={t("sell.descriptionPlaceholder")}
                      placeholderTextColor={colors.icon} multiline numberOfLines={6} textAlignVertical="top"
                      value={description} onChangeText={setDescription} />
                  </Field>
                </FormCard>

                {/* Inventory — business/company sellers only. Local UI feature. */}
                {sellerType === 'company' && (
                  <FormCard colors={colors}>
                    <SectionHead icon="square.grid.2x2" title={t("sell.inventoryTitle")} subtitle={t("sell.inventorySubtitle")} colors={colors} />

                    <Field label={t("sell.quantityLabel")}>
                      <TextInput
                        style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder={t("sell.quantityPlaceholder")}
                        placeholderTextColor={colors.icon}
                        keyboardType="numeric"
                        value={quantity}
                        onChangeText={(v) => setQuantity(v.replace(/[^0-9]/g, ''))}
                      />
                      <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 6 }}>
                        {t("sell.quantityHint")}
                      </ThemedText>
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
                          <View style={[
                            S.toggleTrack,
                            { backgroundColor: differentColors ? colors.primary : colors.border },
                          ]}>
                            <View style={[S.toggleThumb, { alignSelf: differentColors ? 'flex-end' : 'flex-start' }]} />
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

              </>
            )}

          </Animated.View>

          {/* ── Navigation buttons ── */}
          <View style={S.navRow}>
            {step > 1 ? (
              <TouchableOpacity style={[S.btnBack, { borderColor: colors.border }]} onPress={() => animateStep(step - 1)}>
                <IconSymbol name="chevron.left" size={14} color={colors.icon} />
                <ThemedText style={{ fontSize: 13, color: colors.icon, marginLeft: 4 }}>{t("sell.back")}</ThemedText>
              </TouchableOpacity>
            ) : <View />}

            <TouchableOpacity style={[S.btnNext, { backgroundColor: isSubmitting ? colors.border : colors.primary }]}
              onPress={handleNext} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ThemedText style={S.btnNextText}>{step === 4 ? t("sell.submitBtn") : t("sell.continueBtn")}</ThemedText>
                    {step < 4 && <IconSymbol name="chevron.right" size={14} color="#fff" />}
                  </View>
                )}
            </TouchableOpacity>
          </View>
        </View>
        <WebFooter />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          ALL MODALS — every selector from the original preserved
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Year */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showYearSelector} onRequestClose={() => setShowYearSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowYearSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectYear")}</ThemedText>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {YEAR_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, year === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectYear(opt)}>
                    <ThemedText style={{ fontSize: 15, color: year === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                    {year === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
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

      {/* Color */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showColorSelector} onRequestClose={() => setShowColorSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowColorSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectColor")}</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={colorSearch} onChangeText={setColorSearch} placeholder={t("sell.searchColorsPlaceholder")} placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredColorOptions.length === 0
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>{t("sell.noColorsFound", { query: colorSearch })}</ThemedText>
                  : filteredColorOptions.map((opt) => (
                    <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, color === opt && { backgroundColor: `${colors.primary}12` }]}
                      onPress={() => handleSelectColor(opt)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={[S.colorDotInline, { backgroundColor: COLOR_DOTS[opt] ?? "#888", borderColor: colors.border }]} />
                        <ThemedText style={{ fontSize: 15, color: color === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                      </View>
                      {color === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showColorSelector && dropdownPos && (
        <Modal transparent visible={showColorSelector} onRequestClose={() => setShowColorSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowColorSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 200) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={colorSearch} onChangeText={setColorSearch} placeholder={t("sell.searchColorsPlaceholder")} placeholderTextColor={colors.icon} />
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

      {/* Category */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showCategorySelector} onRequestClose={() => setShowCategorySelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowCategorySelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectCategory")}</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder={t("sell.searchCategoriesPlaceholder")} placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredCategories.length === 0
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>{t("sell.noCategoriesFound", { query: categorySearch })}</ThemedText>
                  : filteredCategories.map((cat) => (
                    <TouchableOpacity key={cat.id} style={[S.optionRow, { borderBottomColor: colors.border }, selectedCategoryId === cat.id && { backgroundColor: `${colors.primary}12` }]}
                      onPress={() => handleSelectCategory(cat.id)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <IconSymbol name={(cat.icon || "car.fill") as any} size={18} color={selectedCategoryId === cat.id ? colors.primary : colors.icon} />
                        <ThemedText style={{ fontSize: 15, color: selectedCategoryId === cat.id ? colors.primary : colors.text }}>{cat.name}</ThemedText>
                      </View>
                      {selectedCategoryId === cat.id && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showCategorySelector && categoryDropdownPos && (
        <Modal transparent visible={showCategorySelector} onRequestClose={() => setShowCategorySelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowCategorySelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: categoryDropdownPos.top, left: categoryDropdownPos.left, width: Math.max(categoryDropdownPos.width, 240) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder={t("sell.searchCategoriesPlaceholder")} placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredCategories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[S.optionRow, { borderBottomColor: colors.border }, selectedCategoryId === cat.id && { backgroundColor: `${colors.primary}12` }]}
                  onPress={() => handleSelectCategory(cat.id)}>
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

      {/* Brand */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showBrandSelector} onRequestClose={() => setShowBrandSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowBrandSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectBrand")}</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder={t("sell.searchBrandsPlaceholder")} placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {!hasBrandResults
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>{t("sell.noBrandsFound", { query: brandSearch })}</ThemedText>
                  : filteredBrandGroups.map((group) => (
                    <View key={group.region}>
                      <ThemedText style={[S.brandGroupHeader, { color: colors.icon }]}>{group.region}</ThemedText>
                      {group.brands.map((opt) => (
                        <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]}
                          onPress={() => handleSelectBrand(opt)}>
                          <ThemedText style={{ fontSize: 15, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                          {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showBrandSelector && brandDropdownPos && (
        <Modal transparent visible={showBrandSelector} onRequestClose={() => setShowBrandSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowBrandSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: brandDropdownPos.top, left: brandDropdownPos.left, width: Math.max(brandDropdownPos.width, 220) }]}>
            <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder={t("sell.searchBrandsPlaceholder")} placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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

      {/* Fuel Type */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showFuelTypeSelector} onRequestClose={() => setShowFuelTypeSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowFuelTypeSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectFuelType")}</ThemedText>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredFuelTypes.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, fuelType === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectFuelType(opt)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                      {typeof FUEL_TYPE_ICONS[opt] === 'string' ? (
                        <IconSymbol name={FUEL_TYPE_ICONS[opt] as any} size={18} color={fuelType === opt ? colors.primary : colors.icon} />
                      ) : (
                        <Image source={FUEL_TYPE_ICONS[opt]} style={{ width: 20, height: 20, opacity: fuelType === opt ? 1 : 0.6 }} />
                      )}
                      <ThemedText style={{ fontSize: 15, color: fuelType === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                    </View>
                    {fuelType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showFuelTypeSelector && fuelTypeDropdownPos && (
        <Modal transparent visible={showFuelTypeSelector} onRequestClose={() => setShowFuelTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowFuelTypeSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: fuelTypeDropdownPos.top, left: fuelTypeDropdownPos.left, width: Math.max(fuelTypeDropdownPos.width, 180) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
              {filteredFuelTypes.map((opt) => (
                <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, fuelType === opt && { backgroundColor: `${colors.primary}12` }]} onPress={() => handleSelectFuelType(opt)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                    {typeof FUEL_TYPE_ICONS[opt] === 'string' ? (
                      <IconSymbol name={FUEL_TYPE_ICONS[opt] as any} size={16} color={fuelType === opt ? colors.primary : colors.icon} />
                    ) : (
                      <Image source={FUEL_TYPE_ICONS[opt]} style={{ width: 18, height: 18, opacity: fuelType === opt ? 1 : 0.6 }} />
                    )}
                    <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text }}>{opt}</ThemedText>
                  </View>
                  {fuelType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Transmission */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showTransmissionSelector} onRequestClose={() => setShowTransmissionSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowTransmissionSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectTransmission")}</ThemedText>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {TRANSMISSION_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, transmission === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectTransmission(opt)}>
                    <ThemedText style={{ fontSize: 15, color: transmission === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                    {transmission === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
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

      {/* Drive Type */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showDriveTypeSelector} onRequestClose={() => setShowDriveTypeSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowDriveTypeSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectDriveType")}</ThemedText>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {DRIVE_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, driveType === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectDriveType(opt)}>
                    <ThemedText style={{ fontSize: 15, color: driveType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                    {driveType === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {isDesktopWeb && showDriveTypeSelector && driveTypeDropdownPos && (
        <Modal transparent visible={showDriveTypeSelector} onRequestClose={() => setShowDriveTypeSelector(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} onPress={() => setShowDriveTypeSelector(false)} />
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: driveTypeDropdownPos.top, left: driveTypeDropdownPos.left, width: Math.max(driveTypeDropdownPos.width, 220) }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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

      {/* Body Type */}
      {!isDesktopWeb && showBodyTypeSelector && (
        <Modal transparent animationType="slide" visible={showBodyTypeSelector} onRequestClose={() => setShowBodyTypeSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowBodyTypeSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>{t("sell.selectBodyType")}</ThemedText>
              <View style={{ marginBottom: 8 }}>
                <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder={t("sell.searchBodyTypePlaceholder")} placeholderTextColor={colors.icon} value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 340 }} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredBodyTypes.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, bodyType === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectBodyType(opt)}>
                    <ThemedText style={{ fontSize: 15, color: bodyType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
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
          <View style={[S.dropdown, { backgroundColor: colors.background, borderColor: colors.border, top: bodyTypeDropdownPos.top, left: bodyTypeDropdownPos.left, width: Math.max(bodyTypeDropdownPos.width, 220) }]}>
            <View style={{ padding: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder={t("sell.searchBodyTypePlaceholder")} placeholderTextColor={colors.icon} value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus />
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

      {/* Payment Modals */}
      <PaymentExplainerModal
        visible={showPaymentExplainer}
        kind="listing_fee"
        onClose={() => setShowPaymentExplainer(false)}
        onAccept={() => { setShowPaymentExplainer(false); setShowPaymentModal(true); }}
      />
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        title={t("sell.listingFeeTitle")}
        description={t("sell.listingFeeDescription")}
        amount={listingFeeSingle}
        currency="RWF"
        defaultPhoneNumber={phone || authUser?.phone || ''}
        plans={[
          { id: 'single', name: t("sell.singleListingPlan"), price: listingFeeSingle },
          // Only offer the bundle when it is actually priced, otherwise the
          // seller could pick a "RWF 0" plan and be charged the real amount.
          ...(listingFeeBundle3 > 0
            ? [{ id: 'bundle3', name: t("sell.bundle3Plan"), price: listingFeeBundle3 }]
            : []),
        ]}
      />

      <PaymentProcessingModal
        visible={showPaymentProcessing}
        status={paymentStatus}
        message={paymentMessage}
        onDismiss={handleDismissPayment}
      />

      {/* Post-submit confirmation */}
      <Modal visible={showSubmitSuccess} transparent animationType="fade" onRequestClose={() => setShowSubmitSuccess(false)}>
        <View style={S.successOverlay}>
          <View style={[S.successCard, { backgroundColor: colors.background }]}>
            <View style={[S.successIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={colors.primary} />
            </View>
            <ThemedText style={S.successTitle}>{t("sell.submissionSuccessMsg")}</ThemedText>
            <ThemedText style={[S.successBody, { color: colors.icon }]}>
              {t("sell.submissionSuccessBody")}
            </ThemedText>
            <TouchableOpacity
              style={[S.successPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setShowSubmitSuccess(false); router.push("/listings"); }}
            >
              <ThemedText style={S.successPrimaryBtnText}>{t("sell.viewMyListings")}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={S.successSecondaryBtn} onPress={() => setShowSubmitSuccess(false)}>
              <ThemedText style={[S.successSecondaryBtnText, { color: colors.icon }]}>{t("sell.close")}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safeArea: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 19 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },

  // Layout
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },
  row: { flexDirection: "row" },

  // Card
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 20, marginBottom: 16 },

  // Inventory toggle
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  // Switch toggle
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },

  // Section head
  sectionHeadRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionIconBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionHeadTitle: { fontSize: 15 },
  sectionHeadSub: { fontSize: 12, marginTop: 1 },

  // Field
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.55 },

  // Inputs
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  textarea: { minHeight: 120, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingTop: 13, fontSize: 14 },

  // Selector trigger
  selectorTrigger: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  colorDotInline: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },

  // Chips
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5 },

  // Photos
  thumb: { width: 88, height: 88, borderRadius: 10, overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  coverBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 3, alignItems: "center" },
  thumbRemove: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 10 },
  photoZone: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, padding: 28, alignItems: "center" },
  photoZoneIcon: { width: 54, height: 54, borderRadius: 13, alignItems: "center", justifyContent: "center" },

  // Doc
  docZone: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, padding: 16, flexDirection: "row", alignItems: "center" },
  optionalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  removeLinkBtn: { flexDirection: "row", alignItems: "center", marginTop: 10, alignSelf: "flex-start" },

  // Price
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pricePrefixBox: { height: 48, paddingHorizontal: 14, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  priceInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 20, fontWeight: "700" },

  // Alert
  alertBox: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: "600", flex: 1, marginLeft: 8 },

  // Nav buttons
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 40 },
  btnBack: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  btnNext: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 10 },
  btnNextText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },

  // Guard screens (buyer / pending / rejected / none)
  guardScroll: { flexGrow: 1, justifyContent: "center" },
  guardContainer: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 },
  guardContainerWeb: { width: "100%", maxWidth: 520, alignSelf: "center" },
  guardIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 20 },
  guardTitle: { fontSize: 22, textAlign: "center", marginBottom: 10 },
  guardDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  guardStepsCard: { width: "100%", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 28 },
  guardStep: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  guardStepIconWrap: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  guardStepText: { flex: 1 },
  guardPrimaryBtn: { height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 340, marginBottom: 12 },
  guardPrimaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  guardSecondaryBtn: { height: 52, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 340 },
  guardSecondaryBtnText: { fontSize: 14 },

  // Post-submit success
  successOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  successCard: { width: "100%", maxWidth: 400, borderRadius: 16, padding: 24, alignItems: "center" },
  successIconCircle: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  successBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 22 },
  successPrimaryBtn: { height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", width: "100%", marginBottom: 8 },
  successPrimaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successSecondaryBtn: { height: 44, justifyContent: "center", alignItems: "center", width: "100%" },
  successSecondaryBtnText: { fontSize: 14, fontWeight: "600" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, marginBottom: 24 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rejectionCard: { width: "100%", borderRadius: 12, borderWidth: 1.5, padding: 16, marginBottom: 24 },

  // Modals
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  sheetTitle: { fontSize: 17, marginBottom: 12 },
  sheetSearch: { height: 40, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8, marginBottom: 8 },
  sheetSearchInput: { flex: 1, fontSize: 14 },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  brandGroupHeader: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6, opacity: 0.7 },
  dropdown: { position: "absolute", borderWidth: 1, borderRadius: 12, padding: 8, zIndex: 9999999, elevation: 10000, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12 },
});