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
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  Animated,
  Easing,
  Button,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { fetchMySubscription, hasActiveSubscription as checkActiveSub, subscribeToPlan } from '@/lib/api-subscriptions';

import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { isWeb } from "@/lib/platform";
import { WebFooter } from "@/components/web-footer";
import { createVehicle } from "@/lib/api-vehicles";
import { SellSEO } from "@/components/page-meta";
import { getAuthUser, logout, type AuthUser } from "@/lib/userPreference";
import { fetchCategories, type Category } from "@/lib/api-categories";
import { fetchMyVerificationStatus } from "@/lib/api-verifications";
import { VEHICLE_BRAND_OPTIONS } from "@/constants/vehicle-brands";
// import { subscribeToPlan } from '@/lib/api-subscriptions';

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
const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "Semi-Automatic", "CVT"] as const;
const DRIVE_TYPE_OPTIONS = ["Front Wheel Drive (FWD)", "Rear Wheel Drive (RWD)", "All Wheel Drive (AWD)", "Four Wheel Drive (4WD)"] as const;
const BODY_TYPE_OPTIONS = ["SUVs & Crossovers", "Trucks", "Sedans", "Coupes", "Minivans", "Hatchbacks", "Convertibles", "Station wagons"] as const;

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
  { id: 1, label: "Photos", icon: "photo.on.rectangle" },
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
              <ThemedText style={[P.dotLabel, { color: active ? colors.primary : done ? colors.icon : colors.border, fontWeight: active ? "700" : "400" }]}>
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
  useEffect(() => {
    if (typeof document !== "undefined") document.title = "Sell Your Vehicle | Inzira";
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;
  const sellContainerMaxWidth = isWebXl ? 980 : isWebLg ? 920 : isWebMd ? 840 : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;
  const [sellerType, setSellerType] = useState<string>("")

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
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [color, setColor] = useState("");
  const [usageStatus, setUsageStatus] = useState("");
  const [mileage, setMileage] = useState("");

  // ── Step 4: Pricing & details ─────────────────────────────────────────────
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // ── Selector states ───────────────────────────────────────────────────────
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
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [sellerContact, setSellerContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [phone, setPhone] = useState<string>("")
  const [email, setEmails] = useState<string>("")
  // ── Filtered option lists ─────────────────────────────────────────────────
  const filteredColorOptions = useMemo(() => {
    const q = colorSearch.trim().toLowerCase();
    return !q ? PRIMARY_COLOR_OPTIONS : PRIMARY_COLOR_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [colorSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return !q ? categories : categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categorySearch, categories]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return !q ? VEHICLE_BRAND_OPTIONS : VEHICLE_BRAND_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [brandSearch]);

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
  const openColorSelector = () => { setColorSearch(""); setShowColorSelector(true); setDropdownPos(getWebPos(colorTriggerRef)); };
  const handleSelectColor = (v: string) => { setColor(v); setShowColorSelector(false); };




  useEffect(() => {
   
    let mounted = true;
    const loadData = async () => {
      try {
      
        const user = await getAuthUser();

        let subActive = false;
        try {
          const subRes = await fetchMySubscription();
          subActive = checkActiveSub(subRes.data?.subscription);
          if (subActive && mounted) {
       
          }
        } catch {
          // No subscription or error
        }

        if (mounted) {
       
          setAuthUser(user);
          setHasActiveSub(subActive);
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
        if (!user) { router.replace("/auth/login"); return; }
        setUserRole(user.role);
        setAuthUser(user);
        setPhone(user.phone || "");
        setEmails(user.email || "");
        if (user.role === "seller") {
          setSellerType(user?.sellerType || "");
          // alert(user?.sellerType)
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
        } else {
          setVStatus("approved");
        }
      });
    }, []),
  );

  // ── Image picking ─────────────────────────────────────────────────────────
  const handlePickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Please allow access to your photo library."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.7, base64: false, selectionLimit: 6 });
    if (!r.canceled) setImages((p) => [...p, ...r.assets.filter((a) => !!a.uri).map((a) => a.uri as string)].slice(0, 6));
  };

  const handleRemoveImage = (index: number) => setImages((p) => p.filter((_, i) => i !== index));

  const handlePickVehicleIdentificationDoc = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Please allow access to your photo library."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.8, base64: false });
    if (!r.canceled && r.assets[0]) setVehicleIdentificationDoc(r.assets[0].uri);
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
    if (step === 1) return images.length === 0 ? "Add at least one photo." : null;
    if (step === 2) {
      if (!title.trim()) return "Listing title is required.";
      if (!brand.trim()) return "Select a brand.";
      if (!model.trim()) return "Enter the model.";
      if (!year.trim()) return "Enter the year.";
      if (!selectedCategoryId) return "Select a category.";
      return null;
    }
    if (step === 3) {
      if (!fuelType) return "Select fuel type.";
      if (!transmission) return "Select transmission.";
      if (!color) return "Select a color.";
      if (!usageStatus) return "Select usage status.";
      if (!mileage.trim()) return "Enter mileage.";
      return null;
    }
    if (step === 4) {
      if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) return "Enter a valid price.";
      if (!location.trim()) return "Enter location.";
      if (!description.trim()) return "Add a description.";
      return null;
    }
    return null;
  };

  const handleNext = () => {
    setSubmitMessage(null);
    const err = validateStep();
    if (err) { setSubmitMessage({ type: "error", text: err }); if (!isWeb) Alert.alert("Missing info", err); return; }
    if (step < 4) { animateStep(step + 1); return; }
    handleSubmit();
  };
  const checkAccountType = async () => {

    if (sellerType === 'individual' && !hasActiveSub) {
      const activateSubscription = async () => {
        try {
          setIsRequesting(true);
          await subscribeToPlan('Individual seller');
          setHasActiveSub(true);
          // const phone = (vehicle as any).sellerPhone;
          // const email = (vehicle as any).sellerEmail;
          setSellerContact(phone || email ? { phone, email } : null);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert('Payment Successful\n\nWeekly access is active. You can now sell your car');
          } else {
            Alert.alert('Payment Successful', 'Weekly access is active. You can now sell your car');
          }
          router.push("/verify/phone")
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to activate subscription';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`Payment Failed\n\n${message}`);
          } else {
            Alert.alert('Payment Failed', message);
          }
        } finally {
          setIsRequesting(false);
        }
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm('To start selling on Inzira, pay RWF 10,000 for 1 week subscription (mock payment).');
        if (!confirmed) return;
        await activateSubscription();
        return;
      }

      Alert.alert(
        'Activate Access',
        'To start selling on Inzira, pay RWF 10,000 for 1 week subscription (mock payment).',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay RWF 10,000', onPress: async () => { await activateSubscription(); } }
        ]
      );
    } else {
      router.push("/verify/phone")
    }
  }
  
  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await createVehicle({
        title: title.trim(), brand: brand.trim(), model: model.trim(), year: year.trim(),
        categoryId: selectedCategoryId,
        categorySlug: categories.find((c) => c.id === selectedCategoryId)?.slug,
        vehicleType: categories.find((c) => c.id === selectedCategoryId)?.name || "Car",
        bodyType: bodyType.trim() || undefined, fuelType, color, transmission,
        usageStatus: usageStatus.trim() as "Brand New" | "Imported Used" | "Used In Rwanda",
        mileage: mileage.trim(), price: Number(price),
        description: description.trim(), location: location.trim(), images,
        engineSize: engineSize.trim() || undefined, driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc ?? undefined,
      });
      const msg = "Listing submitted successfully. It is now under review.";
      setSubmitMessage({ type: "success", text: msg });
      if (!isWeb) Alert.alert("Submitted!", msg);
      router.push("/listings");
    } catch (err: any) {
      const msg = err?.message ?? "Failed to submit listing. Please try again.";
      if (msg.includes("Invalid or expired session token") || msg.includes("Missing authorization token")) {
        setSubmitMessage({ type: "error", text: "Your session expired. Please log in again." });
        await logout();
        router.replace("/auth/login");
        return;
      }
      setSubmitMessage({ type: "error", text: msg });
      if (!isWeb) Alert.alert("Error", msg);
    } finally { setIsSubmitting(false); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // GUARD SCREENS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Loading ───────────────────────────────────────────────────────────────
  if (userRole === "loading") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── Buyer account ─────────────────────────────────────────────────────────
  if (userRole === "buyer") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            {/* Icon */}
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name="car.fill" size={40} color={colors.primary} />
            </View>

            <ThemedText type="defaultSemiBold" style={S.guardTitle}>Sell on Inzira</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              You currently have a buyer account. To list and sell vehicles, you need a seller account.
            </ThemedText>

            {/* Steps card */}
            <View style={[S.guardStepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: "person.fill", title: "Register a Seller Account", sub: "Sign up with a new email as a seller" },
                { icon: "message.fill", title: "Verify your email", sub: "Confirm via OTP to activate" },
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

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/auth/login")}>
              <ThemedText style={S.guardPrimaryBtnText}>Register as Seller</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[S.guardSecondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}>
              <ThemedText style={[S.guardSecondaryBtnText, { color: colors.text }]}>Go Back</ThemedText>
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
      <View style={[S.safeArea, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <ThemedText style={{ color: colors.icon, marginTop: 12, fontSize: 13 }}>Checking verification status…</ThemedText>
      </View>
    );
  }

  // ── Seller – pending ──────────────────────────────────────────────────────
  if (userRole === "seller" && authUser && verificationStatus === "pending") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name="clock.fill" size={40} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>Verification Pending Review</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              Your seller verification has been submitted and is currently under admin review. We'll notify you once it's approved.
            </ThemedText>

            {/* Status pill */}
            <View style={[S.statusPill, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
              <View style={[S.statusDot, { backgroundColor: "#D97706" }]} />
              <ThemedText style={{ fontSize: 13, color: "#92400E", fontWeight: "600" }}>Under Review</ThemedText>
            </View>

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/profile")}>
              <ThemedText style={S.guardPrimaryBtnText}>View Profile Status</ThemedText>
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
      <View style={[S.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#DC2626" />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>Verification Rejected</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              Please review the reason below and resubmit your verification documents.
            </ThemedText>

            {/* Status pill */}
            <View style={[S.statusPill, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <View style={[S.statusDot, { backgroundColor: "#DC2626" }]} />
              <ThemedText style={{ fontSize: 13, color: "#991B1B", fontWeight: "600" }}>Rejected</ThemedText>
            </View>

            {/* Rejection reason card */}
            {verificationReviewNote ? (
              <View style={[S.rejectionCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <IconSymbol name="exclamationmark.circle.fill" size={18} color="#DC2626" />
                  <ThemedText style={{ fontSize: 14, fontWeight: "700", color: "#991B1B" }}>Rejection Reason</ThemedText>
                </View>
                <ThemedText style={{ fontSize: 14, color: "#7F1D1D", lineHeight: 22 }}>{verificationReviewNote}</ThemedText>
              </View>
            ) : null}

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/verify/phone")}>
              <ThemedText style={S.guardPrimaryBtnText}>Resubmit Verification</ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  // ── Seller – not verified (none) ──────────────────────────────────────────
  if (userRole === "seller" && authUser && verificationStatus === "none") {
    return (
      <View style={[S.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={S.guardScroll}>
          <View style={[S.guardContainer, isDesktopWeb && S.guardContainerWeb]}>
            <View style={[S.guardIconWrap, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
              <IconSymbol name="shield.checkerboard" size={40} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={S.guardTitle}>Seller Verification Required</ThemedText>
            <ThemedText style={[S.guardDesc, { color: colors.icon }]}>
              To list vehicles for sale, you must complete the seller verification process. This helps keep buyers safe and builds trust on Inzira.
            </ThemedText>

            {/* Steps card */}
            <View style={[S.guardStepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: "phone.fill", title: "Verify your phone number", sub: "Confirm your primary contact." },
                { icon: "person.fill", title: "Upload your ID", sub: "National ID, passport, or driving license." },
                { icon: "camera.fill", title: "Take a verification selfie", sub: "Match your face with your document." },
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

            <TouchableOpacity style={[S.guardPrimaryBtn, { backgroundColor: colors.primary }]} onPress={checkAccountType}>
              <ThemedText style={S.guardPrimaryBtnText}>Start Verification</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[S.guardSecondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}>
              <ThemedText style={[S.guardSecondaryBtnText, { color: colors.text }]}>Go Back</ThemedText>
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
    <View style={[S.safeArea, { backgroundColor: colors.background }]}>
      <SellSEO />

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
                  <SectionHead icon="photo.on.rectangle" title={t("sell.photos")} subtitle="Add up to 6 high-quality photos" colors={colors} />

                  {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {images.map((uri, i) => (
                          <View key={i} style={S.thumb}>
                            <Image source={{ uri }} style={S.thumbImg} />
                            {i === 0 && (
                              <View style={S.coverBadge}>
                                <ThemedText style={{ fontSize: 9, color: "#fff", fontWeight: "700", letterSpacing: 0.3 }}>COVER</ThemedText>
                              </View>
                            )}
                            <TouchableOpacity style={S.thumbRemove} onPress={() => handleRemoveImage(i)}>
                              <IconSymbol name="xmark.circle.fill" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {images.length < 6 && (
                    <TouchableOpacity style={[S.photoZone, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={handlePickImages} activeOpacity={0.8}>
                      <View style={[S.photoZoneIcon, { backgroundColor: `${colors.primary}18` }]}>
                        <IconSymbol name="plus.circle.fill" size={28} color={colors.primary} />
                      </View>
                      <ThemedText style={{ fontWeight: "600", fontSize: 14, color: colors.text, marginTop: 10 }}>
                        {images.length === 0 ? t("sell.addPhotos") : `Add More (${images.length}/6)`}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.icon, marginTop: 4 }}>{t("sell.photoDesc")}</ThemedText>
                    </TouchableOpacity>
                  )}
                </FormCard>

                {/* ID Document */}
                <FormCard colors={colors}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 }}>
                    <View style={[S.sectionIconBadge, { backgroundColor: `${colors.primary}18` }]}>
                      <IconSymbol name="doc.badge.plus" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold" style={S.sectionHeadTitle}>Vehicle ID Document</ThemedText>
                      <ThemedText style={[S.sectionHeadSub, { color: colors.icon }]}>Registration or ownership doc (optional)</ThemedText>
                    </View>
                    <View style={[S.optionalBadge, { borderColor: colors.border }]}>
                      <ThemedText style={{ fontSize: 10, color: colors.icon }}>Optional</ThemedText>
                    </View>
                  </View>

                  {vehicleIdentificationDoc ? (
                    <View>
                      <View style={{ borderRadius: 10, overflow: "hidden", height: 140 }}>
                        <Image source={{ uri: vehicleIdentificationDoc }} style={{ width: "100%", height: "100%" }} />
                      </View>
                      <TouchableOpacity style={S.removeLinkBtn} onPress={() => setVehicleIdentificationDoc(null)}>
                        <IconSymbol name="trash" size={13} color="#EF4444" />
                        <ThemedText style={{ fontSize: 12, color: "#EF4444", marginLeft: 5 }}>Remove document</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[S.docZone, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={handlePickVehicleIdentificationDoc} activeOpacity={0.8}>
                      <IconSymbol name="arrow.up.doc" size={20} color={colors.primary} />
                      <ThemedText style={{ fontSize: 13, color: colors.text, marginLeft: 10, fontWeight: "500" }}>Upload ID Document</ThemedText>
                    </TouchableOpacity>
                  )}
                </FormCard>
              </>
            )}

            {/* ══════════ STEP 2: Vehicle Info ══════════ */}
            {step === 2 && (
              <FormCard colors={colors}>
                <SectionHead icon="car.fill" title={t("sell.vehicleInfo")} subtitle="Basic details about your vehicle" colors={colors} />

                <Field label={t("sell.listingTitle")} required>
                  <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. 2021 Toyota RAV4 XLE" placeholderTextColor={colors.icon} value={title} onChangeText={setTitle} />
                </Field>

                <View style={S.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label={t("sell.brand")} required>
                      <SelectorTrigger value={brand} placeholder="Select brand" onPress={openBrandSelector} colors={colors}
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
                      <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="YYYY" placeholderTextColor={colors.icon} keyboardType="numeric" maxLength={4} value={year} onChangeText={setYear} />
                    </Field>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Field label="Category" required>
                      <SelectorTrigger value={selectedCategoryName} placeholder="Select category" onPress={openCategorySelector} colors={colors}
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
                  <SectionHead icon="gearshape.fill" title={t("sell.techSpecs")} subtitle="Powertrain and configuration" colors={colors} />

                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field label="Fuel Type" required>
                        <SelectorTrigger value={fuelType} placeholder="Select fuel type" onPress={openFuelTypeSelector} colors={colors}
                          open={showFuelTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={fuelTypeTriggerRef} />
                      </Field>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label="Transmission" required>
                        <SelectorTrigger value={transmission} placeholder="Select transmission" onPress={openTransmissionSelector} colors={colors}
                          open={showTransmissionSelector} isDesktopWeb={isDesktopWeb} triggerRef={transmissionTriggerRef} />
                      </Field>
                    </View>
                  </View>

                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field label="Engine Size">
                        <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder="e.g. 2.0L, 1500cc" placeholderTextColor={colors.icon} value={engineSize} onChangeText={setEngineSize} />
                      </Field>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label="Drive Type">
                        <SelectorTrigger value={driveType} placeholder="Select drive type" onPress={openDriveTypeSelector} colors={colors}
                          open={showDriveTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={driveTypeTriggerRef} />
                      </Field>
                    </View>
                  </View>

                  <Field label="Body Type">
                    <SelectorTrigger value={bodyType} placeholder="Select body type" onPress={openBodyTypeSelector} colors={colors}
                      open={showBodyTypeSelector} isDesktopWeb={isDesktopWeb} triggerRef={bodyTypeTriggerRef} />
                  </Field>

                  <Field label="Primary Color" required>
                    <SelectorTrigger value={color} placeholder="Select primary color" onPress={openColorSelector} colors={colors}
                      open={showColorSelector} isDesktopWeb={isDesktopWeb} triggerRef={colorTriggerRef}
                      colorDot={color ? (COLOR_DOTS[color] ?? undefined) : undefined} />
                  </Field>
                </FormCard>

                <FormCard colors={colors}>
                  <View style={S.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field label={t("sell.status")} required>
                        <ChipGroup options={["Brand New", "Imported Used", "Used In Rwanda"]} value={usageStatus} onChange={setUsageStatus} colors={colors} />
                      </Field>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Field label={t("sell.mileage")} required>
                        <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          placeholder="0 km" placeholderTextColor={colors.icon} keyboardType="numeric" value={mileage} onChangeText={setMileage} />
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
                  <SectionHead icon="tag.fill" title={t("sell.pricingDesc")} subtitle="Set your price and location" colors={colors} />

                  <Field label="Location" required>
                    <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. Kigali, Rwanda" placeholderTextColor={colors.icon} value={location} onChangeText={setLocation} />
                  </Field>

                  <Field label="Price (FRW)" required>
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
                      placeholder="Provide additional details about the vehicle's condition, features, and history..."
                      placeholderTextColor={colors.icon} multiline numberOfLines={6} textAlignVertical="top"
                      value={description} onChangeText={setDescription} />
                  </Field>
                </FormCard>
              </>
            )}

          </Animated.View>

          {/* ── Navigation buttons ── */}
          <View style={S.navRow}>
            {step > 1 ? (
              <TouchableOpacity style={[S.btnBack, { borderColor: colors.border }]} onPress={() => animateStep(step - 1)}>
                <IconSymbol name="chevron.left" size={14} color={colors.icon} />
                <ThemedText style={{ fontSize: 13, color: colors.icon, marginLeft: 4 }}>Back</ThemedText>
              </TouchableOpacity>
            ) : <View />}

            <TouchableOpacity style={[S.btnNext, { backgroundColor: isSubmitting ? colors.border : colors.primary }]}
              onPress={handleNext} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ThemedText style={S.btnNextText}>{step === 4 ? t("sell.submitBtn") : "Continue"}</ThemedText>
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

      {/* Color */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showColorSelector} onRequestClose={() => setShowColorSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowColorSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Primary Color</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={colorSearch} onChangeText={setColorSearch} placeholder="Search colors..." placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredColorOptions.length === 0
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No colors found matching "{colorSearch}"</ThemedText>
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

      {/* Category */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showCategorySelector} onRequestClose={() => setShowCategorySelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowCategorySelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Category</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder="Search categories..." placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredCategories.length === 0
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No categories found matching "{categorySearch}"</ThemedText>
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
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={categorySearch} onChangeText={setCategorySearch} placeholder="Search categories..." placeholderTextColor={colors.icon} />
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
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Brand</ThemedText>
              <View style={[S.sheetSearch, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={15} color={colors.icon} />
                <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder="Search brands..." placeholderTextColor={colors.icon} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredBrands.length === 0
                  ? <ThemedText style={{ color: colors.icon, textAlign: "center", marginTop: 20 }}>No brands found matching "{brandSearch}"</ThemedText>
                  : filteredBrands.map((opt) => (
                    <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, brand === opt && { backgroundColor: `${colors.primary}12` }]}
                      onPress={() => handleSelectBrand(opt)}>
                      <ThemedText style={{ fontSize: 15, color: brand === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
                      {brand === opt && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
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
              <TextInput style={[S.sheetSearchInput, { color: colors.text }]} value={brandSearch} onChangeText={setBrandSearch} placeholder="Search brands..." placeholderTextColor={colors.icon} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
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

      {/* Fuel Type */}
      {!isDesktopWeb && (
        <Modal transparent animationType="slide" visible={showFuelTypeSelector} onRequestClose={() => setShowFuelTypeSelector(false)}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowFuelTypeSelector(false)} />
            <View style={[S.sheet, { backgroundColor: colors.background }]}>
              <View style={[S.sheetHandle, { backgroundColor: colors.border }]} />
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Fuel Type</ThemedText>
              <ScrollView showsVerticalScrollIndicator={false} style={{ height: 400 }} contentContainerStyle={{ paddingBottom: insets.bottom }}
                nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredFuelTypes.map((opt) => (
                  <TouchableOpacity key={opt} style={[S.optionRow, { borderBottomColor: colors.border }, fuelType === opt && { backgroundColor: `${colors.primary}12` }]}
                    onPress={() => handleSelectFuelType(opt)}>
                    <ThemedText style={{ fontSize: 15, color: fuelType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
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
                  <ThemedText style={{ fontSize: 14, color: fuelType === opt ? colors.primary : colors.text, flex: 1 }}>{opt}</ThemedText>
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
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Transmission</ThemedText>
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
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Drive Type</ThemedText>
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
              <ThemedText type="defaultSemiBold" style={S.sheetTitle}>Select Body Type</ThemedText>
              <View style={{ marginBottom: 8 }}>
                <TextInput style={[S.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Search body type..." placeholderTextColor={colors.icon} value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus />
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
                placeholder="Search body type..." placeholderTextColor={colors.icon} value={bodyTypeSearch} onChangeText={setBodyTypeSearch} autoFocus />
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

      {/* Start Verification Button */}
      {/* <Button title="Start Verification" onPress={handleStartVerification} disabled={isVerifying} /> */}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 19 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },

  // Layout
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },
  row: { flexDirection: "row" },

  // Card
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 20, marginBottom: 16 },

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
  dropdown: { position: "absolute", borderWidth: 1, borderRadius: 12, padding: 8, zIndex: 9999999, elevation: 10000, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12 },
});