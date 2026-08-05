import { StyleSheet, ScrollView, View, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Heading } from '@/components/heading';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';

export default function PressScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Press | Inzira'; }, []);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <Heading level={1} style={styles.title}>{t('legal.press.title')}</Heading>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>{t('legal.press.subtitle')}</ThemedText>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={[styles.date, { color: colors.icon }]}>{t('legal.press.date')}</ThemedText>
            <ThemedText style={styles.cardTitle}>{t('legal.press.cardTitle')}</ThemedText>
            <ThemedText style={[styles.cardBody, { color: colors.icon }]}>
              {t('legal.press.cardBody')}
            </ThemedText>
          </View>

          <ThemedText style={[styles.contactNote, { color: colors.icon }]}>
            {t('legal.press.contactNote')}
          </ThemedText>
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
