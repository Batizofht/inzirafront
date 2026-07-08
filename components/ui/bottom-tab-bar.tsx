import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

/**
 * Per-route icon config. We use a filled icon when active and an outline-ish
 * variant when inactive so the bar reads like a real native app, not the
 * default tab template. The center "Sell" route is rendered as a raised pill.
 */
const TAB_ICONS: Record<string, { active: string; inactive: string; center?: boolean }> = {
  index: { active: 'house.fill', inactive: 'house.fill' },
  explore: { active: 'magnifyingglass', inactive: 'magnifyingglass' },
  sell: { active: 'plus.circle.fill', inactive: 'plus.circle.fill', center: true },
  favorites: { active: 'heart.fill', inactive: 'heart.fill' },
  profile: { active: 'person.fill', inactive: 'person.fill' },
};

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const focused = state.index === index;
        const cfg = TAB_ICONS[route.name] ?? { active: 'house.fill', inactive: 'house.fill' };

        const onPress = () => {
          if (Platform.OS === 'ios' || Platform.OS === 'android') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        // Center "Sell" action — a raised brand pill that anchors the bar.
        if (cfg.center) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityLabel={String(label)}
            >
              <View style={[styles.centerButton, { backgroundColor: colors.primary }]}>
                <IconSymbol name={cfg.active} size={28} color="#FFFFFF" />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.centerLabel, { color: focused ? colors.primary : colors.tabIconDefault }]}
              >
                {String(label)}
              </Text>
            </Pressable>
          );
        }

        const tint = focused ? colors.primary : colors.tabIconDefault;
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={String(label)}
          >
            <View style={styles.iconWrap}>
              <IconSymbol name={focused ? cfg.active : cfg.inactive} size={24} color={tint} />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: tint, fontWeight: focused ? '700' : '500' }]}>
              {String(label)}
            </Text>
            {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
  },
  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    // a restrained lift so the action reads as primary without a heavy shadow
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
