import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PageHead } from '@/components/page-head';
import { ThemedText } from '@/components/themed-text';
import { Heading } from '@/components/heading';
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

  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const [monthly, setMonthly] = useState<TransparencyItem[]>([]);
  const steps = t('legal.verificationProcess.steps', { returnObjects: true }) as string[];
  const tierItems = t('legal.verificationProcess.tierItems', { returnObjects: true }) as string[];
  const revocationItems = t('legal.verificationProcess.revocationItems', { returnObjects: true }) as string[];

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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <PageHead
        title="Verification Process - Inzira Trust Marketplace"
        description="Understand how Inzira verifies sellers and listings: identity checks, ownership documents, phone confirmation, and review workflows."
        keywords="inzira verification process, verified seller rwanda, listing trust checks"
        url="https://inzira.co/verification-process"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading level={1} type="title">{t('legal.verificationProcess.title')}</Heading>
        {steps.map((step, i) => (
          <ThemedText key={i} style={styles.item}>{step}</ThemedText>
        ))}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">{t('legal.verificationProcess.tierTitle')}</ThemedText>
          {tierItems.map((item, i) => (
            <ThemedText key={i} style={styles.item}>{item}</ThemedText>
          ))}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">{t('legal.verificationProcess.revocationTitle')}</ThemedText>
          {revocationItems.map((item, i) => (
            <ThemedText key={i} style={styles.item}>{item}</ThemedText>
          ))}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <ThemedText type="defaultSemiBold">{t('legal.verificationProcess.statsTitle')}</ThemedText>
          {monthly.length === 0 ? (
            <ThemedText style={[styles.item, { color: colors.icon }]}>{t('legal.verificationProcess.statsEmpty')}</ThemedText>
          ) : (
            monthly.map((row) => (
              <View key={row.month} style={styles.statsRow}>
                <ThemedText style={[styles.monthLabel, { color: colors.text }]}>{row.label}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>{t('legal.verificationProcess.rejectedListings')}: {row.rejectedListings}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>{t('legal.verificationProcess.fraudBlocked')}: {row.fraudAttemptsBlocked}</ThemedText>
                <ThemedText style={[styles.metric, { color: colors.icon }]}>{t('legal.verificationProcess.avgVerificationTime')}: {row.avgVerificationHours}h</ThemedText>
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
