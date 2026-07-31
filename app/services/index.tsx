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
import { ServicesSEO } from '@/components/page-meta';

const BUYER_ICONS = ['magnifyingglass', 'checkmark.shield.fill', 'doc.text.magnifyingglass', 'photo.stack', 'message.fill', 'handshake.fill', 'heart.fill', 'person.fill'];
const SELLER_ICONS = ['plus.circle.fill', 'camera.fill', 'square.and.pencil', 'person.2.fill', 'chart.bar.fill', 'doc.text.fill', 'creditcard.fill'];
const PREMIUM_ICONS = ['star.fill', 'checkmark.seal.fill', 'arrow.up.circle.fill', 'megaphone.fill'];
const STEP_ICONS = ['person.crop.circle.badge.plus', 'line.3.horizontal.decrease.circle.fill', 'message.badge.fill', 'handshake.fill', 'checkmark.circle.fill'];

export default function ServicesScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Our Services | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const buyerServices = t('legal.services.buyerServices', { returnObjects: true }) as { title: string; description: string }[];
  const sellerServices = t('legal.services.sellerServices', { returnObjects: true }) as { title: string; description: string }[];
  const premiumServices = t('legal.services.premiumServices', { returnObjects: true }) as { title: string; description: string; price: string }[];
  const steps = t('legal.services.steps', { returnObjects: true }) as { title: string; outcome: string; description: string }[];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ServicesSEO />
      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section - Full Width */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=90' }}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <ThemedText style={styles.heroTagText}>{t('legal.services.heroTag')}</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>{t('legal.services.heroTitle')}</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {t('legal.services.heroSubtitle')}
            </ThemedText>
          </View>
        </View>

        {/* Main Services */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.services.forBuyers')}</ThemedText>
          <View style={[styles.servicesGrid, isDesktopWeb && styles.webServicesGrid]}>
            {buyerServices.map((service, index) => (
              <View key={index} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={BUYER_ICONS[index] as any} size={28} color={colors.primary} />
                </View>
                <ThemedText style={styles.serviceTitle}>{service.title}</ThemedText>
                <ThemedText style={[styles.serviceDesc, { color: colors.icon }]}>{service.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.services.forSellers')}</ThemedText>
          <View style={[styles.servicesGrid, isDesktopWeb && styles.webServicesGrid]}>
            {sellerServices.map((service, index) => (
              <View key={index} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={SELLER_ICONS[index] as any} size={28} color={colors.primary} />
                </View>
                <ThemedText style={styles.serviceTitle}>{service.title}</ThemedText>
                <ThemedText style={[styles.serviceDesc, { color: colors.icon }]}>{service.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Services */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.services.premiumTitle')}</ThemedText>
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {premiumServices.map((service, index) => (
              <View key={index} style={[styles.premiumItem, { borderBottomColor: colors.border }, index === premiumServices.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.premiumLeft}>
                  <View style={[styles.premiumIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <IconSymbol name={PREMIUM_ICONS[index] as any} size={24} color={colors.primary} />
                  </View>
                  <View>
                    <ThemedText style={styles.premiumTitle}>{service.title}</ThemedText>
                    <ThemedText style={[styles.premiumDesc, { color: colors.icon }]}>{service.description}</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.premiumPrice, { color: colors.primary }]}>{service.price}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.services.howItWorksTitle')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
            {t('legal.services.howItWorksSubtitle')}
          </ThemedText>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={[styles.stepItem, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}50` }]}> 
                    <ThemedText style={[styles.stepNumberText, { color: colors.primary }]}>{index + 1}</ThemedText>
                  </View>
                  <View style={[styles.stepIconWrap, { backgroundColor: `${colors.primary}15` }]}> 
                    <IconSymbol name={STEP_ICONS[index] as any} size={18} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.stepContent}>
                  <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                  <ThemedText style={[styles.stepDesc, { color: colors.icon }]}>{step.description}</ThemedText>
                </View>
                <View style={[styles.stepFooter, { borderTopColor: colors.border }]}> 
                  <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} />
                  <ThemedText style={[styles.stepFooterText, { color: colors.icon }]}>{step.outcome}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={[styles.ctaSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <TouchableOpacity 
            style={[styles.primaryCta, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/explore')}
          >
            <IconSymbol name="magnifyingglass" size={20} color="#fff" />
            <ThemedText style={styles.ctaText}>{t('legal.services.findYourCar')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryCta, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/sell')}
          >
            <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
            <ThemedText style={[styles.secondaryCtaText, { color: colors.text }]}>{t('legal.services.sellYourCar')}</ThemedText>
          </TouchableOpacity>
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
  servicesGrid: {
    gap: 12,
  },
  webServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: isWeb ? '23%' : '45%',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  serviceDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  premiumCard: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  premiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  premiumDesc: {
    fontSize: 13,
  },
  premiumPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  stepsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  stepItem: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: isWeb ? '31%' : '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryCtaText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    // paddingBottom: 40,
  },
  stepsContainer: {
    gap: 12,
  },
  webStepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepContent: {
    width: '100%',
  },
  stepHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepFooter: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
