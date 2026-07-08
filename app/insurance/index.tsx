import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions, Linking } from 'react-native';
import { useEffect } from 'react';
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
              <ThemedText style={styles.heroTagText}>Protect Your Investment</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Vehicle Insurance</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Comprehensive coverage for your car in Rwanda
            </ThemedText>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          {/* Why Insurance */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="checkmark.shield.fill" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Why Vehicle Insurance?</ThemedText>
            <ThemedText style={[styles.cardText, { color: colors.icon }]}>
              Vehicle insurance is mandatory in Rwanda for all registered vehicles. It protects you financially
              against accidents, theft, and third-party damage. Whether you've just purchased a car through Inzira
              or already own one, having proper coverage gives you peace of mind on the road.
            </ThemedText>
          </View>

          {/* Coverage Types */}
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text }]}>
            Coverage Options
          </ThemedText>
          <View style={[styles.coverageGrid, isDesktopWeb && styles.webCoverageGrid]}>
            <View style={[styles.coverageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.coverageIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="checkmark.seal.fill" size={24} color={colors.primary} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.coverageTitle}>Third Party</ThemedText>
              <ThemedText style={[styles.coverageDesc, { color: colors.icon }]}>
                Basic mandatory coverage. Covers damage to other people and their property.
              </ThemedText>
            </View>

            <View style={[styles.coverageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.coverageIconWrap, { backgroundColor: '#10B98115' }]}>
                <IconSymbol name="car.fill" size={24} color="#10B981" />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.coverageTitle}>Comprehensive</ThemedText>
              <ThemedText style={[styles.coverageDesc, { color: colors.icon }]}>
                Full protection including theft, fire, accident damage, and natural disasters.
              </ThemedText>
            </View>

            <View style={[styles.coverageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.coverageIconWrap, { backgroundColor: '#F59E0B15' }]}>
                <IconSymbol name="bolt.fill" size={24} color="#F59E0B" />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.coverageTitle}>Third Party+</ThemedText>
              <ThemedText style={[styles.coverageDesc, { color: colors.icon }]}>
                Third party plus theft and fire coverage. A balanced middle-ground option.
              </ThemedText>
            </View>
          </View>

          {/* Contact Info */}
          <View style={[styles.contactCard, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF', borderColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={[styles.contactTitle, { color: colors.text }]}>
              Get a Quote Today
            </ThemedText>
            <ThemedText style={[styles.contactSubtitle, { color: colors.icon }]}>
              Reach out to our insurance partners for a personalized quote based on your vehicle.
            </ThemedText>

            <View style={styles.contactDetails}>
              <View style={styles.contactRow}>
                <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>+250 788 378 766</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="envelope.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>support@inzira.co</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="location.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>Kigali, Rwanda</ThemedText>
              </View>
              <View style={styles.contactRow}>
                <IconSymbol name="clock.fill" size={18} color={colors.primary} />
                <ThemedText style={[styles.contactText, { color: colors.text }]}>Mon - Fri: 8AM - 6PM</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
              onPress={handleContactInsurance}
              activeOpacity={0.85}
            >
              <IconSymbol name="message.fill" size={18} color="#fff" />
              <ThemedText style={styles.contactButtonText}>Contact Us About Insurance</ThemedText>
            </TouchableOpacity>
          </View>

          {/* FAQ */}
          <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
            Frequently Asked Questions
          </ThemedText>
          <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>Is car insurance mandatory in Rwanda?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: colors.icon }]}>
              Yes. All vehicles must have at minimum third-party liability insurance to operate on Rwandan roads.
            </ThemedText>
          </View>
          <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>How much does vehicle insurance cost?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: colors.icon }]}>
              Costs vary based on vehicle value, type, usage, and coverage level. Third-party starts around RWF 30,000/year. Comprehensive can range from RWF 100,000 to 500,000+ depending on the vehicle.
            </ThemedText>
          </View>
          <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>Can I get insurance for an imported used car?</ThemedText>
            <ThemedText style={[styles.faqAnswer, { color: colors.icon }]}>
              Absolutely. Once your vehicle is registered in Rwanda, you can obtain insurance regardless of whether it was imported used or bought new.
            </ThemedText>
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
