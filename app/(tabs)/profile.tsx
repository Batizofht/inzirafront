import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  useWindowDimensions,
  TextInput,
  Alert,
} from "react-native";

import { useResolvedTheme } from "@/hooks/use-resolved-theme";

import { Colors } from "@/constants/theme";

import { ThemedText } from "@/components/themed-text";

import { IconSymbol } from "@/components/ui/icon-symbol";

import { Image } from "expo-image";

import { useState, useCallback, useEffect } from "react";

import { router } from "expo-router";

import { useFocusEffect } from "@react-navigation/native";

import * as ImagePicker from "expo-image-picker";

import {
  CURRENCIES,
  getCurrencyPreference,
  setCurrencyPreference,
  initCurrencyPreference,
} from "@/lib/currencyPreference";
import { displayPrice } from "@/lib/currencyConverter";

import {
  THEME_MODES,
  getThemeModePreference,
  setThemeModePreference,
} from "@/lib/themePreference";

import {
  getUserType,
  isLoggedIn,
  UserType,
  getAuthUser,
  getSellerVerificationStatus,
  type AuthUser,
} from "@/lib/userPreference";

import { fetchMyVerificationStatus } from "@/lib/api-verifications";

import {
  fetchMyVehicles,
  deleteVehicle,
  updateVehicle,
} from "@/lib/api-vehicles";

import {
  fetchMySubscription,
  hasActiveSubscription,
  subscribeToPlan,
  getSubscriptionRemainingDays,
  type Subscription,
} from "@/lib/api-subscriptions";

import {
  fetchMyContactRequests,
  approveContactRequest,
  rejectContactRequest,
  type ContactRequestResponse,
} from "@/lib/api-contact-requests";

import { startConversation, fetchConversations, type Conversation } from "@/lib/api-messages";

import type { Vehicle } from "@/types/vehicle";

import { isWeb } from "@/lib/platform";
import { resolveImageUrl } from "@/lib/image-url";

import { WebFooter } from "@/components/web-footer";

import { ThemeSelector } from "@/components/theme-selector";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

// Helper to calculate seller stats from vehicles and contact requests

const getSellerStats = (vehicles: Vehicle[], contactRequests: ContactRequestResponse[]) => ({
  carsListed: vehicles.length,

  totalViews: vehicles.reduce((sum, v) => sum + (v.views || 0), 0),

  reviews: 0,

  cardRequests: 0,

  rating: 0,

  orders: contactRequests.length,
});

export default function ProfileScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'My Profile | Inzira';
    }
  }, []);

  const { logout } = useAuth();

  const theme = useResolvedTheme();

  const colors = Colors[theme];

  const isDark = theme === "dark";
  const skeletonBase = isDark ? "#1F2937" : "#E5E7EB";
  const skeletonSoft = isDark ? "#111827" : "#F3F4F6";

  const { width } = useWindowDimensions();

  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with other pages)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  const profileContainerPadding = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  const webStatWidth = isLg || isXl || is2Xl ? "31.8%" : "48.8%";

  // Auth state

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const [userType, setUserType] = useState<UserType>(null);

  // UI state

  const [showHeaderSheet, setShowHeaderSheet] = useState(false);

  const [selectedVehicleOrders, setSelectedVehicleOrders] = useState<
    string | null
  >(null);

  const [showLanguages, setShowLanguages] = useState(false);

  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false);

  const [showThemeOptions, setShowThemeOptions] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState(() =>
    getCurrencyPreference(),
  );

  const [selectedThemeMode, setSelectedThemeMode] = useState(() =>
    getThemeModePreference(),
  );

  const [showProfileActionSheet, setShowProfileActionSheet] = useState(false);

  const [profileImageUri, setProfileImageUri] = useState("");

  const [activeTab, setActiveTab] = useState<
    "cars" | "orders" | "sold" | "rejected" | "preferences" | "activity"
  >(userType === "seller" ? "cars" : "activity");

  const [contactRequests, setContactRequests] = useState<
    ContactRequestResponse[]
  >([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const [hasSub, setHasSub] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isProcessingSubscription, setIsProcessingSubscription] =
    useState(false);

  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);

  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const [confirmText, setConfirmText] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);

  const [isSellerVerificationPending, setIsSellerVerificationPending] =
    useState(false);
  const [sellerVerificationStatus, setSellerVerificationStatus] = useState<
    "pending" | "approved" | "rejected" | null
  >(null);

  const errorColor = isDark ? "#FCA5A5" : "#DC2626";

  // Check auth status

  useEffect(() => {
    checkAuthStatus();

    initCurrencyPreference();
  }, []);

  useEffect(() => {
    console.log("useEffect triggered, userType:", userType);

    if (userType === "seller") {
      console.log("User is seller, calling loadSellerData...");

      loadSellerData().catch((err) => {
        console.error("Unhandled seller data load error:", err);

        setMyVehicles([]);

        setContactRequests([]);

        setIsLoadingVehicles(false);
      });
    } else if (userType === "buyer" || userType === "admin") {
      console.log("User is not seller, userType:", userType);
      setIsLoadingVehicles(false);
      setMyVehicles([]);
    }
  }, [userType]);

  // Fallback to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoadingVehicles) {
        console.log("Loading timeout - forcing stop");
        setIsLoadingVehicles(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoadingVehicles]);

  const loadSellerData = async () => {
    try {
      setIsLoadingVehicles(true);
      console.log("Loading seller data...");

      const [vehiclesRes, subRes] = await Promise.all([
        fetchMyVehicles(),

        fetchMySubscription().catch(() => ({ data: { subscription: null } })),
      ]);

      console.log("Vehicles response:", vehiclesRes);
      console.log("Vehicles data:", vehiclesRes.data);
      console.log("Vehicles array:", vehiclesRes.data.vehicles);

      setMyVehicles(vehiclesRes.data.vehicles);
      setHasSub(hasActiveSubscription(subRes.data.subscription));
      setSubscription(subRes.data.subscription);

      loadContactRequests();
    } catch (err) {
      console.error("Failed to load seller data:", err);
      console.error("Error details:", err);

      setMyVehicles([]);

      setContactRequests([]);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const handleMarkVehicleSold = async (vehicleId: string) => {
    const markAsSold = async () => {
      try {
        await updateVehicle(vehicleId, { status: "sold" });
        setMyVehicles((prev) =>
          prev.map((v) => (v.id === vehicleId ? { ...v, status: "sold" } : v)),
        );
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert("Updated\n\nVehicle marked as sold out.");
        } else {
          Alert.alert("Updated", "Vehicle marked as sold out.");
        }
        loadSellerData();
      } catch (err) {
        console.error("Failed to mark vehicle sold:", err);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert("Error\n\nFailed to mark vehicle as sold out.");
        } else {
          Alert.alert("Error", "Failed to mark vehicle as sold out.");
        }
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Mark as Sold Out\n\nThis car will be moved to Sold Out and removed from available listings.",
      );
      if (confirmed) {
        await markAsSold();
      }
    } else {
      Alert.alert(
        "Mark as Sold Out",
        "This car will be moved to Sold Out and removed from available listings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark Sold", onPress: markAsSold },
        ],
      );
    }
  };
  const insets = useSafeAreaInsets();
  const handleMockSubscriptionPayment = async () => {
    if (isProcessingSubscription) return;

    Alert.alert(
      "Subscription Payment",
      "Mock payment: pay RWF 5,000 to unlock orders contact access and seller messaging.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            try {
              setIsProcessingSubscription(true);
              await subscribeToPlan("basic");
              setHasSub(true);
              setIsProcessingSubscription(false);
              Alert.alert(
                "Payment Successful",
                "Subscription activated. You can now view contacts and reply.",
              );
              loadSellerData();
            } catch (error: any) {
              setIsProcessingSubscription(false);
              Alert.alert(
                "Payment Failed",
                error?.message || "Unable to process subscription payment.",
              );
            }
          },
        },
      ],
    );
  };

  const handleOpenDeleteModal = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);

    setConfirmText("");

    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);

    setVehicleToDelete(null);

    setConfirmText("");

    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete || confirmText !== vehicleToDelete.title) return;

    try {
      setIsDeleting(true);

      await deleteVehicle(vehicleToDelete.id);

      setMyVehicles((prev) => prev.filter((v) => v.id !== vehicleToDelete.id));

      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete vehicle:", err);

      alert("Failed to delete vehicle. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const checkAuthStatus = async () => {
    console.log("checkAuthStatus called");

    const loggedInStatus = await isLoggedIn();
    console.log("loggedInStatus:", loggedInStatus);

    setLoggedIn(loggedInStatus);

    if (loggedInStatus) {
      const type = await getUserType();
      console.log("getUserType result:", type);

      setUserType(type);

      const user = await getAuthUser();
      console.log("getAuthUser result:", user);

      setAuthUser(user);

      if (user?.role === "seller") {
        try {
          const verification = await fetchMyVerificationStatus();
          setSellerVerificationStatus(verification?.status ?? null);
          // Keep legacy pending flag for UI branches
          setIsSellerVerificationPending(verification?.status === "pending");
        } catch {
          // Fallback to local storage only if API fails
          const pendingStatus = await getSellerVerificationStatus();
          setSellerVerificationStatus(pendingStatus ? "pending" : null);
          setIsSellerVerificationPending(Boolean(pendingStatus));
        }
      } else {
        setSellerVerificationStatus(null);
        setIsSellerVerificationPending(false);
      }
    } else {
      router.replace("/auth/login");
    }
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedCurrency(getCurrencyPreference());

      setSelectedThemeMode(getThemeModePreference());

      checkAuthStatus();

      // Reset to default tab and refresh all data when screen is focused
      setActiveTab(userType === "seller" ? "cars" : "activity");
      setSelectedVehicleOrders(null);

      if (userType === "seller") {
        loadSellerData();
      }
    }, [userType]),
  );

  // Reload data on tab change
  useEffect(() => {
    if (userType !== "seller") return;
    // Reset selected vehicle when leaving orders tab
    if (activeTab !== "orders") {
      setSelectedVehicleOrders(null);
    }
    if (
      activeTab === "cars" ||
      activeTab === "rejected" ||
      activeTab === "sold"
    ) {
      loadSellerData();
    } else if (activeTab === "orders") {
      loadContactRequests();
    }
  }, [activeTab, userType]);

  const pickProfileImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setProfileImageUri(result.assets[0].uri);
      }
    } finally {
      setShowProfileActionSheet(false);
    }
  };

  const handleLogout = async () => {
    setShowHeaderSheet(false);

    await logout();

    router.replace("/auth/login");
  };

  const loadContactRequests = async () => {
    try {
      setIsLoadingRequests(true);

      const res = await fetchMyContactRequests();

      setContactRequests(res.data.requests);
    } catch (err) {
      console.error("Failed to load contact requests:", err);

      setContactRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveContactRequest(requestId);

      setContactRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "approved" } : req,
        ),
      );
    } catch (err) {
      console.error("Failed to approve request:", err);

      alert("Failed to approve request. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectContactRequest(requestId);

      setContactRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "rejected" } : req,
        ),
      );
    } catch (err) {
      console.error("Failed to reject request:", err);

      alert("Failed to reject request. Please try again.");
    }
  };

  const handleStartChat = async (vehicleId: string, buyerId: string) => {
    try {
      // Find existing conversation for this vehicle and buyer
      const conversationsRes = await fetchConversations();
      const existingConversation = conversationsRes.data.conversations.find(
        (conv: Conversation) => conv.vehicleId === vehicleId && conv.buyerId === buyerId
      );

      if (existingConversation) {
        // Navigate to existing conversation
        router.push(`/messages/${existingConversation.id}`);
      } else {
        // No conversation exists yet, navigate to messages list
        router.push(`/messages`);
      }
    } catch (err) {
      console.error("Failed to find conversation:", err);
      router.push(`/messages`);
    }
  };

  const themeModeLabel =
    selectedThemeMode === "system"
      ? "System"
      : selectedThemeMode === "dark"
        ? "Dark"
        : "Light";

  // Loading state

  if (loggedIn === null) {
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
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  // Not logged in - will redirect

  if (!loggedIn) {
    return null;
  }

  // Seller Profile View

  if (userType === "seller") {
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

            isDesktopWeb && styles.webHeader,

            isDesktopWeb && {
              paddingHorizontal: profileContainerPadding,
            },
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            My Seller Profile
          </ThemedText>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowHeaderSheet(true)}
          >
            <IconSymbol name="chevron.down" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
          <View
            style={[
              styles.scrollContent,

              isDesktopWeb && styles.webScrollContent,

              isDesktopWeb && {
                paddingHorizontal: profileContainerPadding,
              },
            ]}
          >
            {/* User Info */}

            <View
              style={[
                styles.userInfoSection,
                isDesktopWeb && styles.webUserInfoSection,
              ]}
            >
              <View style={styles.imageContainer}>
                {profileImageUri ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={styles.profileImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.profileImage,
                      {
                        backgroundColor: colors.primary,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 36,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}
                    >
                      {(authUser?.fullName || "S")[0].toUpperCase()}
                    </ThemedText>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.editImageBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowProfileActionSheet(true)}
                >
                  <IconSymbol
                    name="plus.circle.fill"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.userDetails}>
                <ThemedText style={styles.userName}>
                  {authUser?.fullName || "Seller"}
                </ThemedText>

                <ThemedText
                  style={[styles.userContact, { color: colors.icon }]}
                >
                  {authUser?.email || ""}
                </ThemedText>

                {sellerVerificationStatus === "approved" && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="checkmark.seal.fill"
                      size={12}
                      color={colors.primary}
                    />
                    <ThemedText
                      style={[styles.verifiedText, { color: colors.text }]}
                    >
                      Verified Seller
                    </ThemedText>
                  </View>
                )}

                {sellerVerificationStatus === "pending" && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      styles.pendingBadge,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="clock.fill"
                      size={12}
                      color={colors.primary}
                    />
                    <ThemedText
                      style={[styles.verifiedText, { color: colors.text }]}
                    >
                      Verification Pending
                    </ThemedText>
                  </View>
                )}

                {sellerVerificationStatus === "rejected" && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        marginTop: 6,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="exclamationmark.triangle.fill"
                      size={12}
                      color={colors.primary}
                    />
                    <ThemedText
                      style={[styles.verifiedText, { color: colors.text }]}
                    >
                      Verification Rejected
                    </ThemedText>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.messageQuickBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                  onPress={() => router.push("/messages")}
                >
                  <IconSymbol
                    name="message.fill"
                    size={14}
                    color={colors.primary}
                  />
                  <ThemedText
                    style={[styles.messageQuickText, { color: colors.text }]}
                  >
                    Messages
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats - Seller specific */}

            <View
              style={[
                styles.statsContainer,
                isDesktopWeb && styles.webStatsContainer,
              ]}
            >
              <View
                style={[
                  styles.statBox,
                  isDesktopWeb && styles.webStatBox,
                  isDesktopWeb && { width: webStatWidth },
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ThemedText style={[styles.statValue, { color: colors.text }]}>
                  {getSellerStats(myVehicles, contactRequests).carsListed}
                </ThemedText>

                <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                  Cars Listed
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statBox,
                  isDesktopWeb && styles.webStatBox,
                  isDesktopWeb && { width: webStatWidth },
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ThemedText style={[styles.statValue, { color: colors.text }]}>
                  {getSellerStats(myVehicles, contactRequests).totalViews}
                </ThemedText>

                <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                  Total Views
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statBox,
                  isDesktopWeb && styles.webStatBox,
                  isDesktopWeb && { width: webStatWidth },
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ThemedText style={[styles.statValue, { color: colors.text }]}>
                  {getSellerStats(myVehicles, contactRequests).orders}
                </ThemedText>

                <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                  Orders
                </ThemedText>
              </View>
            </View>

            {/* Subscription Status */}
            {hasSub && subscription && (
              <View
                style={[
                  styles.subscriptionStatusCard,
                  {
                    backgroundColor: `${colors.primary}15`,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.subscriptionStatusRow}>
                  <IconSymbol
                    name="checkmark.seal.fill"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.subscriptionStatusText}>
                    <ThemedText
                      style={{ color: colors.text, fontWeight: "600" }}
                    >
                      Weekly Subscription Active
                    </ThemedText>
                    <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
                      {getSubscriptionRemainingDays(subscription)} days
                      remaining (expires{" "}
                      {new Date(subscription.expiresAt).toLocaleDateString()})
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Tabs */}

            <View
              style={[
                styles.tabsContainer,
                isDesktopWeb && styles.webTabsContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tab,
                  isDesktopWeb && styles.webTab,
                  activeTab === "cars" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("cars")}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "cars" ? colors.primary : colors.icon,
                    },
                  ]}
                >
                  My Cars
                </ThemedText>
              </TouchableOpacity>

              {myVehicles.some((v) => v.status === "rejected") && (
                <TouchableOpacity
                  style={[
                    styles.tab,
                    isDesktopWeb && styles.webTab,
                    activeTab === "rejected" && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                  onPress={() => setActiveTab("rejected")}
                >
                  <ThemedText
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === "rejected"
                            ? colors.primary
                            : colors.icon,
                      },
                    ]}
                  >
                    Rejected (
                    {myVehicles.filter((v) => v.status === "rejected").length})
                  </ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.tab,
                  isDesktopWeb && styles.webTab,
                  activeTab === "orders" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("orders")}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "orders" ? colors.primary : colors.icon,
                    },
                  ]}
                >
                  Orders
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  isDesktopWeb && styles.webTab,
                  activeTab === "sold" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("sold")}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "sold" ? colors.primary : colors.icon,
                    },
                  ]}
                >
                  Sold Out (
                  {myVehicles.filter((v) => v.status === "sold").length})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  isDesktopWeb && styles.webTab,
                  activeTab === "preferences" && {
                    borderBottomColor: colors.primary,
                    borderBottomWidth: 2,
                  },
                ]}
                onPress={() => setActiveTab("preferences")}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "preferences" ? colors.primary : colors.icon,
                    },
                  ]}
                >
                  Preferences
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}

            <View
              style={[styles.tabContent, isDesktopWeb && styles.webTabContent]}
            >
              {activeTab === "cars" && (
                <View style={styles.carsList}>
                  {isLoadingVehicles ? (
                    <>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <View
                          key={`car-skeleton-${idx}`}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.carContent}>
                            <View
                              style={[
                                styles.carImage,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View style={styles.carInfo}>
                              <View
                                style={{
                                  height: 14,
                                  width: "70%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 12,
                                  width: "40%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 20,
                                  width: 120,
                                  borderRadius: 10,
                                  backgroundColor: skeletonSoft,
                                }}
                              />
                            </View>
                          </View>
                          <View style={styles.carActions}>
                            <View
                              style={[
                                styles.carActionBtn,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View
                              style={[
                                styles.deleteButton,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                    </>
                  ) : myVehicles.length === 0 ? (
                    <View style={styles.emptyRequests}>
                      <ThemedText style={{ color: colors.icon }}>
                        No vehicles listed yet
                      </ThemedText>

                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          { backgroundColor: colors.primary, marginTop: 16 },
                        ]}
                        onPress={() => router.push("/sell")}
                      >
                        <ThemedText
                          style={{ color: "#fff", fontWeight: "600" }}
                        >
                          List Your First Vehicle
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    myVehicles.map((vehicle) => (
                      <View
                        key={vehicle.id}
                        style={[
                          styles.carCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.carContent}
                          onPress={() => router.push(`/vehicle/${vehicle.id}`)}
                        >
                          <Image
                            source={{
                              uri: resolveImageUrl(vehicle.images?.[0]),
                            }}
                            style={styles.carImage}
                            contentFit="cover"
                          />

                          <View style={styles.carInfo}>
                            <ThemedText style={styles.carTitle}>
                              {vehicle.brand} {vehicle.model}
                            </ThemedText>

                            <ThemedText
                              style={[
                                styles.carPrice,
                                { color: colors.primary },
                              ]}
                            >
                              {displayPrice(Number(vehicle.price) || 0)}
                            </ThemedText>

                            <View
                              style={[
                                styles.carStatusBadge,
                                {
                                  backgroundColor:
                                    vehicle.status === "active"
                                      ? "#10B98120"
                                      : vehicle.status === "pending"
                                        ? "#F59E0B20"
                                        : vehicle.status === "rejected"
                                          ? "#DC262620"
                                          : `${colors.primary}20`,
                                  borderWidth: 1,
                                  borderColor:
                                    vehicle.status === "active"
                                      ? "#10B981"
                                      : vehicle.status === "pending"
                                        ? "#F59E0B"
                                        : vehicle.status === "rejected"
                                          ? "#DC2626"
                                          : colors.primary,
                                },
                              ]}
                            >
                              <IconSymbol
                                name={
                                  vehicle.status === "active"
                                    ? "checkmark.circle.fill"
                                    : vehicle.status === "pending"
                                      ? "clock.fill"
                                      : vehicle.status === "rejected"
                                        ? "exclamationmark.triangle.fill"
                                        : "car.fill"
                                }
                                size={12}
                                color={
                                  vehicle.status === "active"
                                    ? "#10B981"
                                    : vehicle.status === "pending"
                                      ? "#F59E0B"
                                      : vehicle.status === "rejected"
                                        ? "#DC2626"
                                        : colors.primary
                                }
                              />
                              <ThemedText
                                style={[
                                  styles.carStatusText,
                                  {
                                    color:
                                      vehicle.status === "active"
                                        ? "#10B981"
                                        : vehicle.status === "pending"
                                          ? "#F59E0B"
                                          : vehicle.status === "rejected"
                                            ? "#DC2626"
                                            : colors.primary,
                                  },
                                ]}
                              >
                                {vehicle.status === "active"
                                  ? "Verified"
                                  : vehicle.status}
                              </ThemedText>
                            </View>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.carActions}>
                          <TouchableOpacity
                            style={[
                              styles.carActionBtn,
                              { backgroundColor: `${colors.primary}15` },
                            ]}
                            onPress={() =>
                              router.push(`/vehicle/edit?id=${vehicle.id}`)
                            }
                          >
                            <IconSymbol
                              name="pencil"
                              size={16}
                              color={colors.primary}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleOpenDeleteModal(vehicle)}
                          >
                            <IconSymbol
                              name="trash"
                              size={18}
                              color="#DC2626"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === "sold" && (
                <View style={styles.carsList}>
                  {isLoadingVehicles ? (
                    <>
                      {Array.from({ length: 2 }).map((_, idx) => (
                        <View
                          key={`car-sold-skeleton-${idx}`}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.carContent}>
                            <View
                              style={[
                                styles.carImage,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View style={styles.carInfo}>
                              <View
                                style={{
                                  height: 14,
                                  width: "70%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 12,
                                  width: "40%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 20,
                                  width: 120,
                                  borderRadius: 10,
                                  backgroundColor: skeletonSoft,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : myVehicles.filter((v) => v.status === "sold").length ===
                    0 ? (
                    <View style={styles.emptyRequests}>
                      <ThemedText style={{ color: colors.icon }}>
                        No sold vehicles yet
                      </ThemedText>
                    </View>
                  ) : (
                    myVehicles
                      .filter((v) => v.status === "sold")
                      .map((vehicle) => (
                        <View
                          key={vehicle.id}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.carContent}
                            onPress={() =>
                              router.push(`/vehicle/${vehicle.id}`)
                            }
                          >
                            <Image
                              source={{
                                uri: resolveImageUrl(vehicle.images?.[0]),
                              }}
                              style={styles.carImage}
                              contentFit="cover"
                            />
                            <View style={styles.carInfo}>
                              <ThemedText style={styles.carTitle}>
                                {vehicle.title ||
                                  `${vehicle.brand} ${vehicle.model}`}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.carPrice,
                                  { color: colors.primary },
                                ]}
                              >
                                {displayPrice(Number(vehicle.price) || 0)}
                              </ThemedText>
                              <View
                                style={[
                                  styles.carStatusBadge,
                                  {
                                    backgroundColor: "#DC262620",
                                    borderWidth: 1,
                                    borderColor: "#DC2626",
                                  },
                                ]}
                              >
                                <IconSymbol
                                  name="checkmark.seal.fill"
                                  size={12}
                                  color="#DC2626"
                                />
                                <ThemedText
                                  style={[
                                    styles.carStatusText,
                                    { color: "#DC2626" },
                                  ]}
                                >
                                  Sold Out
                                </ThemedText>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))
                  )}
                </View>
              )}

              {activeTab === "rejected" && (
                <View style={styles.carsList}>
                  {isLoadingVehicles ? (
                    <>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <View
                          key={`car-skeleton-rej-${idx}`}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.carContent}>
                            <View
                              style={[
                                styles.carImage,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View style={styles.carInfo}>
                              <View
                                style={{
                                  height: 14,
                                  width: "70%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 12,
                                  width: "40%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 20,
                                  width: 120,
                                  borderRadius: 10,
                                  backgroundColor: skeletonSoft,
                                }}
                              />
                            </View>
                          </View>
                          <View style={styles.carActions}>
                            <View
                              style={[
                                styles.carActionBtn,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View
                              style={[
                                styles.deleteButton,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                    </>
                  ) : myVehicles.filter((v) => v.status === "rejected")
                      .length === 0 ? (
                    <View
                      style={[
                        styles.emptyCars,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="car.fill"
                        size={40}
                        color={colors.icon}
                      />

                      <ThemedText
                        style={[styles.emptyCarsTitle, { color: colors.text }]}
                      >
                        No rejected cars
                      </ThemedText>

                      <ThemedText
                        style={[styles.emptyCarsText, { color: colors.icon }]}
                      >
                        Your rejected vehicles will appear here
                      </ThemedText>
                    </View>
                  ) : (
                    myVehicles
                      .filter((v) => v.status === "rejected")
                      .map((vehicle) => (
                        <View
                          key={vehicle.id}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.carContent}
                            onPress={() =>
                              router.push(`/vehicle/${vehicle.id}`)
                            }
                          >
                            <Image
                              source={{
                                uri: resolveImageUrl(vehicle.images?.[0]),
                              }}
                              style={styles.carImage}
                              contentFit="cover"
                            />

                            <View style={styles.carInfo}>
                              <ThemedText style={styles.carTitle}>
                                {vehicle.title ||
                                  `${vehicle.brand} ${vehicle.model}`}
                              </ThemedText>

                              <ThemedText
                                style={[
                                  styles.carPrice,
                                  { color: colors.primary },
                                ]}
                              >
                                {displayPrice(Number(vehicle.price) || 0)}
                              </ThemedText>

                              <ThemedText
                                style={[styles.carStatus, { color: "#721C24" }]}
                              >
                                REJECTED
                              </ThemedText>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.carActions}>
                            <TouchableOpacity
                              style={[
                                styles.editButton,
                                { backgroundColor: colors.primary },
                              ]}
                              onPress={() =>
                                router.push(`/vehicle/edit?id=${vehicle.id}`)
                              }
                            >
                              <IconSymbol
                                name="arrow.clockwise"
                                size={16}
                                color="#fff"
                              />

                              <ThemedText style={styles.editButtonText}>
                                Resubmit
                              </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleOpenDeleteModal(vehicle)}
                            >
                              <IconSymbol
                                name="trash"
                                size={18}
                                color="#DC2626"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                  )}
                </View>
              )}

              {activeTab === "orders" && (
                <View style={styles.carsList}>
                  {isLoadingRequests ? (
                    <>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <View
                          key={`order-skeleton-${idx}`}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.carContent}>
                            <View
                              style={[
                                styles.carImage,
                                { backgroundColor: skeletonSoft },
                              ]}
                            />
                            <View style={styles.carInfo}>
                              <View
                                style={{
                                  height: 14,
                                  width: "70%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 12,
                                  width: "40%",
                                  borderRadius: 6,
                                  backgroundColor: skeletonBase,
                                  marginBottom: 8,
                                }}
                              />
                              <View
                                style={{
                                  height: 20,
                                  width: 120,
                                  borderRadius: 10,
                                  backgroundColor: skeletonSoft,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : contactRequests.length === 0 ? (
                    <View style={styles.emptyRequests}>
                      <ThemedText style={{ color: colors.icon }}>
                        No orders yet
                      </ThemedText>
                    </View>
                  ) : selectedVehicleOrders ? (
                    // Show buyers for selected vehicle
                    <View>
                      <TouchableOpacity
                        style={[styles.backButton, { marginBottom: 16 }]}
                        onPress={() => setSelectedVehicleOrders(null)}
                      >
                        <IconSymbol
                          name="chevron.left"
                          size={20}
                          color={colors.primary}
                        />
                        <ThemedText
                          style={{ color: colors.primary, fontWeight: "600" }}
                        >
                          Back to Orders
                        </ThemedText>
                      </TouchableOpacity>

                      {/* Subscription Banner */}
                      {!hasSub && (
                        <View
                          style={[
                            styles.subscriptionBanner,
                            {
                              backgroundColor: `${colors.primary}15`,
                              borderColor: colors.border,
                              marginBottom: 16,
                            },
                          ]}
                        >
                          <IconSymbol
                            name="exclamationmark.triangle.fill"
                            size={20}
                            color={colors.primary}
                          />
                          <View style={styles.subscriptionBannerContent}>
                            <ThemedText
                              style={{ color: colors.text, fontWeight: "600" }}
                            >
                              Subscription Required
                            </ThemedText>
                            <ThemedText
                              style={{ color: colors.icon, fontSize: 13 }}
                            >
                              Pay RWF 5,000 to view buyer contact details
                            </ThemedText>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.approveButton,
                              {
                                backgroundColor: colors.primary,
                                opacity: isProcessingSubscription ? 0.7 : 1,
                              },
                            ]}
                            onPress={handleMockSubscriptionPayment}
                            disabled={isProcessingSubscription}
                          >
                            <ThemedText
                              style={{ color: "#fff", fontWeight: "600" }}
                            >
                              {isProcessingSubscription
                                ? "Processing..."
                                : "Pay Now"}
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Selected Vehicle Header */}
                      {(() => {
                        const vehicleRequests = contactRequests.filter(
                          (r) => r.vehicleId === selectedVehicleOrders,
                        );
                        const firstRequest = vehicleRequests[0];
                        const vehicleImage = firstRequest?.vehicle?.images?.[0];
                        const selectedVehicleId = firstRequest?.vehicleId;
                        return (
                          <View
                            style={[
                              styles.carCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                marginBottom: 16,
                              },
                            ]}
                          >
                            <View style={styles.carContent}>
                              {vehicleImage && (
                                <Image
                                  source={{
                                    uri: resolveImageUrl(vehicleImage),
                                  }}
                                  style={styles.carImage}
                                  contentFit="cover"
                                />
                              )}
                              <View style={styles.carInfo}>
                                <ThemedText style={styles.carTitle}>
                                  {firstRequest?.vehicleTitle ||
                                    firstRequest?.vehicle?.title ||
                                    "Vehicle"}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.carPrice,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {vehicleRequests.length} order
                                  {vehicleRequests.length !== 1 ? "s" : ""}
                                </ThemedText>
                                {selectedVehicleId ? (
                                  <TouchableOpacity
                                    style={[
                                      styles.approveButton,
                                      {
                                        backgroundColor: "#DC2626",
                                        marginTop: 8,
                                        alignSelf: "flex-start",
                                      },
                                    ]}
                                    onPress={() =>
                                      handleMarkVehicleSold(selectedVehicleId)
                                    }
                                  >
                                    <ThemedText
                                      style={{
                                        color: "#fff",
                                        fontWeight: "600",
                                      }}
                                    >
                                      Mark as Sold Out
                                    </ThemedText>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Buyers List */}
                      <ThemedText
                        type="defaultSemiBold"
                        style={{ marginBottom: 12 }}
                      >
                        Buyers
                      </ThemedText>
                      {contactRequests
                        .filter((r) => r.vehicleId === selectedVehicleOrders)
                        .map((request) => (
                          <View
                            key={request.id}
                            style={[
                              styles.requestCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                marginBottom: 12,
                              },
                            ]}
                          >
                            <View style={styles.requestHeader}>
                              <ThemedText style={styles.requestUser}>
                                {hasSub ? request.buyerName : "••••••••"}
                              </ThemedText>
                              <View
                                style={[
                                  styles.statusBadge,
                                  {
                                    backgroundColor:
                                      request.status === "pending"
                                        ? "#FFF3CD"
                                        : request.status === "approved"
                                          ? "#D4EDDA"
                                          : "#F8D7DA",
                                  },
                                ]}
                              >
                                <ThemedText
                                  style={[
                                    styles.statusText,
                                    {
                                      color:
                                        request.status === "pending"
                                          ? "#856404"
                                          : request.status === "approved"
                                            ? "#155724"
                                            : "#721C24",
                                      textTransform: "capitalize",
                                    },
                                  ]}
                                >
                                  {request.status}
                                </ThemedText>
                              </View>
                            </View>

                            {request.message && (
                              <ThemedText
                                style={[
                                  styles.requestMessage,
                                  { color: colors.icon },
                                  !hasSub && styles.blurredInfoText,
                                ]}
                              >
                                {hasSub
                                  ? `"${request.message}"`
                                  : '"••••••••••••••••"'}
                              </ThemedText>
                            )}

                            <ThemedText
                              style={[
                                styles.requestDate,
                                { color: colors.icon },
                              ]}
                            >
                              {new Date(request.createdAt).toLocaleDateString()}
                            </ThemedText>

                            {/* Contact & Chat */}
                            {hasSub ? (
                              <View style={{ marginTop: 12, gap: 8 }}>
                                <View
                                  style={[
                                    styles.contactInfoBox,
                                    { backgroundColor: `${colors.primary}15` },
                                  ]}
                                >
                                  <IconSymbol
                                    name="phone.fill"
                                    size={16}
                                    color={colors.primary}
                                  />
                                  <ThemedText
                                    style={{
                                      color: colors.primary,
                                      fontWeight: "600",
                                    }}
                                  >
                                    {request.buyerPhone || "+250 788 XXX XXX"}
                                  </ThemedText>
                                </View>
                                <TouchableOpacity
                                  style={[
                                    styles.approveButton,
                                    { backgroundColor: colors.primary },
                                  ]}
                                  onPress={() => handleStartChat(request.vehicleId, request.buyerId)}
                                >
                                  <IconSymbol
                                    name="message.fill"
                                    size={16}
                                    color="#fff"
                                  />
                                  <ThemedText
                                    style={{ color: "#fff", fontWeight: "600" }}
                                  >
                                    Chat with Buyer
                                  </ThemedText>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.lockedContactBox,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    marginTop: 12,
                                  },
                                ]}
                              >
                                <IconSymbol
                                  name="lock.fill"
                                  size={16}
                                  color={colors.icon}
                                />
                                <ThemedText
                                  style={{ color: colors.icon, fontSize: 13 }}
                                >
                                  Pay to view contact & chat
                                </ThemedText>
                              </View>
                            )}

                            {/* Action Buttons for Pending */}
                            {request.status === "pending" && (
                              <View style={styles.requestActions}>
                                <TouchableOpacity
                                  style={[
                                    styles.rejectButton,
                                    { borderColor: colors.border },
                                  ]}
                                  onPress={() =>
                                    handleRejectRequest(request.id)
                                  }
                                >
                                  <ThemedText
                                    style={{
                                      color: colors.icon,
                                      fontWeight: "600",
                                    }}
                                  >
                                    Reject
                                  </ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.approveButton,
                                    { backgroundColor: colors.primary },
                                  ]}
                                  onPress={() =>
                                    handleApproveRequest(request.id)
                                  }
                                >
                                  <ThemedText
                                    style={{ color: "#fff", fontWeight: "600" }}
                                  >
                                    Approve
                                  </ThemedText>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))}
                    </View>
                  ) : (
                    // Show vehicles with order counts
                    (() => {
                      // Group orders by vehicle
                      const vehicleMap = new Map();
                      contactRequests.forEach((request) => {
                        const vehicleId = request.vehicleId;
                        const vehicle = request.vehicle;
                        if (!vehicleMap.has(vehicleId)) {
                          vehicleMap.set(vehicleId, {
                            vehicleId: vehicleId,
                            vehicleTitle:
                              request.vehicleTitle ||
                              vehicle?.title ||
                              "Vehicle",
                            vehicleImage: vehicle?.images?.[0],
                            orders: [],
                          });
                        }
                        vehicleMap.get(vehicleId).orders.push(request);
                      });
                      const vehicles = Array.from(vehicleMap.values());

                      return vehicles.map((vehicle) => (
                        <View
                          key={vehicle.vehicleId}
                          style={[
                            styles.carCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.carContent}
                            onPress={() =>
                              setSelectedVehicleOrders(vehicle.vehicleId)
                            }
                          >
                            {vehicle.vehicleImage && (
                              <Image
                                source={{
                                  uri: resolveImageUrl(vehicle.vehicleImage),
                                }}
                                style={styles.carImage}
                                contentFit="cover"
                              />
                            )}
                            <View style={styles.carInfo}>
                              <ThemedText style={styles.carTitle}>
                                {vehicle.vehicleTitle}
                              </ThemedText>
                              <ThemedText
                                style={[
                                  styles.carPrice,
                                  { color: colors.primary },
                                ]}
                              >
                                {vehicle.orders.length} order
                                {vehicle.orders.length !== 1 ? "s" : ""}
                              </ThemedText>
                              <View
                                style={[
                                  styles.carStatusBadge,
                                  {
                                    backgroundColor: `${colors.primary}20`,
                                    borderWidth: 1,
                                    borderColor: colors.primary,
                                  },
                                ]}
                              >
                                <IconSymbol
                                  name="person.fill"
                                  size={12}
                                  color={colors.primary}
                                />
                                <ThemedText
                                  style={[
                                    styles.carStatusText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {
                                    vehicle.orders.filter(
                                      (o) => o.status === "pending",
                                    ).length
                                  }{" "}
                                  pending
                                </ThemedText>
                              </View>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.orderViewBtn,
                              {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                            onPress={() =>
                              setSelectedVehicleOrders(vehicle.vehicleId)
                            }
                          >
                            <ThemedText style={styles.orderViewBtnText}>
                              View
                            </ThemedText>
                            <IconSymbol
                              name="chevron.right"
                              size={12}
                              color="#fff"
                            />
                          </TouchableOpacity>
                        </View>
                      ));
                    })()
                  )}
                </View>
              )}

              {activeTab === "preferences" && (
                <View
                  style={[
                    styles.menuSection,
                    isDesktopWeb && styles.webMenuSection,
                  ]}
                >
                  <ThemedText
                    style={[styles.menuSectionTitle, { color: colors.icon }]}
                  >
                    Preferences
                  </ThemedText>

                  <View
                    style={[
                      styles.menuCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <MenuItem
                      icon="pencil"
                      title="Edit Profile"
                      colors={colors}
                      onPress={() => router.push("/settings/account")}
                    />

                    {userType === "seller" && (
                      <MenuItem
                        icon="car.fill"
                        title="All My Listings"
                        colors={colors}
                        onPress={() => router.push("/listings")}
                      />
                    )}

                    <MenuItem
                      icon="heart.fill"
                      title="Saved Vehicles"
                      colors={colors}
                      onPress={() => router.push("/favorites")}
                    />

                    <MenuItem
                      icon="chevron.right"
                      title="Notifications"
                      colors={colors}
                      onPress={() => router.push("/settings/notifications")}
                    />

                    <MenuItem
                      icon="chevron.right"
                      title="Privacy & Security"
                      colors={colors}
                      onPress={() => router.push("/settings/privacy")}
                    />

                    <MenuItem
                      icon="exclamationmark.triangle.fill"
                      title="Report an Issue"
                      colors={colors}
                      onPress={() => router.push("/report")}
                    />

                    <MenuItem
                      icon="magnifyingglass"
                      title="Language / Ururimi"
                      colors={colors}
                      onPress={() => setShowLanguages(!showLanguages)}
                      isDropdown={showLanguages}
                    />

                    {showLanguages && (
                      <View
                        style={[
                          styles.languageDropdown,
                          {
                            backgroundColor: colors.card,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setShowLanguages(false);
                          }}
                        >
                          <View style={styles.flagRow}>
                            <Image
                              source={{ uri: "https://flagcdn.com/w40/gb.png" }}
                              style={styles.flagImage}
                            />

                            <ThemedText
                              style={[styles.langText, { color: colors.text }]}
                            >
                              English
                            </ThemedText>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setShowLanguages(false);
                          }}
                        >
                          <View style={styles.flagRow}>
                            <Image
                              source={{ uri: "https://flagcdn.com/w40/fr.png" }}
                              style={styles.flagImage}
                            />

                            <ThemedText
                              style={[styles.langText, { color: colors.text }]}
                            >
                              Français
                            </ThemedText>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setShowLanguages(false);
                          }}
                        >
                          <View style={styles.flagRow}>
                            <Image
                              source={{ uri: "https://flagcdn.com/w40/rw.png" }}
                              style={styles.flagImage}
                            />

                            <ThemedText
                              style={[styles.langText, { color: colors.text }]}
                            >
                              Kinyarwanda
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    <MenuItem
                      icon="chevron.right"
                      title={`Dark Mode (${themeModeLabel})`}
                      colors={colors}
                      onPress={() => setShowThemeOptions(!showThemeOptions)}
                      isDropdown={showThemeOptions}
                    />

                    {showThemeOptions && (
                      <View
                        style={[
                          styles.languageDropdown,
                          {
                            backgroundColor: colors.card,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setThemeModePreference("system");
                            setSelectedThemeMode("system");
                            setShowThemeOptions(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.langText,
                              {
                                color:
                                  selectedThemeMode === "system"
                                    ? colors.primary
                                    : colors.text,
                                fontWeight:
                                  selectedThemeMode === "system" ? "700" : "500",
                              },
                            ]}
                          >
                            System
                          </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setThemeModePreference("light");
                            setSelectedThemeMode("light");
                            setShowThemeOptions(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.langText,
                              {
                                color:
                                  selectedThemeMode === "light"
                                    ? colors.primary
                                    : colors.text,
                                fontWeight:
                                  selectedThemeMode === "light" ? "700" : "500",
                              },
                            ]}
                          >
                            Light
                          </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.langOption}
                          onPress={() => {
                            setThemeModePreference("dark");
                            setSelectedThemeMode("dark");
                            setShowThemeOptions(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.langText,
                              {
                                color:
                                  selectedThemeMode === "dark"
                                    ? colors.primary
                                    : colors.text,
                                fontWeight:
                                  selectedThemeMode === "dark" ? "700" : "500",
                              },
                            ]}
                          >
                            Dark
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}

                    <MenuItem
                      icon="magnifyingglass"
                      title="Help & Support"
                      colors={colors}
                      onPress={() => router.push("/contact")}
                    />
                  </View>

                  {/* Logout Button inside Preferences tab */}
                  <TouchableOpacity
                    style={[
                      styles.logoutButton,
                      isDesktopWeb && styles.webLogoutButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleLogout}
                  >
                    <ThemedText
                      style={[
                        styles.logoutText,
                        { color: isDark ? "#FCA5A5" : "#DC2626" },
                      ]}
                    >
                      Logout
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            </View>

          <WebFooter />
        </ScrollView>

        {/* Header Sheet Modal */}

        <Modal
          transparent
          animationType="slide"
          visible={showHeaderSheet}
          onRequestClose={() => setShowHeaderSheet(false)}
        >
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => setShowHeaderSheet(false)}
          >
            <Pressable
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom,
                },
              ]}
              onPress={() => {}}
            >
              <View
                style={[styles.sheetHandle, { backgroundColor: colors.border }]}
              />

              <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
                Menu
              </ThemedText>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowHeaderSheet(false);
                  router.push("/contact");
                }}
              >
                <ThemedText style={styles.sheetItemText}>Support</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => setShowCurrencyOptions((prev) => !prev)}
              >
                <View style={styles.currencyRow}>
                  <ThemedText style={styles.sheetItemText}>Currency</ThemedText>

                  <View style={styles.currencyRowRight}>
                    <ThemedText
                      style={{
                        color: colors.primary,
                        marginRight: 8,
                        fontWeight: "700",
                      }}
                    >
                      {selectedCurrency}
                    </ThemedText>

                    <IconSymbol
                      name={
                        showCurrencyOptions ? "chevron.down" : "chevron.right"
                      }
                      size={18}
                      color={colors.icon}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {showCurrencyOptions && (
                <View
                  style={[
                    styles.currencyOptions,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  {CURRENCIES.map((currency) => (
                    <TouchableOpacity
                      key={currency}
                      style={[
                        styles.currencyOption,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={async () => {
                        await setCurrencyPreference(currency);

                        setSelectedCurrency(currency);

                        setShowCurrencyOptions(false);
                      }}
                    >
                      <ThemedText
                        style={{
                          color:
                            currency === selectedCurrency
                              ? colors.primary
                              : colors.text,
                          fontWeight:
                            currency === selectedCurrency ? "700" : "500",
                        }}
                      >
                        {currency}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => setShowThemeOptions((prev) => !prev)}
              >
                <View style={styles.currencyRow}>
                  <ThemedText style={styles.sheetItemText}>
                    Dark Mode
                  </ThemedText>

                  <View style={styles.currencyRowRight}>
                    <ThemedText
                      style={{
                        color: colors.primary,
                        marginRight: 8,
                        fontWeight: "700",
                      }}
                    >
                      {themeModeLabel}
                    </ThemedText>

                    <IconSymbol
                      name={showThemeOptions ? "chevron.down" : "chevron.right"}
                      size={18}
                      color={colors.icon}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {showThemeOptions && (
                <View
                  style={[
                    styles.currencyOptions,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  {THEME_MODES.map((mode) => {
                    const label =
                      mode === "system"
                        ? "System"
                        : mode === "dark"
                          ? "Dark"
                          : "Light";

                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.currencyOption,
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => {
                          setThemeModePreference(mode);

                          setSelectedThemeMode(mode);

                          setShowThemeOptions(false);
                        }}
                      >
                        <ThemedText
                          style={{
                            color:
                              mode === selectedThemeMode
                                ? colors.primary
                                : colors.text,
                            fontWeight:
                              mode === selectedThemeMode ? "700" : "500",
                          }}
                        >
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={handleLogout}
              >
                <ThemedText
                  style={[
                    styles.sheetItemText,
                    { color: isDark ? "#FCA5A5" : "#DC2626" },
                  ]}
                >
                  Logout
                </ThemedText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Profile Action Sheet */}

        <Modal
          transparent
          animationType="slide"
          visible={showProfileActionSheet}
          onRequestClose={() => setShowProfileActionSheet(false)}
        >
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => setShowProfileActionSheet(false)}
          >
            <Pressable
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom,
                },
              ]}
              onPress={() => {}}
            >
              <View
                style={[styles.sheetHandle, { backgroundColor: colors.border }]}
              />

              <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
                Profile Actions
              </ThemedText>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowProfileActionSheet(false);
                  router.push("/settings/account");
                }}
              >
                <ThemedText style={styles.sheetItemText}>
                  Edit Profile
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={pickProfileImage}
              >
                <ThemedText style={styles.sheetItemText}>
                  Change Profile Picture
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetItem, { borderColor: colors.border }]}
                onPress={() => {
                  setShowProfileActionSheet(false);
                  router.push("/sell");
                }}
              >
                <ThemedText style={styles.sheetItemText}>Sell a Car</ThemedText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Delete Confirmation Modal */}

        <Modal
          transparent
          animationType="fade"
          visible={deleteModalVisible}
          onRequestClose={handleCloseDeleteModal}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.modalHeader}>
                <IconSymbol
                  name="exclamationmark.triangle.fill"
                  size={48}
                  color="#DC2626"
                />

                <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                  Delete Listing
                </ThemedText>

                <ThemedText
                  style={[styles.modalSubtitle, { color: colors.icon }]}
                >
                  This action cannot be undone. To confirm, please type the car
                  name below.
                </ThemedText>
              </View>

              <View style={styles.modalContent}>
                <ThemedText
                  style={[styles.carNameLabel, { color: colors.text }]}
                >
                  Car name to delete:
                </ThemedText>

                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.carNameToConfirm, { color: colors.primary }]}
                >
                  {vehicleToDelete?.title}
                </ThemedText>

                <TextInput
                  style={[
                    styles.confirmInput,
                    {
                      backgroundColor: colors.card,

                      borderColor:
                        confirmText && confirmText !== vehicleToDelete?.title
                          ? "#DC2626"
                          : colors.border,

                      color: colors.text,
                    },
                  ]}
                  placeholder="Type car name here"
                  placeholderTextColor={colors.icon}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {confirmText && confirmText !== vehicleToDelete?.title && (
                  <ThemedText style={styles.errorText}>
                    Car name doesn't match
                  </ThemedText>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={handleCloseDeleteModal}
                  disabled={isDeleting}
                >
                  <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    {
                      backgroundColor:
                        confirmText === vehicleToDelete?.title
                          ? "#DC2626"
                          : "#9CA3AF",

                      opacity: isDeleting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleConfirmDelete}
                  disabled={
                    confirmText !== vehicleToDelete?.title || isDeleting
                  }
                >
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Buyer Profile View

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

          isDesktopWeb && styles.webHeader,

          isDesktopWeb && {
            paddingHorizontal: profileContainerPadding,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          My Profile
        </ThemedText>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowHeaderSheet(true)}
        >
          <IconSymbol name="chevron.down" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View
          style={[
            styles.scrollContent,

            isDesktopWeb && styles.webScrollContent,

            isDesktopWeb && {
              paddingHorizontal: profileContainerPadding,
            },
          ]}
        >
          {/* User Info */}

          <View
            style={[
              styles.userInfoSection,
              isDesktopWeb && styles.webUserInfoSection,
            ]}
          >
            <View style={styles.imageContainer}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.profileImage}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    {
                      backgroundColor: colors.primary,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 36,
                    },
                  ]}
                >
                  <ThemedText
                    style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}
                  >
                    {(authUser?.fullName || "U")[0].toUpperCase()}
                  </ThemedText>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.editImageBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setShowProfileActionSheet(true)}
              >
                <IconSymbol
                  name="plus.circle.fill"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.userDetails}>
              <ThemedText style={styles.userName}>
                {authUser?.fullName || "Buyer"}
              </ThemedText>

              <ThemedText style={[styles.userContact, { color: colors.icon }]}>
                {authUser?.email || ""}
              </ThemedText>

              {authUser?.isEmailVerified && (
                <View
                  style={[
                    styles.verifiedBadge,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={12}
                    color={colors.primary}
                  />

                  <ThemedText
                    style={[styles.verifiedText, { color: colors.text }]}
                  >
                    Verified Buyer
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Tabs for Buyer */}
          <View
            style={[
              styles.tabsContainer,
              isDesktopWeb && styles.webTabsContainer,
              { borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                isDesktopWeb && styles.webTab,
                activeTab === "activity" && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab("activity")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "activity" ? colors.primary : colors.icon,
                  },
                ]}
              >
                Activity
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                isDesktopWeb && styles.webTab,
                activeTab === "preferences" && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab("preferences")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "preferences" ? colors.primary : colors.icon,
                  },
                ]}
              >
                Preferences
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content for Buyer */}
          <View
            style={[styles.tabContent, isDesktopWeb && styles.webTabContent]}
          >
            {activeTab === "activity" && (
              <View
                style={[styles.menuSection, isDesktopWeb && styles.webMenuSection]}
              >
                <ThemedText
                  style={[styles.menuSectionTitle, { color: colors.icon }]}
                >
                  My Activity
                </ThemedText>

                <View
                  style={[
                    styles.menuCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MenuItem
                    icon="heart.fill"
                    title="Saved Vehicles"
                    colors={colors}
                    onPress={() => router.push("/favorites")}
                  />

                  <MenuItem
                    icon="message.fill"
                    title="Messages"
                    colors={colors}
                    onPress={() => router.push("/messages")}
                  />

                  <MenuItem
                    icon="car.fill"
                    title="My Cart"
                    colors={colors}
                    onPress={() => router.push("/order" as any)}
                    isLast
                  />
                </View>
              </View>
            )}

            {activeTab === "preferences" && (
              <View
                style={[styles.menuSection, isDesktopWeb && styles.webMenuSection]}
              >
                <ThemedText
                  style={[styles.menuSectionTitle, { color: colors.icon }]}
                >
                  Preferences
                </ThemedText>

                <View
                  style={[
                    styles.menuCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MenuItem
                    icon="pencil"
                    title="Edit Profile"
                    colors={colors}
                    onPress={() => router.push("/settings/account")}
                  />

                  <MenuItem
                    icon="heart.fill"
                    title="Saved Vehicles"
                    colors={colors}
                    onPress={() => router.push("/favorites")}
                  />

                  <MenuItem
                    icon="chevron.right"
                    title="Notifications"
                    colors={colors}
                    onPress={() => router.push("/settings/notifications")}
                  />

                  <MenuItem
                    icon="chevron.right"
                    title="Privacy & Security"
                    colors={colors}
                    onPress={() => router.push("/settings/privacy")}
                  />

                  <MenuItem
                    icon="exclamationmark.triangle.fill"
                    title="Report an Issue"
                    colors={colors}
                    onPress={() => router.push("/report")}
                  />

                  <MenuItem
                    icon="magnifyingglass"
                    title="Language / Ururimi"
                    colors={colors}
                    onPress={() => setShowLanguages(!showLanguages)}
                    isDropdown={showLanguages}
                  />

                  {showLanguages && (
                    <View
                      style={[
                        styles.languageDropdown,
                        {
                          backgroundColor: colors.card,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setShowLanguages(false);
                        }}
                      >
                        <View style={styles.flagRow}>
                          <Image
                            source={{ uri: "https://flagcdn.com/w40/gb.png" }}
                            style={styles.flagImage}
                          />

                          <ThemedText
                            style={[styles.langText, { color: colors.text }]}
                          >
                            English
                          </ThemedText>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setShowLanguages(false);
                        }}
                      >
                        <View style={styles.flagRow}>
                          <Image
                            source={{ uri: "https://flagcdn.com/w40/fr.png" }}
                            style={styles.flagImage}
                          />

                          <ThemedText
                            style={[styles.langText, { color: colors.text }]}
                          >
                            Français
                          </ThemedText>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setShowLanguages(false);
                        }}
                      >
                        <View style={styles.flagRow}>
                          <Image
                            source={{ uri: "https://flagcdn.com/w40/rw.png" }}
                            style={styles.flagImage}
                          />

                          <ThemedText
                            style={[styles.langText, { color: colors.text }]}
                          >
                            Kinyarwanda
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  <MenuItem
                    icon="chevron.right"
                    title={`Dark Mode (${themeModeLabel})`}
                    colors={colors}
                    onPress={() => setShowThemeOptions(!showThemeOptions)}
                    isDropdown={showThemeOptions}
                  />

                  {showThemeOptions && (
                    <View
                      style={[
                        styles.languageDropdown,
                        {
                          backgroundColor: colors.card,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setThemeModePreference("system");
                          setSelectedThemeMode("system");
                          setShowThemeOptions(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.langText,
                            {
                              color:
                                selectedThemeMode === "system"
                                  ? colors.primary
                                  : colors.text,
                              fontWeight:
                                selectedThemeMode === "system" ? "700" : "500",
                            },
                          ]}
                        >
                          System
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setThemeModePreference("light");
                          setSelectedThemeMode("light");
                          setShowThemeOptions(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.langText,
                            {
                              color:
                                selectedThemeMode === "light"
                                  ? colors.primary
                                  : colors.text,
                              fontWeight:
                                selectedThemeMode === "light" ? "700" : "500",
                            },
                          ]}
                        >
                          Light
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.langOption}
                        onPress={() => {
                          setThemeModePreference("dark");
                          setSelectedThemeMode("dark");
                          setShowThemeOptions(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.langText,
                            {
                              color:
                                selectedThemeMode === "dark"
                                  ? colors.primary
                                  : colors.text,
                              fontWeight:
                                selectedThemeMode === "dark" ? "700" : "500",
                            },
                          ]}
                        >
                          Dark
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  <MenuItem
                    icon="magnifyingglass"
                    title="Help & Support"
                    colors={colors}
                    onPress={() => router.push("/contact")}
                  />
                </View>

                {/* Logout Button inside Preferences tab */}
                <TouchableOpacity
                  style={[
                    styles.logoutButton,
                    isDesktopWeb && styles.webLogoutButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleLogout}
                >
                  <ThemedText
                    style={[
                      styles.logoutText,
                      { color: isDark ? "#FCA5A5" : "#DC2626" },
                    ]}
                  >
                    Logout
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <WebFooter />
      </ScrollView>

      {/* Header Sheet Modal */}

      <Modal
        transparent
        animationType="slide"
        visible={showHeaderSheet}
        onRequestClose={() => setShowHeaderSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowHeaderSheet(false)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom,
              },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
              Menu
            </ThemedText>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={() => {
                setShowHeaderSheet(false);
                router.push("/contact");
              }}
            >
              <ThemedText style={styles.sheetItemText}>Support</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={() => setShowCurrencyOptions((prev) => !prev)}
            >
              <View style={styles.currencyRow}>
                <ThemedText style={styles.sheetItemText}>Currency</ThemedText>

                <View style={styles.currencyRowRight}>
                  <ThemedText
                    style={{
                      color: colors.primary,
                      marginRight: 8,
                      fontWeight: "700",
                    }}
                  >
                    {selectedCurrency}
                  </ThemedText>

                  <IconSymbol
                    name={
                      showCurrencyOptions ? "chevron.down" : "chevron.right"
                    }
                    size={18}
                    color={colors.icon}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {showCurrencyOptions && (
              <View
                style={[
                  styles.currencyOptions,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                {CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={async () => {
                      await setCurrencyPreference(currency);

                      setSelectedCurrency(currency);

                      setShowCurrencyOptions(false);
                    }}
                  >
                    <ThemedText
                      style={{
                        color:
                          currency === selectedCurrency
                            ? colors.primary
                            : colors.text,
                        fontWeight:
                          currency === selectedCurrency ? "700" : "500",
                      }}
                    >
                      {currency}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <ThemeSelector colors={colors} />

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={handleLogout}
            >
              <ThemedText style={[styles.sheetItemText, { color: errorColor }]}>
                Logout
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Profile Action Sheet */}

      <Modal
        transparent
        animationType="slide"
        visible={showProfileActionSheet}
        onRequestClose={() => setShowProfileActionSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowProfileActionSheet(false)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { backgroundColor: colors.background },
            ]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
              Profile Actions
            </ThemedText>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={() => {
                setShowProfileActionSheet(false);
                router.push("/settings/account");
              }}
            >
              <ThemedText style={styles.sheetItemText}>Edit Profile</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetItem, { borderColor: colors.border }]}
              onPress={pickProfileImage}
            >
              <ThemedText style={styles.sheetItemText}>
                Change Profile Picture
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  title,
  colors,
  onPress,
  isLast = false,
  isDropdown,
}: {
  icon: any;
  title: string;
  colors: any;
  onPress?: () => void;
  isLast?: boolean;
  isDropdown?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast &&
          !isDropdown && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
      ]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <IconSymbol
          name={icon}
          size={20}
          color={colors.icon}
          style={styles.menuIcon}
        />

        <ThemedText style={[styles.menuTitle, { color: colors.text }]}>
          {title}
        </ThemedText>
      </View>

      <IconSymbol
        name={isDropdown ? "chevron.down" : "chevron.right"}
        size={20}
        color={colors.icon}
      />
    </TouchableOpacity>
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

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  headerTitle: {
    fontSize: 20,
  },

  iconButton: {
    padding: 4,
  },

  scrollContent: {
    paddingHorizontal: 20,

    paddingTop: 24,

    paddingBottom: 100,
  },

  webScrollContent: {
    paddingTop: 48,
    paddingBottom: 40,
  },

  webUserInfoSection: {
    width: '100%',
    justifyContent: 'center',
    alignItems:"center"
},

  webHeader: {
    width: "100%",
  },

  userInfoSection: {
width: '100%',
    justifyContent: 'center',
    alignItems: "center",


  },

  imageContainer: {

    position: "relative",

    marginRight: 16,
    justifyContent:"center",

  },

  profileImage: {
    width: 72,

    height: 72,

    borderRadius: 36,
  },

  editImageBtn: {
    position: "absolute",

    bottom: 0,

    right: -4,

    width: 28,

    height: 28,

    borderRadius: 14,

    justifyContent: "center",

    alignItems: "center",

    borderWidth: 2,
  },

  userDetails: {

  
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",

  },

  userName: {
    fontSize: 20,

    fontWeight: "600",

    marginBottom: 4,
    alignContent: "center",
  },

  userContact: {
    fontSize: 14,

    marginBottom: 8,
  },

  verifiedBadge: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 6,

    alignSelf: "center",

    gap: 6,

    borderWidth: 1,
  },

  verifiedText: {
    fontSize: 12,

    fontWeight: "500",
  },

  pendingBadge: {
    marginTop: 6,
  },

  messageQuickBtn: {
    marginTop: 10,

    alignSelf: "center",

    flexDirection: "row",

    alignItems: "center",

    gap: 6,
    marginBottom:10,

    borderWidth: 1,

    borderRadius: 999,

    paddingHorizontal: 10,

    paddingVertical: 5,
  },

  messageQuickText: {
    fontSize: 12,

    fontWeight: "600",
  },

  blurredInfoText: {
    opacity: 0.55,
  },

  subscriptionStatusCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  subscriptionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subscriptionStatusText: {
    flex: 1,
  },

  statsContainer: {
    flexDirection: "row",

    justifyContent: "space-between",

    marginBottom: 24,

    gap: 12,
  },

  webStatsContainer: {
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
  },

  statBox: {
    flex: 1,

    padding: 14,

    borderRadius: 8,

    borderWidth: 1,

    alignItems: "center",
  },

  webStatBox: {
    flexGrow: 0,

    flexShrink: 0,

    minWidth: 180,
  },

  statValue: {
    fontSize: 18,

    fontWeight: "700",

    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
  },

  // Tabs

  tabsContainer: {
    flexDirection: "row",

    marginBottom: 16,

    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  webTabsContainer: {
    justifyContent: "center",
  },

  tab: {
    flex: 1,

    paddingVertical: 12,

    alignItems: "center",
  },

  webTab: {
    flex: 0,

    minWidth: 160,
  },

  tabText: {
    fontSize: 14,

    fontWeight: "600",
  },

  tabContent: {
    marginBottom: 24,
  },

  webTabContent: {
    maxWidth: 860,

    alignSelf: "center",

    width: "100%",
  },

  // Cars List

  carsList: {
    gap: 12,
  },

  carCard: {
    flexDirection: "row",

    borderRadius: 12,

    borderWidth: 1,

    overflow: "hidden",

    alignItems: "center",
  },

  carContent: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    padding: 10,

    gap: 12,
  },

  carImage: {
    width: 124,

    height: 88,

    borderRadius: 10,
  },

  carInfo: {
    flex: 1,

    justifyContent: "center",
  },

  carTitle: {
    fontSize: 15,

    fontWeight: "600",

    marginBottom: 4,
  },

  carPrice: {
    fontSize: 14,

    fontWeight: "600",

    marginBottom: 2,
  },

  carStatus: {
    fontSize: 12,
  },

  carStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },

  carStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  carActions: {
    flexDirection: "row",

    gap: 8,

    paddingRight: 10,
  },

  carActionBtn: {
    width: 32,

    height: 32,

    borderRadius: 8,

    justifyContent: "center",

    alignItems: "center",
  },

  orderViewBtn: {
    marginLeft: 12,

    marginRight: 15,

    minWidth: 82,

    height: 36,

    borderRadius: 999,

    borderWidth: 1,

    paddingHorizontal: 14,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,
  },

  orderViewBtnText: {
    color: "#fff",

    fontSize: 13,

    fontWeight: "700",
  },

  deleteButton: {
    width: 32,

    height: 32,

    borderRadius: 8,

    justifyContent: "center",

    alignItems: "center",
  },

  editButton: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    padding: 8,

    borderRadius: 8,

    gap: 6,

    flex: 1,
  },

  editButtonText: {
    color: "#fff",

    fontSize: 13,

    fontWeight: "600",
  },

  emptyCars: {
    borderWidth: 1,

    borderRadius: 12,

    paddingVertical: 20,

    paddingHorizontal: 16,

    alignItems: "center",

    gap: 8,
  },

  emptyCarsTitle: {
    fontSize: 15,

    fontWeight: "700",
  },

  emptyCarsText: {
    fontSize: 13,

    textAlign: "center",

    lineHeight: 19,
  },

  // Reviews

  reviewsList: {
    gap: 12,
  },

  emptyReviews: {
    borderWidth: 1,

    borderRadius: 12,

    paddingVertical: 20,

    paddingHorizontal: 16,

    alignItems: "center",

    gap: 8,
  },

  emptyReviewsTitle: {
    fontSize: 15,

    fontWeight: "700",
  },

  emptyReviewsText: {
    fontSize: 13,

    textAlign: "center",

    lineHeight: 19,
  },

  reviewCard: {
    padding: 16,

    borderRadius: 12,

    borderWidth: 1,
  },

  reviewHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 8,
  },

  reviewUser: {
    fontSize: 15,

    fontWeight: "600",
  },

  ratingContainer: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,
  },

  ratingText: {
    fontSize: 14,

    fontWeight: "600",

    color: "#FFD700",
  },

  reviewComment: {
    fontSize: 14,

    marginBottom: 4,
  },

  reviewDate: {
    fontSize: 12,
  },

  // Requests

  requestsList: {
    gap: 12,
  },

  requestCard: {
    padding: 16,

    borderRadius: 12,

    borderWidth: 1,
  },

  requestHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 8,
  },

  requestVehicle: {
    fontSize: 15,

    fontWeight: "600",

    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 12,
  },

  statusText: {
    fontSize: 12,

    fontWeight: "600",
  },

  requestUser: {
    fontSize: 14,

    marginBottom: 4,
  },

  requestDate: {
    fontSize: 12,
  },

  subscriptionBanner: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,

    padding: 16,

    borderRadius: 12,

    borderWidth: 1,

    marginBottom: 12,
  },

  subscriptionBannerContent: {
    flex: 1,
  },

  emptyRequests: {
    padding: 24,

    alignItems: "center",
  },

  requestMessage: {
    fontSize: 14,

    fontStyle: "italic",

    marginTop: 4,

    marginBottom: 4,
  },

  contactInfoSection: {
    marginTop: 12,

    paddingTop: 12,

    borderTopWidth: StyleSheet.hairlineWidth,
  },

  contactInfoBox: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    padding: 12,

    borderRadius: 8,
  },

  lockedContactBox: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    padding: 12,

    borderRadius: 8,

    borderWidth: 1,

    justifyContent: "center",
  },

  requestActions: {
    flexDirection: "row",

    gap: 10,

    marginTop: 12,
  },

  rejectButton: {
    flex: 1,

    paddingVertical: 10,

    paddingHorizontal: 20,

    borderRadius: 8,

    borderWidth: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  approveButton: {
    flex: 1,

    paddingVertical: 10,

    paddingHorizontal: 20,

    borderRadius: 8,

    alignItems: "center",

    justifyContent: "center",
  },

  // Menu

  menuSection: {
    marginBottom: 24,
  },

  webMenuSection: {
    maxWidth: 860,

    alignSelf: "center",

    width: "100%",
  },

  menuSectionTitle: {
    fontSize: 13,

    fontWeight: "600",

    marginBottom: 12,

    textTransform: "uppercase",

    letterSpacing: 0.5,
  },

  menuCard: {
    borderRadius: 8,

    borderWidth: 1,

    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    padding: 16,
  },

  menuItemLeft: {
    flexDirection: "row",

    alignItems: "center",
  },

  menuIcon: {
    marginRight: 16,
  },

  menuTitle: {
    fontSize: 15,

    fontWeight: "500",
  },

  // Sheet

  sheetOverlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.35)",

    justifyContent: "flex-end",
  },

  // Delete Modal

  modalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.5)",

    justifyContent: "center",

    alignItems: "center",

    padding: 20,
  },

  modalContainer: {
    width: "100%",

    maxWidth: 420,

    borderRadius: 16,

    padding: 24,
  },

  modalHeader: {
    alignItems: "center",

    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,

    marginTop: 12,

    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 14,

    textAlign: "center",
  },

  modalContent: {
    marginBottom: 20,
  },

  carNameLabel: {
    fontSize: 14,

    marginBottom: 8,
  },

  carNameToConfirm: {
    fontSize: 16,

    marginBottom: 16,
  },

  confirmInput: {
    borderWidth: 1,

    borderRadius: 10,

    paddingHorizontal: 16,

    paddingVertical: 12,

    fontSize: 16,
  },

  errorText: {
    color: "#DC2626",

    fontSize: 12,

    marginTop: 8,
  },

  modalActions: {
    flexDirection: "row",

    gap: 12,
  },

  cancelBtn: {
    flex: 1,

    borderWidth: 1,

    borderRadius: 10,

    paddingVertical: 14,

    alignItems: "center",
  },

  deleteBtn: {
    flex: 1,

    borderRadius: 10,

    paddingVertical: 14,

    alignItems: "center",
  },

  sheetContainer: {
    borderTopLeftRadius: 20,

    borderTopRightRadius: 20,

    paddingHorizontal: 16,

    paddingTop: 10,
  },

  sheetHandle: {
    alignSelf: "center",

    width: 44,

    height: 5,

    borderRadius: 999,

    marginBottom: 14,
  },

  sheetTitle: {
    fontSize: 20,

    marginBottom: 10,
  },

  sheetItem: {
    borderWidth: 1,

    borderRadius: 10,

    paddingHorizontal: 14,

    paddingVertical: 12,

    marginBottom: 10,
  },

  sheetItemText: {
    fontSize: 15,

    fontWeight: "600",
  },

  currencyRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  currencyRowRight: {
    flexDirection: "row",

    alignItems: "center",
  },

  currencyOptions: {
    borderWidth: 1,

    borderRadius: 10,

    marginBottom: 10,

    overflow: "hidden",
  },

  currencyOption: {
    paddingHorizontal: 14,

    paddingVertical: 12,

    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  languageDropdown: {
    paddingVertical: 8,

    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  langOption: {
    paddingVertical: 12,

    paddingHorizontal: 52,
  },

  langText: {
    fontSize: 15,

    fontWeight: "500",
  },

  flagRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  flagImage: {
    width: 28,

    height: 20,

    borderRadius: 2,
  },

  logoutButton: {
    padding: 16,

    borderRadius: 8,

    borderWidth: 1,

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    marginBottom: 20,
  },

  webLogoutButton: {
    maxWidth: 860,

    alignSelf: "center",

    width: "100%",
  },

  logoutText: {
    fontSize: 15,

    fontWeight: "600",
  },
});
