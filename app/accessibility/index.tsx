import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: 'Our Commitment', body: 'Inzira is committed to making our vehicle marketplace accessible to everyone, including people with disabilities. We strive to meet WCAG 2.1 Level AA standards across our web and mobile platforms.' },
  { title: 'Accessible Features', body: '• Screen reader support for all core navigation and listing views\n• Keyboard navigation on web for all interactive elements\n• High contrast color system with dark mode support\n• Scalable text that respects system font size preferences\n• Descriptive alt text for vehicle images\n• Clear focus indicators on interactive elements' },
  { title: 'Mobile App', body: 'Our Expo-based app supports platform accessibility features including VoiceOver (iOS) and TalkBack (Android). Labels are provided for all buttons and interactive controls.' },
  { title: 'Known Limitations', body: 'Some third-party embedded content (payment flows, external maps) may not fully meet accessibility standards. We are actively working with partners to improve these experiences.' },
  { title: 'Feedback', body: 'If you encounter any accessibility barriers while using Inzira, please let us know. We take every report seriously and work to resolve issues promptly.\n\nEmail: accessibility@inzira.co\nPhone: +250 726 300 260' },
];

export default function AccessibilityScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Accessibility | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Accessibility</ThemedText>
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
