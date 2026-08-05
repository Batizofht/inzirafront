import { StyleSheet, View, TouchableOpacity, Platform, StatusBar } from "react-native";
import { router } from "expo-router";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { Colors } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { isWeb } from "@/lib/platform";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";

export default function NotFoundScreen() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Page Not Found | Inzira";
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: isDark ? "#1F2937" : "#EEF2FF" }]}>
        <IconSymbol name="car.rear.fill" size={52} color={colors.primary} />
      </View>

      {/* 404 label */}
      <ThemedText style={[styles.code, { color: colors.primary }]}>404</ThemedText>

      {/* Headline */}
      <ThemedText style={[styles.title, { color: colors.text }]}>
        This road leads nowhere
      </ThemedText>

      {/* Subtitle */}
      <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
        The page you're looking for doesn't exist or has been moved.
      </ThemedText>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="house.fill" size={16} color="#fff" />
          <ThemedText style={styles.btnPrimaryText}>Go Home</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => router.replace("/explore" as any)}
          activeOpacity={0.85}
        >
          <IconSymbol name="magnifyingglass" size={16} color={colors.primary} />
          <ThemedText style={[styles.btnSecondaryText, { color: colors.primary }]}>
            Browse Cars
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  code: {
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 80,
    letterSpacing: -2,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 36,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
