import {
  StyleSheet,
  TextInput,
  ScrollView,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
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
  "Four Wheel Drive (4WD)",
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

export default function SellScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Sell Your Vehicle | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;

  const sellContainerMaxWidth = isWebXl
    ? 980
    : isWebLg
      ? 920
      : isWebMd
        ? 840
        : undefined;
  const webHorizontalPadding = isWebXl ? 28 : isWebLg ? 24 : 20;

  const [userRole, setUserRole] = useState<
    "buyer" | "seller" | "admin" | "loading"
  >("loading");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");
  const [verificationReviewNote, setVerificationReviewNote] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [color, setColor] = useState("");
  const [transmission, setTransmission] = useState("");
  const [engineSize, setEngineSize] = useState("");
  const [driveType, setDriveType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [vehicleIdentificationDoc, setVehicleIdentificationDoc] = useState<
    string | null
  >(null);

  // Fuel Type selector state
  const [showFuelTypeSelector, setShowFuelTypeSelector] = useState(false);
  const [fuelTypeDropdownPos, setFuelTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const fuelTypeTriggerRef = useRef<View>(null);

  // Transmission selector state
  const [showTransmissionSelector, setShowTransmissionSelector] =
    useState(false);
  const [transmissionDropdownPos, setTransmissionDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const transmissionTriggerRef = useRef<View>(null);

  // Drive type selector state
  const [showDriveTypeSelector, setShowDriveTypeSelector] = useState(false);
  const [driveTypeDropdownPos, setDriveTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const driveTypeTriggerRef = useRef<View>(null);

  // Body Type selector state
  const [showBodyTypeSelector, setShowBodyTypeSelector] = useState(false);
  const [bodyTypeSearch, setBodyTypeSearch] = useState("");
  const [bodyTypeDropdownPos, setBodyTypeDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const bodyTypeTriggerRef = useRef<View>(null);

  const [usageStatus, setUsageStatus] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
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

  const handleSelectCategory = (id: string) => {
    setSelectedCategoryId(id);
    setShowCategorySelector(false);
    // Auto-fill fuel type and transmission based on category
    const selectedCat = categories.find((c) => c.id === id);
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

  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => setCategories([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getAuthUser().then(async (user) => {
        if (!user) {
          router.replace("/auth/login");
          return;
        }
        setUserRole(user.role);
        setAuthUser(user);

        if (user.role === "seller") {
          setIsCheckingVerification(true);
          try {
            const verification = await fetchMyVerificationStatus();
            if (!verification) {
              setVerificationStatus(
                user.isVerifiedSeller ? "approved" : "none",
              );
              setVerificationReviewNote("");
            } else {
              setVerificationStatus(verification.status);
              setVerificationReviewNote(verification.reviewNote || "");
            }
          } catch {
            setVerificationStatus(user.isVerifiedSeller ? "approved" : "none");
            setVerificationReviewNote("");
          } finally {
            setIsCheckingVerification(false);
          }
        } else {
          setVerificationStatus("approved");
        }
      });
    }, []),
  );

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: false,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      const newImages = result.assets
        .filter((a) => !!a.uri)
        .map((a) => a.uri as string);
      setImages((prev) => [...prev, ...newImages].slice(0, 6));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickVehicleIdentificationDoc = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
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

  const handleSubmit = async () => {
    setSubmitMessage(null);
    const missing: string[] = [];
    if (!title.trim()) missing.push("Title");
    if (!brand.trim()) missing.push("Brand");
    if (!model.trim()) missing.push("Model");
    if (!year.trim()) missing.push("Year");
    if (!selectedCategoryId) missing.push("Category");
    if (!fuelType.trim()) missing.push("Fuel Type");
    if (!color.trim()) missing.push("Primary Color");
    if (!transmission.trim()) missing.push("Transmission");
    if (!usageStatus.trim()) missing.push("Usage Status");
    if (!mileage.trim()) missing.push("Mileage");
    if (!price.trim()) missing.push("Price");
    if (!description.trim()) missing.push("Description");
    if (!location.trim()) missing.push("Location");

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      missing.push("Valid Price");
    }

    if (missing.length > 0) {
      const message = `Please fill in: ${missing.join(", ")}`;
      setSubmitMessage({ type: "error", text: message });
      if (!isWeb) {
        Alert.alert("Missing Fields", message);
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await createVehicle({
        title: title.trim(),
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
        usageStatus: usageStatus.trim() as
          | "Brand New"
          | "Imported Used"
          | "Used In Rwanda",
        mileage: mileage.trim(),
        price: parsedPrice,
        description: description.trim(),
        location: location.trim(),
        images,
        engineSize: engineSize.trim() || undefined,
        driveType: driveType || undefined,
        vehicleIdentificationDoc: vehicleIdentificationDoc || undefined,
      });
      const successMessage =
        "Listing submitted successfully. It is now under review.";
      setSubmitMessage({ type: "success", text: successMessage });
      if (!isWeb) {
        Alert.alert("Submitted!", successMessage);
      }
      router.push("/listings");
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to submit listing. Please try again.";

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
      setIsSubmitting(false);
    }
  };

  if (userRole === "loading") {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (userRole === "buyer") {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.verificationScrollContent}>
          <View
            style={[
              styles.verificationContainer,
              isDesktopWeb && styles.webVerificationContainer,
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <IconSymbol name="car.fill" size={48} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.verificationTitle}>
              Sell on Inzira
            </ThemedText>
            <ThemedText
              style={[styles.verificationDesc, { color: colors.icon }]}
            >
              You currently have a buyer account. To list and sell vehicles, you
              need a seller account.
            </ThemedText>

            <View
              style={[
                styles.verificationSteps,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.step, { borderBottomColor: colors.border }]}>
                <IconSymbol name="person.fill" size={20} color={colors.icon} />
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepText}>
                    Register a Seller Account
                  </ThemedText>
                  <ThemedText
                    style={[styles.stepSubtext, { color: colors.icon }]}
                  >
                    Sign up with a new email as a seller
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.step, { borderBottomWidth: 0 }]}>
                <IconSymbol name="message.fill" size={20} color={colors.icon} />
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepText}>
                    Verify your email
                  </ThemedText>
                  <ThemedText
                    style={[styles.stepSubtext, { color: colors.icon }]}
                  >
                    Confirm via OTP to activate
                  </ThemedText>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.verificationButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push("/auth/login")}
            >
              <ThemedText style={styles.verificationButtonText}>
                Register as Seller
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)" as any)
              }
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Go Back
              </ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  if (userRole === "seller" && authUser && verificationStatus !== "approved") {
    if (isCheckingVerification) {
      return (
        <View
          style={[
            styles.safeArea,
            {
              backgroundColor: colors.background,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }

    if (verificationStatus === "pending") {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.verificationScrollContent}>
            <View
              style={[
                styles.verificationContainer,
                isDesktopWeb && styles.webVerificationContainer,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <IconSymbol
                  name="clock.fill"
                  size={48}
                  color={colors.primary}
                />
              </View>
              <ThemedText
                type="defaultSemiBold"
                style={styles.verificationTitle}
              >
                Verification Pending Review
              </ThemedText>
              <ThemedText
                style={[styles.verificationDesc, { color: colors.icon }]}
              >
                Your seller verification has been submitted and is currently
                under admin review.
              </ThemedText>

              <TouchableOpacity
                style={[
                  styles.verificationButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <ThemedText style={styles.verificationButtonText}>
                  View Profile Status
                </ThemedText>
              </TouchableOpacity>
            </View>
            <WebFooter />
          </ScrollView>
        </View>
      );
    }

    if (verificationStatus === "rejected") {
      return (
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.verificationScrollContent}>
            <View
              style={[
                styles.verificationContainer,
                isDesktopWeb && styles.webVerificationContainer,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <IconSymbol
                  name="exclamationmark.triangle.fill"
                  size={48}
                  color={colors.primary}
                />
              </View>
              <ThemedText
                type="defaultSemiBold"
                style={styles.verificationTitle}
              >
                Verification Rejected
              </ThemedText>
              <ThemedText
                style={[styles.verificationDesc, { color: colors.icon }]}
              >
                Please review the reason below and resubmit your verification
                documents.
              </ThemedText>
              {verificationReviewNote ? (
                <View
                  style={[
                    styles.rejectionReasonCard,
                    { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
                  ]}
                >
                  <View style={styles.rejectionHeader}>
                    <IconSymbol
                      name="exclamationmark.circle.fill"
                      size={20}
                      color="#DC2626"
                    />
                    <ThemedText
                      style={[styles.rejectionTitle, { color: "#991B1B" }]}
                    >
                      Rejection Reason
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[styles.rejectionText, { color: "#7F1D1D" }]}
                  >
                    {verificationReviewNote}
                  </ThemedText>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.verificationButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/verify/phone")}
              >
                <ThemedText style={styles.verificationButtonText}>
                  Resubmit Verification
                </ThemedText>
              </TouchableOpacity>
            </View>
            <WebFooter />
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.verificationScrollContent}>
          <View
            style={[
              styles.verificationContainer,
              isDesktopWeb && styles.webVerificationContainer,
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <IconSymbol
                name="shield.checkerboard"
                size={48}
                color={colors.primary}
              />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.verificationTitle}>
              Seller Verification Required
            </ThemedText>
            <ThemedText
              style={[styles.verificationDesc, { color: colors.icon }]}
            >
              To list vehicles for sale, you must complete the seller
              verification process. This helps keep buyers safe and builds trust
              on Inzira.
            </ThemedText>

            <View
              style={[
                styles.verificationSteps,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.step, { borderBottomColor: colors.border }]}>
                <IconSymbol name="phone.fill" size={20} color={colors.icon} />
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepText}>
                    Verify your phone number
                  </ThemedText>
                  <ThemedText
                    style={[styles.stepSubtext, { color: colors.icon }]}
                  >
                    Confirm your primary contact.
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.step, { borderBottomColor: colors.border }]}>
                <IconSymbol name="person.fill" size={20} color={colors.icon} />
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepText}>
                    Upload your ID
                  </ThemedText>
                  <ThemedText
                    style={[styles.stepSubtext, { color: colors.icon }]}
                  >
                    National ID, passport, or driving license.
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.step, { borderBottomWidth: 0 }]}>
                <IconSymbol name="camera.fill" size={20} color={colors.icon} />
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepText}>
                    Take a verification selfie
                  </ThemedText>
                  <ThemedText
                    style={[styles.stepSubtext, { color: colors.icon }]}
                  >
                    Match your face with your document.
                  </ThemedText>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.verificationButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push("/verify/phone")}
            >
              <ThemedText style={styles.verificationButtonText}>
                Start Verification
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)" as any)
              }
            >
              <ThemedText
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Go Back
              </ThemedText>
            </TouchableOpacity>
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <SellSEO />
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
          isDesktopWeb && styles.webHeader,
          isDesktopWeb && {
            maxWidth: sellContainerMaxWidth,
            paddingHorizontal: webHorizontalPadding,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {t("sell.title")}
        </ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View
          style={[
            styles.scrollContent,
            isDesktopWeb && styles.webScrollContent,
            isDesktopWeb && {
              maxWidth: sellContainerMaxWidth,
              paddingHorizontal: webHorizontalPadding,
            },
          ]}
        >
          {/* Photo Upload Section */}
          <View style={[styles.section, isDesktopWeb && styles.webSection]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t("sell.photos")}
            </ThemedText>

            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {images.map((uri, index) => (
                    <View key={index} style={styles.photoPreviewWrap}>
                      <Image source={{ uri }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <IconSymbol
                          name="xmark.circle.fill"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {images.length < 6 && (
              <TouchableOpacity
                style={[
                  styles.photoUploadBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={handlePickImages}
              >
                <IconSymbol
                  name="plus.circle.fill"
                  size={32}
                  color={colors.primary}
                />
                <ThemedText
                  style={{
                    color: colors.text,
                    marginTop: 12,
                    fontWeight: "500",
                  }}
                >
                  {images.length === 0
                    ? t("sell.addPhotos")
                    : `Add More (${images.length}/6)`}
                </ThemedText>
                <ThemedText
                  style={{ color: colors.icon, marginTop: 4, fontSize: 13 }}
                >
                  {t("sell.photoDesc")}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Info Section */}
          <View style={[styles.section, isDesktopWeb && styles.webSection]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t("sell.vehicleInfo")}
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                {t("sell.listingTitle")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. 2021 Toyota RAV4 XLE"
                placeholderTextColor={colors.icon}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>
                  {t("sell.brand")}
                </ThemedText>
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
                <ThemedText style={styles.inputLabel}>
                  {t("sell.model")}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("sell.model")}
                  placeholderTextColor={colors.icon}
                  value={model}
                  onChangeText={setModel}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>
                  {t("sell.year")}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="YYYY"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                  value={year}
                  onChangeText={setYear}
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
          <View style={[styles.section, isDesktopWeb && styles.webSection]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t("sell.techSpecs")}
            </ThemedText>

            {/* Row 1: Fuel Type + Transmission - selectors with auto-fill hint */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <ThemedText style={styles.inputLabel}>Fuel Type *</ThemedText>
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
                <ThemedText style={styles.inputLabel}>
                  Transmission *
                </ThemedText>
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

            {/* Row 2: Engine Size + Drive Type */}
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

            {/* Row 3: Body Type */}
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

            {/* Row 3: Color */}
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
                <ThemedText style={styles.inputLabel}>
                  {t("sell.status")}
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  {(
                    ["Brand New", "Imported Used", "Used In Rwanda"] as const
                  ).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setUsageStatus(opt)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor:
                          usageStatus === opt ? colors.primary : colors.border,
                        backgroundColor:
                          usageStatus === opt
                            ? `${colors.primary}18`
                            : colors.background,
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          color:
                            usageStatus === opt ? colors.primary : colors.text,
                          fontWeight: usageStatus === opt ? "700" : "400",
                        }}
                      >
                        {opt}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <ThemedText style={styles.inputLabel}>
                  {t("sell.mileage")}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="0 km"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                  value={mileage}
                  onChangeText={setMileage}
                />
              </View>
            </View>
          </View>

          {/* Pricing & Details */}
          <View style={[styles.section, isDesktopWeb && styles.webSection]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t("sell.pricingDesc")}
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Location</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Kigali, Rwanda"
                placeholderTextColor={colors.icon}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                {t("sell.price")}
              </ThemedText>
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
                placeholder="0"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                {t("sell.description")}
              </ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Provide additional details about the vehicle's condition, features, and history..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Vehicle Identification Document */}
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
                styles.primaryButton,
                {
                  backgroundColor: isSubmitting
                    ? colors.border
                    : colors.primary,
                  marginBottom: 40,
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {t("sell.submitBtn")}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <WebFooter />
      </ScrollView>

      {/* Mobile Bottom Sheet */}
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
              Select Primary Color
            </ThemedText>

            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
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
                      styles.colorOption,
                      { borderBottomColor: colors.border },
                      color === opt && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => handleSelectColor(opt)}
                  >
                    <ThemedText
                      style={[
                        styles.colorOptionText,
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

      {/* Desktop Dropdown */}
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
              styles.desktopDropdown,
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
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    color === opt && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleSelectColor(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
              Select Category
            </ThemedText>

            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 350 }}
            >
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
                      styles.categoryOption,
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
                          styles.categoryOptionText,
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
              styles.desktopDropdown,
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
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
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
                    styles.categoryOption,
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
                        styles.categoryOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
              Select Brand
            </ThemedText>

            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder="Search brands..."
                placeholderTextColor={colors.icon}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 350 }}
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
                      styles.colorOption,
                      { borderBottomColor: colors.border },
                      brand === opt && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => handleSelectBrand(opt)}
                  >
                    <ThemedText
                      style={[
                        styles.colorOptionText,
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
              styles.desktopDropdown,
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
                styles.searchContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={16}
                color={colors.icon}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    brand === opt && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleSelectBrand(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    fuelType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectFuelType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.desktopDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: fuelTypeDropdownPos.top,
                left: fuelTypeDropdownPos.left,
                width: Math.max(fuelTypeDropdownPos.width, 180),
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    fuelType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectFuelType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    transmission === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectTransmission(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.desktopDropdown,
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    transmission === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectTransmission(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    driveType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectDriveType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.desktopDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: driveTypeDropdownPos.top,
                left: driveTypeDropdownPos.left,
                width: Math.max(driveTypeDropdownPos.width, 220),
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    driveType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectDriveType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.bottomSheetContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[
                styles.bottomSheetHandle,
                { backgroundColor: colors.border },
              ]}
            />
            <ThemedText type="defaultSemiBold" style={styles.bottomSheetTitle}>
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
              style={{ maxHeight: 300 }}
            >
              {filteredBodyTypes.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    bodyType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectBodyType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
              styles.desktopDropdown,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                top: bodyTypeDropdownPos.top,
                left: bodyTypeDropdownPos.left,
                width: Math.max(bodyTypeDropdownPos.width, 220),
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
                    styles.colorOption,
                    { borderBottomColor: colors.border },
                    bodyType === opt && {
                      backgroundColor: `${colors.primary}15`,
                    },
                  ]}
                  onPress={() => handleSelectBodyType(opt)}
                >
                  <ThemedText
                    style={[
                      styles.colorOptionText,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100, // Space for tab bar
  },
  webScrollContent: {
    width: "100%",
    alignSelf: "center",
    paddingTop: 36,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 0,
    marginBottom: 32,
  },
  webSection: {
    marginBottom: 40,
    width: "100%",
    paddingHorizontal: 0,
  },
  webHeader: {
    width: "100%",
    alignSelf: "center",
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  photoUploadBox: {
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPreviewWrap: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 10,
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
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 15,
  },
  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryOptionText: {
    fontSize: 14,
  },
  submitMessageBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
  },
  // Verification Styles
  verificationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 100,
  },
  verificationScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  webVerificationContainer: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verificationTitle: {
    marginTop: 24,
    marginBottom: 12,
    textAlign: "center",
    fontSize: 20,
  },
  verificationButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    marginBottom: 12,
  },
  verificationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  verificationDesc: {
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    fontSize: 14,
  },
  verificationSteps: {
    width: "100%",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 32,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepContent: {
    marginLeft: 16,
  },
  stepText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  stepSubtext: {
    fontSize: 13,
  },
  rejectionReasonCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  rejectionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  // Mobile Bottom Sheet
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  bottomSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  bottomSheetTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  searchContainer: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  colorOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorOptionText: {
    fontSize: 14,
  },
  // Desktop Dropdown
  desktopDropdown: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    zIndex: 9999999,
    elevation: 10000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});
