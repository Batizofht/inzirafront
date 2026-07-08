import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: '1. What Are Cookies', body: 'Cookies are small text files stored on your device when you visit a website. They help us remember your preferences, keep you logged in, and understand how you use the platform.' },
  { title: '2. Cookies We Use', body: 'Essential cookies: Required for authentication, session management, and security. These cannot be disabled.\n\nPreference cookies: Store your language, currency, and theme preferences.\n\nAnalytics cookies: Help us understand usage patterns to improve the platform. These are anonymized.' },
  { title: '3. Third-Party Cookies', body: 'We do not use third-party advertising cookies. Our analytics are first-party only. Payment processing (MTN MoMo) may set their own cookies during transactions.' },
  { title: '4. Managing Cookies', body: 'You can clear cookies through your browser settings at any time. Disabling essential cookies may prevent you from using certain features like staying logged in.' },
  { title: '5. Updates', body: 'We may update this Cookie Policy as our platform evolves. Check back periodically for changes.' },
  { title: '6. Contact', body: 'Questions about cookies? Email privacy@inzira.co.' },
];

export default function CookiesScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Cookie Policy | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Cookie Policy</ThemedText>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>Last updated: May 2025</ThemedText>
          {SECTIONS.map((s, i) => (
            <View key={i} style={styles.section}>
              <ThemedText style={styles.heading}>{s.title}</ThemedText>
              <ThemedText style={[styles.body, { color: colors.icon }]}>{s.body}</ThemedText>
            </View>
          ))}
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll: {},
  content: { padding: 24, paddingBottom: 40, width: '100%' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 28 },
  section: { marginBottom: 22 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 22 },
});
