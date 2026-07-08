import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

export default function PressScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Press | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Press</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>Latest news and announcements</ThemedText>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={[styles.date, { color: colors.icon }]}>May 2025</ThemedText>
            <ThemedText style={styles.cardTitle}>Introducing Inzira — The New Car Marketplace in Rwanda</ThemedText>
            <ThemedText style={[styles.cardBody, { color: colors.icon }]}>
              Bonet Elite Services Ltd is proud to announce the launch of Inzira, Rwanda's first fully verified digital vehicle marketplace. Inzira connects buyers and sellers through a secure platform with identity verification, real-time messaging, and mobile money payments via MTN MoMo. The platform supports cars, motorcycles, trucks, electric vehicles, and commercial vehicles — serving both individual sellers and dealerships across Rwanda.
            </ThemedText>
          </View>

          <ThemedText style={[styles.contactNote, { color: colors.icon }]}>
            For press inquiries, contact press@inzira.co
          </ThemedText>
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
  subtitle: { fontSize: 15, marginBottom: 28 },
  card: { padding: 24, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  date: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  contactNote: { fontSize: 13 },
});
