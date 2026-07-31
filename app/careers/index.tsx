import { StyleSheet, ScrollView, View, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

// ─── ADD JOBS HERE ────────────────────────────────────────────────────────────
// Just add objects to this array when you have open positions.
// Leave empty = "No open positions" message shows.
const OPEN_JOBS: { title: string; type: string; location: string }[] = [
  // Example:
  // { title: 'Frontend Developer', type: 'Full-time', location: 'Kigali, Rwanda' },
  // { title: 'Marketing Manager', type: 'Part-time', location: 'Remote' },
];

export default function CareersScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Careers | Inzira'; }, []);
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <ThemedText style={styles.title}>{t('legal.careers.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('legal.careers.subtitle')}
          </ThemedText>

          {OPEN_JOBS.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="person.2.fill" size={32} color={colors.icon} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>{t('legal.careers.emptyTitle')}</ThemedText>
              <ThemedText style={[styles.emptyDesc, { color: colors.icon }]}>
                {t('legal.careers.emptyDesc')}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {OPEN_JOBS.map((job, i) => (
                <View key={i} style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ThemedText style={styles.jobTitle}>{job.title}</ThemedText>
                  <View style={styles.jobMeta}>
                    <ThemedText style={[styles.jobTag, { color: colors.icon }]}>{job.type}</ThemedText>
                    <ThemedText style={[styles.jobTag, { color: colors.icon }]}>• {job.location}</ThemedText>
                  </View>
                </View>
              ))}
              <ThemedText style={[styles.applyNote, { color: colors.icon }]}>
                {t('legal.careers.applyNote')}
              </ThemedText>
            </View>
          )}
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
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  jobsList: { gap: 12 },
  jobCard: { padding: 18, borderRadius: 12, borderWidth: 1 },
  jobTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  jobMeta: { flexDirection: 'row', gap: 8 },
  jobTag: { fontSize: 13 },
  applyNote: { fontSize: 13, marginTop: 16 },
});
