import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { useSyncExternalStore, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, Animated, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as SystemUI from 'expo-system-ui';
import { Image } from 'expo-image';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { AuthProvider } from '@/context/AuthContext';
import { getThemeModePreference, subscribeThemePreference, loadThemePreference } from '@/lib/themePreference';
import { isWeb } from '@/lib/platform';
import { Colors } from '@/constants/theme';
import { WebHeader } from '@/components/web-header';
import { WebFooter } from '@/components/web-footer';
import { CookieBanner } from '@/components/cookie-banner';
import { NotificationToastHost } from '@/components/NotificationToastHost';
import { initCrashReporting } from '@/lib/crash-reporting';
import '../i18n'; // Initialize i18n
import './globals.css';

const SPLASH_DURATION = 4000;
const SPLASH_LOGO = require('../assets/images/THELOG.png');

// The anchor keeps the tab bar as the stack base so hardware back always lands
// on a tab. Web has no hardware back, and the anchor makes every exported page
// embed the entire home screen underneath its own content — ~950 characters of
// identical boilerplate and a duplicate <h1> on all 29 indexable routes.
export const unstable_settings = isWeb ? {} : { anchor: '(tabs)' };

function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <WebHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {children}
      </ScrollView>
      <CookieBanner />
    </View>
  );
}

function MobileSplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        splashStyles.container,
        { opacity: fadeAnim },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Image
          source={SPLASH_LOGO}
          style={splashStyles.logo}
          contentFit="contain"
        />
        <Text style={splashStyles.title}>Welcome To Inzira</Text>
        <Text style={splashStyles.subtitle}>The Verified Car Marketplace</Text>
      </Animated.View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 24,
    borderRadius:10
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...FontAwesome.font,
    ...MaterialIcons.font,
  });
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(!isWeb);  // splash shows immediately
  const colorScheme = useColorScheme();

  useEffect(() => {
    loadThemePreference().then(() => setIsThemeLoaded(true));
  }, []);

  useEffect(() => {
    initCrashReporting();
  }, []);

  // Lift the boot overlay painted by app/+html.tsx. `width` is 0 through the
  // static export and the first client render, so a real width is the signal
  // that hydration has committed and the desktop layout has finally replaced
  // the mobile markup baked into the HTML. Fading only then means the visitor
  // never sees the phone layout stretched across a monitor.
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (!isWeb || width === 0) return;
    const el = document.getElementById('inzira-boot');
    if (!el) return;
    // Give the swapped-in layout one frame to paint underneath before fading.
    const raf = requestAnimationFrame(() => {
      el.classList.add('is-ready');
      setTimeout(() => el.remove(), 300);
    });
    return () => cancelAnimationFrame(raf);
  }, [width]);

  const selectedThemeMode = useSyncExternalStore(subscribeThemePreference, getThemeModePreference, getThemeModePreference);
  const resolvedTheme = selectedThemeMode === 'system' ? (colorScheme ?? 'light') : selectedThemeMode;

  useEffect(() => {
    if (Platform.OS === 'android') {
      const navBarColor = Colors[resolvedTheme].card;
      SystemUI.setBackgroundColorAsync(navBarColor);
    }
  }, [resolvedTheme]);

  // ✅ Don't block the whole tree — let splash cover the loading state
  // On web this must never gate: the static export renders this tree in Node,
  // where fonts never load and effects never run, so gating here would emit a
  // spinner-only shell as the HTML for every route — nothing for crawlers to index.
  const isReady = isWeb || (fontsLoaded && isThemeLoaded);

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
      <Stack.Screen name="auth/forgot-password" />
      <Stack.Screen name="auth/verify-otp" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
    </Stack>
  );

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
          {isWeb ? (
            <WebLayout>
              {isReady ? stackContent : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#2563EB" size="large" />
                </View>
              )}
            </WebLayout>
          ) : (
            <>
              {isReady ? stackContent : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#2563EB" size="large" />
                </View>
              )}
              {showSplash && (
                <MobileSplashScreen onFinish={() => setShowSplash(false)} />
              )}
            </>
          )}
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
          <NotificationToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
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
