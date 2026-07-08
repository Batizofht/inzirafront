import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By accessing or using the Inzira platform (web and mobile app), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.' },
  { title: '2. Eligibility', body: 'You must be at least 18 years old and a resident of Rwanda or an authorized user to create an account. By registering, you confirm that you meet these requirements.' },
  { title: '3. Account Responsibilities', body: 'You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. Notify us immediately of unauthorized access.' },
  { title: '4. Vehicle Listings', body: 'Sellers must provide accurate and truthful information about listed vehicles. Inzira reserves the right to remove listings that are misleading, fraudulent, or violate platform guidelines.' },
  { title: '5. Payments & Subscriptions', body: 'Subscription fees and verification fees are collected via MTN MoMo. Payments are non-refundable unless otherwise stated. Subscriptions auto-expire at the end of the paid period.' },
  { title: '6. Prohibited Conduct', body: 'Users must not post stolen vehicles, engage in fraud, harass other users, spam the platform, or attempt to circumvent verification processes.' },
  { title: '7. Intellectual Property', body: 'All content, branding, and technology on Inzira is owned by Bonet Elite Services Ltd. Users retain ownership of their photos and descriptions but grant Inzira a license to display them on the platform.' },
  { title: '8. Limitation of Liability', body: 'Inzira facilitates connections between buyers and sellers but does not guarantee the condition of vehicles or the outcome of transactions. We are not liable for disputes between users.' },
  { title: '9. Termination', body: 'We may suspend or terminate accounts that violate these terms. Users may delete their accounts at any time through profile settings.' },
  { title: '10. Changes to Terms', body: 'We may update these terms periodically. Continued use after changes constitutes acceptance of the updated terms.' },
  { title: '11. Governing Law', body: 'These terms are governed by the laws of the Republic of Rwanda. Disputes shall be resolved in Kigali courts.' },
  { title: '12. Contact', body: 'For questions about these terms, contact us at legal@inzira.co or through the in-app support channel.' },
];

export default function TermsScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Terms of Service | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Terms of Service</ThemedText>
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
