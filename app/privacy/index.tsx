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

const QUICK_NAV_ICONS = ['lock.fill', 'person.fill', 'eye.fill', 'hand.raised.fill', 'bell.fill', 'globe'];
const POLICY_ICONS = ['doc.text.fill', 'gearshape.fill', 'person.2.fill', 'lock.shield.fill', 'clock.fill', 'globe'];
const RIGHTS_ICONS = ['eye.fill', 'square.and.pencil', 'trash.fill', 'arrow.down.doc.fill', 'hand.raised.fill', 'xmark.circle.fill'];

export default function PrivacyScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Privacy Policy | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const quickNav = t('legal.privacy.quickNav', { returnObjects: true }) as string[];
  const policySections = t('legal.privacy.sections', { returnObjects: true }) as { title: string; summary: string; items: { title: string; description: string }[] }[];
  const rights = t('legal.privacy.rights', { returnObjects: true }) as { title: string; description: string }[];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=90' }}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.65)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <ThemedText style={styles.heroTagText}>{t('legal.privacy.heroTag')}</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>{t('legal.privacy.heroTitle')}</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {t('legal.privacy.heroSubtitle')}
            </ThemedText>
            <ThemedText style={styles.heroMeta}>{t('legal.privacy.heroMeta')}</ThemedText>
          </View>
        </View>

        {/* Quick Nav Cards */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.quickNavGrid, isDesktopWeb && styles.webQuickNavGrid]}>
            {quickNav.map((title, index) => (
              <View key={index} style={[styles.quickNavCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.quickNavIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={QUICK_NAV_ICONS[index] as any} size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.quickNavTitle}>{title}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Intro */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.introCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <IconSymbol name="hand.raised.fill" size={28} color={colors.primary} style={{ marginBottom: 12 }} />
            <ThemedText style={[styles.introText, { color: colors.text }]}>
              {t('legal.privacy.introText')}
            </ThemedText>
          </View>
        </View>

        {/* Main Policy Sections */}
        {policySections.map((section, sectionIndex) => (
          <View
            key={sectionIndex}
            style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}
          >
            <View style={[styles.policyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.policyCardHeader}>
                <View style={[styles.policyCardIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={POLICY_ICONS[sectionIndex] as any} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.policyCardNumber}>0{sectionIndex + 1}</ThemedText>
                  <ThemedText style={styles.policyCardTitle}>{section.title}</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.policyCardSummary, { color: colors.icon }]}>
                {section.summary}
              </ThemedText>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={[styles.policyItem, { borderTopColor: colors.border }]}>
                  <View style={[styles.policyItemDot, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.policyItemTitle}>{item.title}</ThemedText>
                    <ThemedText style={[styles.policyItemDesc, { color: colors.icon }]}>{item.description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Your Rights */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.privacy.rightsTitle')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
            {t('legal.privacy.rightsSubtitle')}
          </ThemedText>
          <View style={[styles.rightsGrid, isDesktopWeb && styles.webRightsGrid]}>
            {rights.map((right, index) => (
              <View key={index} style={[styles.rightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.rightIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={RIGHTS_ICONS[index] as any} size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.rightTitle}>{right.title}</ThemedText>
                <ThemedText style={[styles.rightDesc, { color: colors.icon }]}>{right.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Contact / Delete CTA */}
        <View style={[styles.ctaSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.ctaBanner, { backgroundColor: colors.primary }]}>
            <IconSymbol name="envelope.fill" size={28} color="#fff" style={{ marginBottom: 12 }} />
            <ThemedText style={styles.ctaBannerTitle}>{t('legal.privacy.ctaTitle')}</ThemedText>
            <ThemedText style={styles.ctaBannerSubtitle}>
              {t('legal.privacy.ctaSubtitle')}{' '}
              <ThemedText style={[styles.ctaBannerEmail]}>privacy@inzira.co</ThemedText>
            </ThemedText>
            <View style={styles.ctaBannerActions}>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: '#fff' }]}
                onPress={() => router.push('/contact')}
              >
                <ThemedText style={[styles.ctaBtnText, { color: colors.primary }]}>{t('legal.privacy.ctaContactBtn')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaBtnOutline]}
                onPress={() => router.push('/delete' as any)}
              >
                <ThemedText style={styles.ctaBtnOutlineText}>{t('legal.privacy.ctaDeleteBtn')}</ThemedText>
              </TouchableOpacity>
            </View>
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
  scrollContent: {},
  heroContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
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
    marginBottom: 12,
  },
  heroMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  quickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  webQuickNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
  },
  quickNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNavTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  introCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  introText: {
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
  },
  policyCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  policyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 20,
    paddingBottom: 16,
  },
  policyCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  policyCardNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.4,
    marginBottom: 2,
  },
  policyCardTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  policyCardSummary: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  policyItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  policyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  policyItemDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  rightsGrid: {
    gap: 12,
  },
  webRightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rightCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: isWeb ? '30%' : '100%',
  },
  rightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rightTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  rightDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 24,
  },
  ctaBanner: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  ctaBannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaBannerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaBannerEmail: {
    fontWeight: '700',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  ctaBannerActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ctaBtnOutline: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  ctaBtnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});