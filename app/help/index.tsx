import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

const SECTIONS = [
  { title: 'Getting Started', body: 'Create an account as a buyer or seller. Buyers can browse, save favorites, and contact sellers. Sellers can list vehicles after completing verification.' },
  { title: 'How to Buy', body: 'Browse listings using filters (brand, price, fuel type, location). Tap "Buy Now" or "Request Contact" on a vehicle page. You\'ll be connected with the seller via in-app messaging.' },
  { title: 'How to Sell', body: 'Go to "Sell" tab, complete seller verification (ID + selfie), then list your vehicle with photos, specs, and price. Buyers will contact you through the platform.' },
  { title: 'Payments', body: 'Subscriptions and verification fees are paid via MTN MoMo. You\'ll receive a prompt on your phone to approve the payment. No card details are stored.' },
  { title: 'Messaging', body: 'Once a buyer places an order or a seller subscribes, both parties can chat in real-time through the Messages section.' },
  { title: 'Account Issues', body: 'Forgot password? Use "Forgot Password" on the login screen. To delete your account, go to Profile > Preferences > Delete Account.' },
  { title: 'Contact Support', body: 'Email: support@inzira.co\nWhatsApp: +250 788 378 766\nOr use the in-app Contact page.' },
];

export default function HelpScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Help Center | Inzira'; }, []);
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>Help Center</ThemedText>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>Find answers to common questions</ThemedText>
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
