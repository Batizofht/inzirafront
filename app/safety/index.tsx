import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: 'Verified Sellers', body: 'All sellers on Inzira go through a multi-step verification process including phone verification, national ID upload, and selfie matching. Look for the "Verified Seller" badge.' },
  { title: 'Meeting Safely', body: '• Always meet in a public, well-lit location\n• Bring a friend or family member\n• Never share your MoMo PIN or OTP with anyone\n• Inspect the vehicle thoroughly before payment\n• Request to see original vehicle documents' },
  { title: 'Payment Safety', body: 'Use MTN MoMo through the platform for subscription payments. For vehicle purchases, verify documents before transferring large amounts. Never pay in advance without seeing the vehicle.' },
  { title: 'Recognizing Scams', body: '• Prices too good to be true\n• Seller refuses to meet in person\n• Requests for advance payment before viewing\n• Pressure to decide immediately\n• Fake documents or mismatched vehicle details' },
  { title: 'Reporting Issues', body: 'If you encounter suspicious activity, use the "Report" button on any listing or user profile. Our team reviews all reports within 24 hours. You can also email safety@inzira.co.' },
  { title: 'Data Protection', body: 'Your personal information is encrypted and never shared without consent. Phone numbers are only revealed after both parties agree to connect.' },
];

export default function SafetyScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Safety Center | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Safety Center</ThemedText>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>Your safety is our priority</ThemedText>
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
