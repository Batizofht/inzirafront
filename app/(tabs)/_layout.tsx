import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { isWeb } from '@/lib/platform';

export default function TabLayout() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();

  return (
    <Tabs
      // On web the bottom tabs are hidden (the WebHeader handles navigation);
      // on native we render our own professional tab bar.
      tabBar={isWeb ? () => null : (props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: isWeb ? { display: 'none' } : undefined,
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.buy') }} />
      <Tabs.Screen name="sell" options={{ title: t('tabs.sell') }} />
      <Tabs.Screen name="favorites" options={{ title: t('tabs.favorites') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
