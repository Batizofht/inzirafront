import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { PageHead } from '@/components/page-head';
import { ThemedText } from '@/components/themed-text';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';

export default function BuyerProtectionScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Buyer Protection | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <PageHead
        title="Buyer Protection - Safe Car Buying on Inzira"
        description="Learn how Inzira protects buyers with verified sellers, fraud reporting, and practical safety steps for vehicle transactions in Rwanda."
        keywords="buyer protection rwanda, safe car purchase, scam prevention"
        url="https://inzira.co/buyer-protection"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Buyer Protection</ThemedText>
        <ThemedText style={styles.item}>• Verify listing details and seller identity before transfer.</ThemedText>
        <ThemedText style={styles.item}>• Meet in secure public places and inspect vehicle condition.</ThemedText>
        <ThemedText style={styles.item}>• Report suspicious behavior instantly from listing pages.</ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  item: { fontSize: 14, lineHeight: 20 },
});
