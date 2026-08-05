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

export default function GuidelinesScreen() {
  useEffect(() => { if (typeof document !== 'undefined') document.title = 'Community Guidelines | Inzira'; }, []);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const maxW = isDesktopWeb ? 780 : undefined;
  const sections = t('legal.guidelines.sections', { returnObjects: true }) as { title: string; body: string }[];

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, isDesktopWeb && { maxWidth: maxW, alignSelf: 'center' }]}>
          <Heading level={1} style={styles.title}>{t('legal.guidelines.title')}</Heading>
          <ThemedText style={[styles.meta, { color: colors.icon }]}>{t('legal.guidelines.meta')}</ThemedText>
          {sections.map((s, i) => (
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
  safe: { flex: 1 },
  scroll: {},
  content: { padding: 24, paddingBottom: 40, width: '100%' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 28 },
  section: { marginBottom: 22 },
  heading: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 22 },
});
