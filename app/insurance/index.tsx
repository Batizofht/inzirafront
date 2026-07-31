import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions, Linking } from 'react-native';
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
import { InsuranceSEO } from '@/components/page-head';

export default function InsuranceScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Vehicle Insurance | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  const handleContactInsurance = () => {
    router.push('/contact?subject=Vehicle%20Insurance%20Inquiry' as any);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <InsuranceSEO />
      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={require("../../assets/insurance.png")}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <ThemedText style={styles.heroTagText}>{t('legal.insurance.heroTag')}</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>{t('legal.insurance.heroTitle')}</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {t('legal.insurance.heroSubtitle')}
            </ThemedText>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          {/* Why Insurance */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="checkmark.shield.fill" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{t('legal.insurance.whyTitle')}</ThemedText>
            <ThemedText style={[styles.cardText, { color: colors.icon }]}>
              {t('legal.insurance.whyText')}
            </ThemedText>
          </View>

          {/* Coverage Types */}
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.insurance.coverageTitle')}
          </ThemedText>
          <View style={[styles.coverageGrid, isDesktopWeb && styles.webCoverageGrid]}>
            {(t('legal.insurance.coverage', { returnObjects: true }) as { title: string; description: string }[]).map((cov, idx) => {
              const iconConfig = [
                { name: 'checkmark.seal.fill', bg: `${colors.primary}15`, color: colors.primary },
                { name: 'car.fill', bg: '#10B98115', color: '#10B981' },
                { name: 'bolt.fill', bg: '#F59E0B15', color: '#F59E0B' },
              ][idx];
              return (
                <View key={idx} style={[styles.coverageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.coverageIconWrap, { backgroundColor: iconConfig.bg }]}>
                    <IconSymbol name={iconConfig.name as any} size={24} color={iconConfig.color} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.coverageTitle}>{cov.title}</ThemedText>
                  <ThemedText style={[styles.coverageDesc, { color: colors.icon }]}>
                    {cov.description}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          {/* Contact Info */}
          <View style={[styles.contactCard, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF', borderColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={[styles.contactTitle, { color: colors.text }]}>
              {t('legal.insurance.getQuoteTitle')}
            </ThemedText>
            <ThemedText style={[styles.contactSubtitle, { color: colors.icon }]}>
              {t('legal.insurance.getQuoteSubtitle')}
            </ThemedText>

            <View style={styles.contactDetails}>
              <View style={styles.contactRow}>
                <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>+250 788 307 583</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="envelope.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>info@inzira.co</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="location.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>Kigali, Rwanda</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="clock.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>{t('legal.contact.workingHoursValue')}</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
              onPress={handleContactInsurance}
              activeOpacity={0.85}
            >
              <IconSymbol name="message.fill" size={18} color="#fff" />
              <ThemedText style={styles.contactButtonText}>{t('legal.insurance.contactUsBtn')}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* FAQ */}
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
            {t('legal.insurance.faqTitle')}
          </ThemedText>
          {(t('legal.insurance.faqs', { returnObjects: true }) as { question: string; answer: string }[]).map((faq, idx) => (
            <View key={idx} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>{faq.question}</ThemedText>
              <ThemedText style={[styles.faqAnswer, { color: colors.icon }]}>
                {faq.answer}
              </ThemedText>
            </View>
          ))}
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
    paddingBottom: 0,
  },
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    overflow: 'hidden',
  },
  heroBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
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
    paddingVertical: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 500,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  coverageGrid: {
    gap: 12,
    marginBottom: 28,
  },
  webCoverageGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  coverageCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  coverageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  coverageTitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  coverageDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  contactTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  contactSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  contactDetails: {
    gap: 14,
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  faqCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 14,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
  },
});
