import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
} from "react-native";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Link, router, usePathname } from "expo-router";
import { isWeb } from "@/lib/platform";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { useAuth } from "@/context/AuthContext";
import { fetchUnreadMessagesCount } from "@/lib/api-messages";
import { fetchUnreadNotificationsCount } from "@/lib/api-notifications";

const LOGO_IMAGE = require("@/assets/images/Logo.png");

// Web-native link component that renders as an <a> tag with hover support + client-side nav
function WebLink({
  href,
  children,
  style,
  isActive,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  style?: any;
  isActive?: boolean;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const RouterLink = Link as any;

  const handlePress = () => {
    if (onNavigate) onNavigate();
    router.push(href as any);
  };

  if (!isWeb) {
    return (
      <Pressable onPress={handlePress} style={style}>
        {children}
      </Pressable>
    );
  }

  const baseStyle = StyleSheet.flatten(style) || {};
  const hoverStyle = hovered
    ? (StyleSheet.flatten([
        styles.linkHovered,
        {
          backgroundColor: isActive
            ? `${colors.primary}15`
            : "rgba(128,128,128,0.15)",
        },
      ]) as any)
    : {};
  const webStyle = {
    display: "flex",
    ...baseStyle,
    cursor: "pointer",
    ...hoverStyle,
  };

  return (
    <RouterLink
      href={href as any}
      onPress={() => {
        if (onNavigate) onNavigate();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={webStyle}
    >
      {children}
    </RouterLink>
  );
}

// Mobile menu link - closes modal and navigates
function MobileWebLink({
  href,
  children,
  style,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  style?: any;
  onNavigate?: () => void;
}) {
  const RouterLink = Link as any;
  const handlePress = () => {
    if (onNavigate) onNavigate();
    router.push(href as any);
  };

  if (!isWeb) {
    return (
      <Pressable onPress={handlePress} style={style}>
        {children}
      </Pressable>
    );
  }

  const baseStyle = StyleSheet.flatten(style) || {};
  const webStyle = { display: "flex", cursor: "pointer", ...baseStyle };

  return (
    <RouterLink
      href={href as any}
      onPress={() => {
        if (onNavigate) onNavigate();
      }}
      style={webStyle}
    >
      {children}
    </RouterLink>
  );
}

const CENTER_NAV_ITEMS = [
  { label: "Buy a car", path: "/explore", icon: "magnifyingglass" },
  { label: "Brands", path: "/brands", icon: "directions-car" },
];

const BUYING_MENU = {
  cars: [
    { label: "New cars for sale", path: "/explore?usage=Brand%20New" },
    { label: "Used cars for sale", path: "/explore?usage=Imported%20Used" },
    { label: "Certified pre-owned cars for sale", path: "/explore?usage=Used%20In%20Rwanda" },
    { label: "Search cars", path: "/search" },
    { label: "Buy vehicle insurance", path: "/insurance" },
  ],
  bodyType: [
    { label: "SUVs & Crossovers", path: "/explore?typebodies=SUVs" },
    { label: "Trucks", path: "/explore?typebodies=Trucks" },
    { label: "Sedans", path: "/explore?typebodies=Sedans" },
    { label: "Coupes", path: "/explore?typebodies=Coupes" },
    { label: "Minivans", path: "/explore?typebodies=Minivans" },
    { label: "Hatchbacks", path: "/explore?typebodies=Hatchbacks" },
    { label: "Convertibles", path: "/explore?typebodies=Convertibles" },
    { label: "Station wagons", path: "/explore?typebodies=Station%20Wagons" },
  ],
  otherVehicles: [
    { label: "Bus", path: "/category/Bus" },
    { label: "Truck", path: "/category/Truck" },
   
  ],
};

const SELLING_MENU = {
  sell: [
    { label: "Sell My Car", path: "/sell" },
    { label: "My Listings", path: "/listings" },
  ],
  otherVehicles: BUYING_MENU.otherVehicles,
};

const MORE_NAV_ITEMS = [
  { label: "About", path: "/about", icon: "book.fill" },
  { label: "Services", path: "/services", icon: "bolt.fill" },
  { label: "Contact", path: "/contact", icon: "envelope.fill" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "https://flagcdn.com/w40/gb.png" },
  { code: "fr", name: "Français", flag: "https://flagcdn.com/w40/fr.png" },
];

export function WebHeader() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showBuyingDropdown, setShowBuyingDropdown] = useState(false);
  const [showSellingDropdown, setShowSellingDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const { t, i18n } = useTranslation();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const buyingWrapperRef = useRef<any>(null);
  const sellingWrapperRef = useRef<any>(null);
  const moreWrapperRef = useRef<any>(null);
  const langWrapperRef = useRef<any>(null);

  // Responsive breakpoints
  const isMobileWeb = isWeb && width < 768;
  const isCompactWeb = isWeb && width >= 768 && width < 1200; // Tablet/small desktop - hamburger menu
  const isDesktopWeb = isWeb && width >= 1200; // Full desktop - show all nav
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || pathname === "/(tabs)";
    return pathname.includes(path.replace("/", ""));
  };

  const activeIconStyle = [
    styles.activeIconNavItem,
    { borderColor: `${colors.primary}30` },
  ];

  const handleNav = (path: string) => {
    router.push(path as any);
    setMobileMenuOpen(false);
  };

  // Fetch unread counts when user is logged in
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      return;
    }

    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const [messagesRes, notificationsRes] = await Promise.all([
          fetchUnreadMessagesCount(),
          fetchUnreadNotificationsCount(),
        ]);

        if (!cancelled) {
          setUnreadMessagesCount(messagesRes.data?.unreadCount || 0);
          setUnreadNotificationsCount(notificationsRes.data?.unreadCount || 0);
        }
      } catch (err) {
        console.error("Error fetching unread counts:", err);
      }
    };

    fetchCounts();
    // Poll every 30 seconds
    const intervalId = setInterval(fetchCounts, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!isWeb || !isDesktopWeb) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!(showBuyingDropdown || showSellingDropdown || showMoreDropdown || showLangDropdown)) {
        return;
      }

      const target = event.target as Node | null;
      if (!target) return;

      const wrappers = [
        buyingWrapperRef.current,
        sellingWrapperRef.current,
        moreWrapperRef.current,
        langWrapperRef.current,
      ].filter(Boolean);

      const clickedInside = wrappers.some((node: any) => {
        try {
          return node && typeof node.contains === "function" && node.contains(target);
        } catch {
          return false;
        }
      });

      if (!clickedInside) {
        setShowBuyingDropdown(false);
        setShowSellingDropdown(false);
        setShowMoreDropdown(false);
        setShowLangDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isDesktopWeb, showBuyingDropdown, showSellingDropdown, showMoreDropdown, showLangDropdown]);

  // Mobile Web View - Hamburger Menu
  if (isMobileWeb) {
    return (
      <>
        {/* Top Header with Menu Button */}
        <View
          style={[
            styles.mobileHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Logo/Brand */}
          <TouchableOpacity onPress={() => handleNav("/")}>
            <View style={styles.brandMark}>
              <Image source={LOGO_IMAGE} style={styles.brandLogo} contentFit="contain" />
              <ThemedText type="defaultSemiBold" style={[styles.brandText, { color: colors.primary }]}>
                Inzira
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* Right side - Search & Menu Button */}
          <View style={styles.mobileRightNav}>
            <WebLink href="/search" style={styles.mobileIconButton}>
              <IconSymbol
                name="magnifyingglass"
                size={24}
                color={colors.text}
              />
            </WebLink>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMobileMenuOpen(true)}
            >
              <IconSymbol name="list" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Screen Mobile Menu Modal */}
        <Modal
          visible={mobileMenuOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <View
              style={[
                styles.mobileMenu,
                { backgroundColor: colors.background },
              ]}
            >
              {/* Menu Header */}
              <View
                style={[
                  styles.menuHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
                  Menu
                </ThemedText>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={28}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.menuContent}>
                {/* Expandable Buying Section */}
                <View style={styles.menuSection}>
                  <TouchableOpacity
                    style={[styles.menuItem, { justifyContent: 'space-between' }]}
                    onPress={() => setShowBuyingDropdown((prev) => !prev)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <IconSymbol name="magnifyingglass" size={22} color={showBuyingDropdown ? colors.primary : colors.icon} />
                      <ThemedText style={[styles.menuItemText, { color: showBuyingDropdown ? colors.primary : colors.text }]}>
                        Buy a Car
                      </ThemedText>
                    </View>
                    <IconSymbol name={showBuyingDropdown ? "chevron.down" : "chevron.right"} size={18} color={colors.icon} />
                  </TouchableOpacity>
                  {showBuyingDropdown && (
                    <View style={{ paddingLeft: 38, gap: 2 }}>
                      {BUYING_MENU.cars.map((item) => (
                        <MobileWebLink key={item.label} href={item.path} onNavigate={() => setMobileMenuOpen(false)} style={styles.menuSubItem}>
                          <ThemedText style={[styles.menuSubItemText, { color: colors.text }]}>{item.label}</ThemedText>
                        </MobileWebLink>
                      ))}
                      <ThemedText style={[styles.menuSubHeader, { color: colors.icon }]}>By Body Type</ThemedText>
                      {BUYING_MENU.bodyType.map((item) => (
                        <MobileWebLink key={item.label} href={item.path} onNavigate={() => setMobileMenuOpen(false)} style={styles.menuSubItem}>
                          <ThemedText style={[styles.menuSubItemText, { color: colors.text }]}>{item.label}</ThemedText>
                        </MobileWebLink>
                      ))}
                    </View>
                  )}

                  {/* Expandable Selling Section */}
                  <TouchableOpacity
                    style={[styles.menuItem, { justifyContent: 'space-between' }]}
                    onPress={() => setShowSellingDropdown((prev) => !prev)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <IconSymbol name="plus.circle.fill" size={22} color={showSellingDropdown ? colors.primary : colors.icon} />
                      <ThemedText style={[styles.menuItemText, { color: showSellingDropdown ? colors.primary : colors.text }]}>
                        Selling
                      </ThemedText>
                    </View>
                    <IconSymbol name={showSellingDropdown ? "chevron.down" : "chevron.right"} size={18} color={colors.icon} />
                  </TouchableOpacity>
                  {showSellingDropdown && (
                    <View style={{ paddingLeft: 38, gap: 2 }}>
                      {SELLING_MENU.sell.map((item) => (
                        <MobileWebLink key={item.label} href={item.path} onNavigate={() => setMobileMenuOpen(false)} style={styles.menuSubItem}>
                          <ThemedText style={[styles.menuSubItemText, { color: colors.text }]}>{item.label}</ThemedText>
                        </MobileWebLink>
                      ))}
                    </View>
                  )}

                  <MobileWebLink href="/brands" onNavigate={() => setMobileMenuOpen(false)}
                    style={[styles.menuItem, isActive("/brands") && { backgroundColor: `${colors.primary}15` }]}>
                    <IconSymbol name="car.fill" size={22} color={isActive("/brands") ? colors.primary : colors.icon} />
                    <ThemedText style={[styles.menuItemText, { color: isActive("/brands") ? colors.primary : colors.text }]}>Brands</ThemedText>
                  </MobileWebLink>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.menuSection}>
                  {MORE_NAV_ITEMS.map((item) => (
                    <MobileWebLink
                      key={item.path}
                      href={item.path}
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive(item.path) && { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <IconSymbol name={item.icon as any} size={22} color={isActive(item.path) ? colors.primary : colors.icon} />
                      <ThemedText style={[styles.menuItemText, { color: isActive(item.path) ? colors.primary : colors.text }]}>
                        {item.label}
                      </ThemedText>
                    </MobileWebLink>
                  ))}
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                {/* User Menu Items - Only when logged in */}
                {user && (
                  <View style={styles.menuSection}>
                    <MobileWebLink
                      href="/notifications"
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive("/notifications") && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="bell.fill"
                        size={22}
                        color={isActive("/notifications") ? colors.primary : colors.icon}
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive("/notifications") ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        Notifications
                      </ThemedText>
                      {unreadNotificationsCount > 0 && (
                        <View style={[styles.menuBadge, { backgroundColor: colors.primary }]}>
                          <ThemedText style={styles.menuBadgeText}>
                            {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                          </ThemedText>
                        </View>
                      )}
                    </MobileWebLink>

                    <MobileWebLink
                      href="/messages"
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive("/messages") && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="message.fill"
                        size={22}
                        color={isActive("/messages") ? colors.primary : colors.icon}
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive("/messages") ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        Messages
                      </ThemedText>
                      {unreadMessagesCount > 0 && (
                        <View style={[styles.menuBadge, { backgroundColor: colors.primary }]}>
                          <ThemedText style={styles.menuBadgeText}>
                            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                          </ThemedText>
                        </View>
                      )}
                    </MobileWebLink>

                    <MobileWebLink
                      href="/favorites"
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive("/favorites") && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="heart.fill"
                        size={22}
                        color={isActive("/favorites") ? colors.primary : colors.icon}
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive("/favorites") ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        Favorites
                      </ThemedText>
                    </MobileWebLink>

                    <MobileWebLink
                      href="/profile"
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive("/profile") && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="person.fill"
                        size={22}
                        color={isActive("/profile") ? colors.primary : colors.icon}
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive("/profile") ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        My Profile
                      </ThemedText>
                    </MobileWebLink>
                  </View>
                )}

                {!user && (
                  <View style={styles.menuSection}>
                    <MobileWebLink
                      href="/profile"
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive("/profile") && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="person.fill"
                        size={22}
                        color={isActive("/profile") ? colors.primary : colors.icon}
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive("/profile") ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        Sign In / Profile
                      </ThemedText>
                    </MobileWebLink>
                  </View>
                )}

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                {/* Sell Button */}
                <MobileWebLink
                  href="/sell"
                  onNavigate={() => setMobileMenuOpen(false)}
                  style={[
                    styles.sellMenuButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
                  <ThemedText style={styles.sellMenuButtonText}>
                    Sell My Car
                  </ThemedText>
                </MobileWebLink>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Compact Web View (Tablet/Small Desktop) - Hamburger Menu
  if (isCompactWeb) {
    return (
      <>
        <View
          style={[
            styles.compactHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              paddingHorizontal: 24,
            },
          ]}
        >
          {/* Left: Hamburger Menu */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMobileMenuOpen(true)}
          >
            <IconSymbol name="list" size={28} color={colors.text} />
          </TouchableOpacity>

          {/* Center: Logo */}
          <TouchableOpacity
            onPress={() => handleNav("/")}
            style={styles.compactLogoSection}
          >
            <View style={styles.brandMark}>
              <Image source={LOGO_IMAGE} style={styles.brandLogo} contentFit="contain" />
              <ThemedText type="defaultSemiBold" style={[styles.brandText, { color: colors.primary }]}>
                Inzira
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* Right: Icons */}
          <View style={styles.compactRightNav}>
            <WebLink
              href="/search"
              style={[
                styles.iconNavItem,
                isActive("/search") && activeIconStyle,
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={22}
                color={isActive("/search") ? colors.primary : colors.icon}
              />
            </WebLink>

            <WebLink
              href="/profile"
              style={[
                styles.iconNavItem,
                isActive("/profile") && activeIconStyle,
              ]}
            >
              <IconSymbol
                name="person.fill"
                size={22}
                color={isActive("/profile") ? colors.primary : colors.icon}
              />
            </WebLink>

            {/* Sell Button */}
            <WebLink
              href="/sell"
              style={[
                styles.compactSellButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <IconSymbol name="plus.circle.fill" size={16} color="#fff" />
            </WebLink>
          </View>
        </View>

        {/* Mobile Menu Modal (same as mobile) */}
        <Modal
          visible={mobileMenuOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <View
              style={[
                styles.mobileMenu,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.menuHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
                  Menu
                </ThemedText>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={28}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.menuContent}>
                <View style={styles.menuSection}>
                  {CENTER_NAV_ITEMS.map((item) => (
                    <MobileWebLink
                      key={item.path}
                      href={item.path}
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive(item.path) && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={item.icon as any}
                        size={22}
                        color={
                          isActive(item.path) ? colors.primary : colors.icon
                        }
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive(item.path)
                              ? colors.primary
                              : colors.text,
                          },
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </MobileWebLink>
                  ))}
                </View>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <View style={styles.menuSection}>
                  {MORE_NAV_ITEMS.map((item) => (
                    <MobileWebLink
                      key={item.path}
                      href={item.path}
                      onNavigate={() => setMobileMenuOpen(false)}
                      style={[
                        styles.menuItem,
                        isActive(item.path) && {
                          backgroundColor: `${colors.primary}15`,
                        },
                      ]}
                    >
                      <IconSymbol
                        name={item.icon as any}
                        size={22}
                        color={
                          isActive(item.path) ? colors.primary : colors.icon
                        }
                      />
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color: isActive(item.path)
                              ? colors.primary
                              : colors.text,
                          },
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </MobileWebLink>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Desktop Web View - Full Header Navigation
  if (isDesktopWeb) {
    return (
      <View
        style={[
          styles.desktopHeader,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingHorizontal: is2Xl ? 200 : isXl ? 120 : isLg ? 80 : 40,
          },
        ]}
      >
        <View style={styles.leftGroup}>
          {/* Left Side: Logo */}
          <TouchableOpacity
            onPress={() => handleNav("/")}
            style={styles.logoSection}
          >
            <View style={styles.brandMark}>
              <Image source={LOGO_IMAGE} style={styles.brandLogo} contentFit="contain" />
              <ThemedText type="defaultSemiBold" style={[styles.brandText, { color: colors.primary }]}>
                Inzira
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* Left: Navigation Links */}
          <View style={styles.leftNav}>
            <View style={styles.dropdownNavWrapper} ref={buyingWrapperRef} collapsable={false}>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  showBuyingDropdown && [
                    styles.activeNavItem,
                    { borderColor: `${colors.primary}30` },
                  ],
                ]}
                onPress={() => {
                  setShowBuyingDropdown((prev) => !prev);
                  setShowSellingDropdown(false);
                  setShowMoreDropdown(false);
                  setShowLangDropdown(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.moreNavInner}>
                  <ThemedText
                    style={[
                      styles.navText,
                      { color: showBuyingDropdown ? colors.primary : colors.text },
                    ]}
                  >
                    Buying
                  </ThemedText>
                  <IconSymbol
                    name={showBuyingDropdown ? "chevron.up" : "chevron.down"}
                    size={12}
                    style={{ marginTop: 3 }}
                    color={showBuyingDropdown ? colors.primary : colors.icon}
                  />
                </View>
              </TouchableOpacity>

              {showBuyingDropdown && (
                <View
                  style={[
                    styles.megaDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  pointerEvents="auto"
                >
                  <View style={styles.megaColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Cars</ThemedText>
                    {BUYING_MENU.cars.map((item) => (
                      <WebLink
                        key={item.label}
                        href={item.path}
                        onNavigate={() => setShowBuyingDropdown(false)}
                        style={styles.megaItem}
                      >
                        <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                          {item.label}
                        </ThemedText>
                      </WebLink>
                    ))}
                  </View>

                  <View style={styles.megaColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Browse by body type</ThemedText>
                    {BUYING_MENU.bodyType.map((item) => (
                      <WebLink
                        key={item.label}
                        href={item.path}
                        onNavigate={() => setShowBuyingDropdown(false)}
                        style={styles.megaItem}
                      >
                        <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                          {item.label}
                        </ThemedText>
                      </WebLink>
                    ))}
                  </View>

                  <View style={styles.megaColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Other vehicles</ThemedText>
                    {BUYING_MENU.otherVehicles.map((item) => (
                      <WebLink
                        key={item.label}
                        href={item.path}
                        onNavigate={() => setShowBuyingDropdown(false)}
                        style={styles.megaItem}
                      >
                        <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                          {item.label}
                        </ThemedText>
                      </WebLink>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.dropdownNavWrapper} ref={sellingWrapperRef} collapsable={false}>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  showSellingDropdown && [
                    styles.activeNavItem,
                    { borderColor: `${colors.primary}30` },
                  ],
                ]}
                onPress={() => {
                  setShowSellingDropdown((prev) => !prev);
                  setShowBuyingDropdown(false);
                  setShowMoreDropdown(false);
                  setShowLangDropdown(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.moreNavInner}>
                  <ThemedText
                    style={[
                      styles.navText,
                      { color: showSellingDropdown ? colors.primary : colors.text },
                    ]}
                  >
                    Selling
                  </ThemedText>
                  <IconSymbol
                    name={showSellingDropdown ? "chevron.up" : "chevron.down"}
                    size={12}
                    style={{ marginTop: 3 }}
                    color={showSellingDropdown ? colors.primary : colors.icon}
                  />
                </View>
              </TouchableOpacity>

              {showSellingDropdown && (
                <View
                  style={[
                    styles.megaDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  pointerEvents="auto"
                >
                  <View style={styles.megaColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Sell</ThemedText>
                    {SELLING_MENU.sell.map((item) => {
                      const targetHref = !user && item.path !== "/sell" ? "/auth/login" : item.path;
                      return (
                        <WebLink
                          key={item.label}
                          href={targetHref}
                          onNavigate={() => setShowSellingDropdown(false)}
                          style={styles.megaItem}
                        >
                          <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                            {item.label}
                          </ThemedText>
                        </WebLink>
                      );
                    })}
                  </View>

                  <View style={styles.megaColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Other vehicles</ThemedText>
                    {SELLING_MENU.otherVehicles.map((item) => (
                      <WebLink
                        key={item.label}
                        href={item.path}
                        onNavigate={() => setShowSellingDropdown(false)}
                        style={styles.megaItem}
                      >
                        <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                          {item.label}
                        </ThemedText>
                      </WebLink>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <WebLink
              href="/brands"
              isActive={isActive("/brands")}
              style={[
                styles.navItem,
                isActive("/brands") && [
                  styles.activeNavItem,
                  { borderColor: `${colors.primary}30` },
                ],
              ]}
            >
              <ThemedText
                style={[
                  styles.navText,
                  { color: isActive("/brands") ? colors.primary : colors.text },
                ]}
              >
                Brands
              </ThemedText>
            </WebLink>

            <View style={styles.moreNavWrapper} ref={moreWrapperRef} collapsable={false}>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  showMoreDropdown && [
                    styles.activeNavItem,
                    { borderColor: `${colors.primary}30` },
                  ],
                ]}
                onPress={() => {
                  setShowMoreDropdown((prev) => !prev);
                  setShowBuyingDropdown(false);
                  setShowSellingDropdown(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.moreNavInner}>
                  <ThemedText
                    style={[
                      styles.navText,
                      { color: showMoreDropdown ? colors.primary : colors.text },
                    ]}
                  >
                    Company
                  </ThemedText>
                  <IconSymbol
                    name={showMoreDropdown ? "chevron.up" : "chevron.down"}
                    size={12}
                    style={{ marginTop: 3 }}
                    color={showMoreDropdown ? colors.primary : colors.icon}
                  />
                </View>
              </TouchableOpacity>

              {showMoreDropdown && (
                <View
                  style={[
                    styles.companyDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  {...(isWeb ? { onMouseLeave: () => setShowMoreDropdown(false) } as any : {})}
                >
                  <View style={styles.companyColumn}>
                    <ThemedText style={[styles.megaTitle, { color: colors.primary }]}>Company</ThemedText>
                    {MORE_NAV_ITEMS.map((item) => (
                      <WebLink
                        key={item.path}
                        href={item.path}
                        onNavigate={() => setShowMoreDropdown(false)}
                        style={styles.megaItem}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <IconSymbol
                            name={item.icon as any}
                            size={16}
                            color={colors.icon}
                          />
                          <ThemedText style={[styles.megaItemText, { color: colors.text }]}>
                            {item.label}
                          </ThemedText>
                        </View>
                      </WebLink>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Right Navigation */}
        <View style={styles.rightNav}>
          {user ? (
            <>
              <WebLink
                href="/notifications"
                style={[
                  styles.iconNavItem,
                  isActive("/notifications") && activeIconStyle,
                ]}
              >
                <IconSymbol
                  name="bell.fill"
                  size={22}
                  color={
                    isActive("/notifications") ? colors.primary : colors.icon
                  }
                />
                {unreadNotificationsCount > 0 && (
                  <View
                    style={[
                      styles.headerBadgeDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </WebLink>

              <WebLink
                href="/messages"
                style={[
                  styles.iconNavItem,
                  isActive("/messages") && activeIconStyle,
                ]}
              >
                <IconSymbol
                  name="message.fill"
                  size={22}
                  color={isActive("/messages") ? colors.primary : colors.icon}
                />
                {unreadMessagesCount > 0 && (
                  <View
                    style={[
                      styles.headerBadgeDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </WebLink>

              <WebLink
                href="/favorites"
                style={[
                  styles.iconNavItem,
                  isActive("/favorites") && activeIconStyle,
                ]}
              >
                <IconSymbol
                  name="heart.fill"
                  size={22}
                  color={isActive("/favorites") ? colors.primary : colors.icon}
                />
              </WebLink>

              <WebLink
                href="/profile"
                style={[
                  styles.iconNavItem,
                  isActive("/profile") && activeIconStyle,
                ]}
              >
                <IconSymbol
                  name="person.fill"
                  size={22}
                  color={isActive("/profile") ? colors.primary : colors.icon}
                />
              </WebLink>
            </>
          ) : (
            <>
              <WebLink
                href="/favorites"
                style={[
                  styles.iconNavItem,
                  isActive("/favorites") && activeIconStyle,
                ]}
              >
                <IconSymbol
                  name="heart.fill"
                  size={22}
                  color={isActive("/favorites") ? colors.primary : colors.icon}
                />
              </WebLink>

              <WebLink href="/auth/login" style={styles.loginLink}>
                <ThemedText style={[styles.loginText, { color: colors.text }]}>
                  Log in / Sign up
                </ThemedText>
              </WebLink>
            </>
          )}

          <View style={styles.langContainer}>
            <TouchableOpacity
              style={[styles.langButtonPill, { borderColor: colors.border }]}
              onPress={() => {
                setShowLangDropdown((prev) => !prev);
                setShowMoreDropdown(false);
                setShowBuyingDropdown(false);
                setShowSellingDropdown(false);
              }}
              activeOpacity={0.85}
            >
              <ThemedText style={[styles.langPillText, { color: colors.text }]}>
                {(i18n.language || "en").toUpperCase()}
              </ThemedText>
            </TouchableOpacity>

            {showLangDropdown && (
              <>
                <Pressable
                  style={styles.dropdownOverlay}
                  onPress={() => setShowLangDropdown(false)}
                />
                <View
                  style={[
                    styles.langDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.langDropdownArrow} />
                  <View style={styles.langDropdownContent}>
                    {LANGUAGES.map((lang) => (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.langOption,
                          i18n.language === lang.code && styles.langOptionActive,
                        ]}
                        onPress={() => {
                          i18n.changeLanguage(lang.code);
                          setShowLangDropdown(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: lang.flag }} style={{ width: 24, height: 16, borderRadius: 2 }} contentFit="cover" />
                        <View style={styles.langOptionInfo}>
                          <ThemedText style={styles.langOptionLabel}>{lang.name}</ThemedText>
                        </View>
                        {i18n.language === lang.code && (
                          <IconSymbol name="checkmark" size={14} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Sell My Car Button */}
          <WebLink
            href="/sell"
            style={[styles.sellButton, { backgroundColor: colors.primary }]}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
            <ThemedText style={styles.sellButtonText}>Sell My Car</ThemedText>
          </WebLink>
        </View>
      </View>
    );
  }

  // Native mobile - no header (uses bottom tabs)
  return null;
}

const styles = StyleSheet.create({
  // Link hover style
  linkHovered: {
  },
  moreNavWrapper: {
    position: "relative",
    zIndex: 99999,
  },
  moreNavInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moreDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 18,
  },
  moreDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  // Compact Header Styles
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 64,
  },
  compactLogoSection: {
    position: "absolute",
    left: "50%",
    marginLeft: -40,
  },
  compactRightNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactSellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  // Desktop Header Styles
  desktopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 76,
    position: "relative",
    zIndex: 1000,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoSection: {
    marginRight: 40,
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  leftNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-start",
  },
  dropdownNavWrapper: {
    position: "relative",
    zIndex: 99999,
  },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    position: "relative",
  },
  activeNavItem: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
  },
  navText: {
    fontSize: 15,
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -12,
    left: "50%",
    marginLeft: -12,
    width: 24,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  rightNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
    zIndex: 99999,
  },
  loginLink: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconNavItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  activeIconNavItem: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
  },
  headerBadgeDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sellButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginLeft: 8,
  },
  sellButtonText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rectDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 18,
    zIndex: 100001,
  },
  megaDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 28,
    minWidth: 860,
    flexDirection: "row",
    gap: 40,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
    zIndex: 100001,
  },
  companyDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: 170,
    flexDirection: "column",
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 12,
  },
  companyColumn: {
    width: "100%",
  },
  megaColumn: {
    flex: 1,
    minWidth: 220,
  },
  megaTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    paddingBottom: 0,
    paddingHorizontal: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  megaItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  megaItemText: {
    fontSize: 14.5,
    fontWeight: "500",
  },
  langContainer: {
    position: "relative",
    marginLeft: 12,
    zIndex: 99999,
  },
  langButtonPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  langButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  langFlag: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  langText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  langDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 99999,
  },
  langDropdownArrow: {
    position: "absolute",
    top: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderStyle: "solid",
    zIndex: 99999,
  },
  langDropdownContent: {
    gap: 2,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  langOptionActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  langOptionFlag: {
    width: 28,
    height: 20,
    borderRadius: 3,
  },
  langOptionInfo: {
    flex: 1,
    flexDirection: "column",
  },
  langOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  langOptionName: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  dropdownOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
  },

  // Mobile Web Header Styles
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 56,
  },
  menuButton: {
    padding: 8,
  },
  mobileRightNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mobileIconButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Mobile Menu Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  mobileMenu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuTitle: {
    fontSize: 18,
  },
  menuContent: {
    padding: 16,
  },
  menuSection: {
    gap: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  sellMenuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  sellMenuButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  menuBadge: {
    marginLeft: "auto",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  menuSubItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuSubItemText: {
    fontSize: 15,
    fontWeight: "400",
  },
  menuSubHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
});
