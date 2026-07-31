import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { AboutSEO } from '@/components/page-meta';

const VALUE_ICONS = ['checkmark.shield.fill', 'bolt.fill', 'hand.thumbsup.fill', 'lock.fill', 'creditcard.fill', 'chart.bar.fill'];

export default function AboutScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'About Us | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const stats = t('legal.about.stats', { returnObjects: true }) as { number: string; label: string }[];
  const values = t('legal.about.values', { returnObjects: true }) as { title: string; description: string }[];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AboutSEO />
      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section - Full Width Like Home */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=90' }}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <ThemedText style={styles.heroTagText}>{t('legal.about.heroTag')}</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>{t('legal.about.heroTitle')}</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {t('legal.about.heroSubtitle')}
            </ThemedText>
          </View>
        </View>

        {/* Mission */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.missionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.missionContent, isDesktopWeb && styles.webMissionContent]}>
              <View style={styles.missionTextColumn}>
                <IconSymbol name="target" size={32} color={colors.primary} style={{ marginBottom: 16 }} />
                <ThemedText type="defaultSemiBold" style={styles.missionTitle}>{t('legal.about.missionTitle')}</ThemedText>
                <ThemedText style={[styles.missionText, { color: colors.icon }]}>
                  {t('legal.about.missionText')}
                </ThemedText>
              </View>
              <View style={styles.missionMediaColumn}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85' }}
                  style={styles.missionImage}
                  contentFit="cover"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Platform Overview */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.about.offerTitle')}</ThemedText>
          <ThemedText style={[styles.overviewText, { color: colors.icon }]}>
            {t('legal.about.offerText')}
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={[styles.statsSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={[styles.statNumber, { color: colors.primary }]}>{stat.number}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Values */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.about.valuesTitle')}</ThemedText>
          <View style={[styles.valuesGrid, isDesktopWeb && styles.webValuesGrid]}>
            {values.map((value, index) => (
              <View key={index} style={[styles.valueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.valueIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name={VALUE_ICONS[index] as any} size={24} color={colors.primary} />
                </View>
                <ThemedText style={styles.valueTitle}>{value.title}</ThemedText>
                <ThemedText style={[styles.valueText, { color: colors.icon }]}>{value.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 28 }]}>
            <ThemedText style={{ fontSize: 15, color: colors.icon, textAlign: 'center', marginBottom: 8 }}>
              {t('legal.about.productOf')}
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 20, textAlign: 'center', marginBottom: 12 }}>
              {t('legal.about.companyName')}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                if (isWeb && typeof window !== 'undefined') {
                  window.open('https://bonet.rw/about', '_blank');
                } else {
                  router.push('https://bonet.rw/about' as any);
                }
              }}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{t('legal.about.learnMore')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <View style={[styles.ctaSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.ctaCard, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.ctaTitle}>{t('legal.about.ctaTitle')}</ThemedText>
            <ThemedText style={styles.ctaText}>{t('legal.about.ctaText')}</ThemedText>
            <TouchableOpacity 
              style={[styles.ctaButton, { backgroundColor: '#fff' }]}
              onPress={() => router.push('/explore')}
            >
              <ThemedText style={[styles.ctaButtonText, { color: colors.primary }]}>{t('legal.about.ctaButton')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
  },
  heroContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 500,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  missionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  missionContent: {
    gap: 18,
  },
  webMissionContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 24,
  },
  missionTextColumn: {
    flex: 1,
  },
  missionMediaColumn: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 22,
    marginBottom: 12,
  },
  missionText: {
    fontSize: 15,
    lineHeight: 26,
  },
  missionImage: {
    width: '100%',
    minHeight: 240,
    borderRadius: 14,
  },
  overviewText: {
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  valuesGrid: {
    gap: 12,
  },
  webValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  valueCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: isWeb ? '23%' : '45%',
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 13,
    lineHeight: 18,
  },
  teamGrid: {
    gap: 16,
  },
  webTeamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  teamCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    flex: 1,
    minWidth: isWeb ? '23%' : '45%',
  },
  teamImageWrap: {
    borderWidth: 2,
    borderRadius: 46,
    padding: 3,
    marginBottom: 12,
  },
  teamImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  teamFocusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  teamFocusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  teamRole: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '600',
  },
  teamBio: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  teamMetaRow: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  ctaCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
