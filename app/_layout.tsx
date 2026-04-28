import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { useSyncExternalStore, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SystemUI from 'expo-system-ui';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { getThemeModePreference, subscribeThemePreference, loadThemePreference } from '@/lib/themePreference';
import { isWeb } from '@/lib/platform';
import { Colors } from '@/constants/theme';
import { WebHeader } from '@/components/web-header';
import { WebFooter } from '@/components/web-footer';
import { initCrashReporting } from '@/lib/crash-reporting';
import '../i18n'; // Initialize i18n
import './globals.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <WebHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {children}
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...FontAwesome.font,
    ...MaterialIcons.font,
  });
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const colorScheme = useColorScheme();
  
  useEffect(() => {
    loadThemePreference().then(() => setIsThemeLoaded(true));
  }, []);

  useEffect(() => {
    initCrashReporting();
  }, []);

  const selectedThemeMode = useSyncExternalStore(subscribeThemePreference, getThemeModePreference, getThemeModePreference);
  const resolvedTheme = selectedThemeMode === 'system' ? (colorScheme ?? 'light') : selectedThemeMode;

  useEffect(() => {
    if (Platform.OS === 'android') {
      const navBarColor = Colors[resolvedTheme].card;
      SystemUI.setBackgroundColorAsync(navBarColor);
    }
  }, [resolvedTheme]);

  if (!fontsLoaded || !isThemeLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  const stackContent = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vehicle/[id]" />
      <Stack.Screen name="vehicle/edit" />
      <Stack.Screen name="category/[slug]" />
      <Stack.Screen name="search/index" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="subscription/index" />
      <Stack.Screen name="history/index" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="listings/index" />
      <Stack.Screen name="settings/account" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="verify/phone" />
      <Stack.Screen name="verify/id" />
      <Stack.Screen name="verify/selfie" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/login-form" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="auth/verify-otp" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
    </Stack>
  );

  return (
    <AuthProvider>
      <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
        {isWeb ? (
          <WebLayout>{stackContent}</WebLayout>
        ) : (
          stackContent
        )}
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
