import { useEffect, useState } from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { isWeb } from "@/lib/platform";
import { useTranslation } from "react-i18next";

const STORAGE_PREFIX = "@onboarding_hint_";

const canUseLocalStorage = () => isWeb && typeof window !== "undefined";

// Fixed brand blue — deliberately NOT theme-aware. This bubble always
// renders the same solid blue card with white text/button in both light
// and dark mode, the way a product-tour tooltip stays on-brand regardless
// of the page around it.
const BLUE = "#2563EB";

interface OnboardingHintProps {
  /** Unique id for this hint — determines its dismissal storage key. */
  id: string;
  text: string;
  icon?: string;
  ctaLabel?: string;
  /** Whether the bubble floats below (arrow points up) or above (arrow points down) its anchor. */
  placement?: "top" | "bottom";
  /** Horizontal position of the bubble relative to its anchor container. */
  align?: "left" | "center" | "right";
  style?: any;
}

// Floating, non-modal onboarding "coachmark" — a small blue dialog bubble
// with a pointer arrow and a "Got it" dismiss button, the way Google
// products surface feature tips. It is NOT a full-width alert strip and
// NOT a blocking <Modal>: it overlays nearby content without dimming the
// page or trapping interaction. The anchor it's attached to must have
// `position: 'relative'` so this bubble (position: 'absolute') can float
// off one of its edges. Dismissal is remembered per-device so a closed
// hint doesn't keep resurfacing.
export function OnboardingHint({
  id,
  text,
  icon = "info.circle.fill",
  ctaLabel,
  placement = "bottom",
  align = "left",
  style,
}: OnboardingHintProps) {
  const { t } = useTranslation();
  const storageKey = `${STORAGE_PREFIX}${id}`;

  // Always starts hidden and resolves in an effect (never in the initial
  // render). Reading localStorage during the lazy useState initializer is
  // NOT safe here: on a server-rendered/static-exported first pass there is
  // no `window`, so that initializer would permanently lock `visible` to
  // false — React reuses the server-computed state on hydration instead of
  // re-running the initializer, and hydration effects then see the same
  // (already-resolved) storage check and skip. Resolving purely inside an
  // effect sidesteps that trap on every platform.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      try {
        const dismissed = canUseLocalStorage()
          ? localStorage.getItem(storageKey)
          : await AsyncStorage.getItem(storageKey);
        if (mounted && !dismissed) setVisible(true);
      } catch {
        if (mounted) setVisible(true);
      }
    };
    resolve();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    if (canUseLocalStorage()) {
      localStorage.setItem(storageKey, "1");
    } else {
      AsyncStorage.setItem(storageKey, "1").catch(() => {});
    }
  };

  const placementStyle =
    placement === "top"
      ? { bottom: "100%" as const, marginBottom: 12 }
      : { top: "100%" as const, marginTop: 12 };

  const alignStyle =
    align === "right"
      ? { right: 0 }
      : align === "center"
        ? { left: "50%" as const, marginLeft: -150 }
        : { left: 0 };

  const arrowHorizontal =
    align === "right"
      ? { right: 20 }
      : align === "center"
        ? { left: "50%" as const, marginLeft: -8 }
        : { left: 20 };

  return (
    <View
      style={[
        styles.bubble,
        placementStyle,
        alignStyle,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          placement === "top" ? styles.arrowDown : styles.arrowUp,
          arrowHorizontal,
          placement === "top" ? { borderTopColor: BLUE } : { borderBottomColor: BLUE },
        ]}
      />

      <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={8}>
        <IconSymbol name="xmark" size={13} color="#fff" />
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <IconSymbol name={icon as any} size={16} color="#fff" />
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleDismiss} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{ctaLabel || t("common.gotIt")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    zIndex: 999999,
    opacity: 1,
    minWidth: 250,
    maxWidth: 320,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
  arrowUp: {
    position: "absolute",
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  arrowDown: {
    position: "absolute",
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingRight: 14,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    marginTop: 3,
    color: "#fff",
  },
  cta: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  ctaText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "700",
  },
});
