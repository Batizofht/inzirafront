import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Elevation } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

export type ToastProps = {
  visible: boolean;
  title: string;
  body?: string;
  /** SF-symbol name passed to IconSymbol. */
  icon?: string;
  iconColor?: string;
  /** Auto-dismiss after this many ms (default 4000). */
  durationMs?: number;
  onHide: () => void;
  onPress?: () => void;
};

/**
 * Lightweight top-of-screen toast/snackbar. Auto-dismisses and animates in/out.
 * Presentational only — callers control `visible` and clear it via `onHide`.
 */
export function Toast({
  visible,
  title,
  body,
  icon = 'bell.fill',
  iconColor = '#F59E0B',
  durationMs = 4000,
  onHide,
  onPress,
}: ToastProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => onHide());
      }, durationMs);
    }

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, durationMs, onHide, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        style={[styles.card, { backgroundColor: isDark ? '#0F172A' : '#111827' }]}
      >
        <IconSymbol name={icon as any} size={20} color={iconColor} />
        <View style={styles.textWrap}>
          <ThemedText style={styles.title} numberOfLines={1}>{title}</ThemedText>
          {!!body && <ThemedText style={styles.body} numberOfLines={2}>{body}</ThemedText>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 14 : 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Elevation.raised,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
});
