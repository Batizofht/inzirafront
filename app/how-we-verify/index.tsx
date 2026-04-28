import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { PageHead } from '@/components/page-head';
import { ThemedText } from '@/components/themed-text';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';

export default function HowWeVerifyScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'How We Verify | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <PageHead
        title="How We Verify Sellers - Inzira"
        description="See how Inzira validates seller identity, listing legitimacy, and platform trust signals before buyers engage."
        keywords="how inzira verifies, verified seller, trust marketplace"
        url="https://inzira.co/how-we-verify"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">How We Verify</ThemedText>
        <ThemedText style={styles.item}>Identity documents are reviewed by our admin team.</ThemedText>
        <ThemedText style={styles.item}>Phone and profile checks are tied to active seller accounts.</ThemedText>
        <ThemedText style={styles.item}>Rejected verification requests include notes for resubmission.</ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  item: { fontSize: 14, lineHeight: 20 },
});
