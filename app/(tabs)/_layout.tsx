import { Tabs } from 'expo-router';
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { isWeb } from '@/lib/platform';
import { ThemedText } from '@/components/themed-text';

export default function TabLayout() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 86 : 66 + insets.bottom;

  const renderTabIcon = (name: string, color: string, focused: boolean, size = 22) => (
    <View style={[styles.iconBadge, focused && { backgroundColor: `${colors.primary}1F` }]}>
      <IconSymbol size={size} name={name} color={color} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isWeb ? { display: 'none' } : {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          lineHeight: 14,
        },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t  ('tabs.home'),
          tabBarIcon: ({ color, focused }) => renderTabIcon('house.fill', color, focused),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, focused }) => renderTabIcon('magnifyingglass', color, focused),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t('tabs.sell'),
          tabBarIcon: ({ color, focused }) => renderTabIcon('plus.circle.fill', color, focused, 23),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, focused }) => renderTabIcon('heart.fill', color, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => renderTabIcon('person.fill', color, focused),
        }}
      />
      
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
