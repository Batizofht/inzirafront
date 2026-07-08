import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: 'Be Honest', body: 'Provide accurate information about vehicles. Do not misrepresent condition, mileage, ownership status, or history. Honest listings build trust and lead to faster sales.' },
  { title: 'Be Respectful', body: 'Treat all users with respect in messages and negotiations. Harassment, hate speech, threats, or discriminatory language will result in immediate account suspension.' },
  { title: 'No Fraud or Scams', body: 'Do not post stolen vehicles, use fake identities, or attempt to deceive other users. Fraudulent activity is reported to authorities.' },
  { title: 'One Account Per Person', body: 'Each user should maintain only one account. Creating multiple accounts to circumvent bans or manipulate the platform is prohibited.' },
  { title: 'Quality Listings', body: '• Use real photos of the actual vehicle (no stock images)\n• Include accurate specs and pricing\n• Remove sold vehicles promptly\n• Do not spam duplicate listings' },
  { title: 'No External Transactions', body: 'Keep communication and deals on the Inzira platform. This protects both parties and allows us to help resolve disputes.' },
  { title: 'Respect Privacy', body: 'Do not share other users\' personal information (phone numbers, addresses) outside the platform without their consent.' },
  { title: 'Enforcement', body: 'Violations may result in listing removal, account suspension, or permanent ban. Serious offenses are reported to law enforcement.' },
];

export default function GuidelinesScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Community Guidelines | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Community Guidelines</ThemedText>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>Rules for a trusted marketplace</ThemedText>
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
