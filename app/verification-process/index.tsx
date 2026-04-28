import { ScrollView, StyleSheet, View } from 'react-native';
import { PageHead } from '@/components/page-head';
import { ThemedText } from '@/components/themed-text';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { apiRequest } from '@/lib/api-client';
import { useEffect, useState } from 'react';

type TransparencyItem = {
  month: string;
  label: string;
  rejectedListings: number;
  fraudAttemptsBlocked: number;
  avgVerificationHours: number;
};

export default function VerificationProcessScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Verification Process | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const [monthly, setMonthly] = useState<TransparencyItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await apiRequest<{ data?: { monthly?: TransparencyItem[] } }>('/vehicles/transparency-stats');
        if (mounted) setMonthly(response?.data?.monthly || []);
      } catch {
        if (mounted) setMonthly([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <PageHead
        title="Verification Process - Inzira Trust Marketplace"
        description="Understand how Inzira verifies sellers and listings: identity checks, ownership documents, phone confirmation, and review workflows."
        keywords="inzira verification process, verified seller rwanda, listing trust checks"
        url="https://inzira.co/verification-process"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">How Inzira Verification Works</ThemedText>
        <ThemedText style={styles.item}>1. Seller identity document verification</ThemedText>
        <ThemedText style={styles.item}>2. Phone verification and account linkage</ThemedText>
        <ThemedText style={styles.item}>3. Ownership and listing quality review</ThemedText>
        <ThemedText style={styles.item}>4. Admin approval, rejection, or resubmission</ThemedText>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">Seller Tier Criteria</ThemedText>
          <ThemedText style={styles.item}>• Verified: Phone verified + active verification request</ThemedText>
          <ThemedText style={styles.item}>• Trusted: Approved identity verification + profile location</ThemedText>
          <ThemedText style={styles.item}>• Dealer Pro: Trusted criteria + active seller subscription</ThemedText>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">Tier Revocation Rules</ThemedText>
          <ThemedText style={styles.item}>• Identity mismatch or forged documents</ThemedText>
          <ThemedText style={styles.item}>• Validated repeated scam reports</ThemedText>
          <ThemedText style={styles.item}>• Dealer Pro subscription expiry</ThemedText>
          <ThemedText style={styles.item}>• Policy or moderation violations</ThemedText>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">Monthly Transparency Stats</ThemedText>
          {monthly.length === 0 ? (
            <ThemedText style={[styles.item, { color: colors.icon }]}>Transparency metrics will appear here after data sync.</ThemedText>
          ) : (
            monthly.map((row) => (
              <View key={row.month} style={styles.statsRow}>
                <ThemedText style={[styles.monthLabel, { color: colors.text }]}>{row.label}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>Rejected listings: {row.rejectedListings}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>Fraud attempts blocked: {row.fraudAttemptsBlocked}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>Avg verification time: {row.avgVerificationHours}h</ThemedText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  item: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  statsRow: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D1D5DB' },
  monthLabel: { fontSize: 14, fontWeight: '700' },
  metric: { fontSize: 13, marginTop: 2 },
});
