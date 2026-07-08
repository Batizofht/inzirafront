import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions } from 'react-native';
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

export default function PrivacyScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Privacy Policy | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
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
              <ThemedText style={styles.heroTagText}>Legal &amp; Trust</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Privacy Policy</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              How we collect, use, and protect your personal information
            </ThemedText>
            <ThemedText style={styles.heroMeta}>Last updated: May 2025</ThemedText>
          </View>
        </View>

        {/* Quick Nav Cards */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.quickNavGrid, isDesktopWeb && styles.webQuickNavGrid]}>
            {QUICK_NAV.map((item, index) => (
              <View key={index} style={[styles.quickNavCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.quickNavIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={item.icon} size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.quickNavTitle}>{item.title}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Intro */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.introCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <IconSymbol name="hand.raised.fill" size={28} color={colors.primary} style={{ marginBottom: 12 }} />
            <ThemedText style={[styles.introText, { color: colors.text }]}>
              At Inzira, your privacy is not an afterthought — it is a commitment. This Privacy Policy explains
              exactly what data we collect, why we collect it, and how you remain in control at all times.
              By using Inzira's mobile app or web platform, you agree to the practices described here.
            </ThemedText>
          </View>
        </View>

        {/* Main Policy Sections */}
        {POLICY_SECTIONS.map((section, sectionIndex) => (
          <View
            key={sectionIndex}
            style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}
          >
            <View style={[styles.policyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.policyCardHeader}>
                <View style={[styles.policyCardIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={section.icon} size={22} color={colors.primary} />
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
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Your Rights</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
            You have full control over your personal data on Inzira.
          </ThemedText>
          <View style={[styles.rightsGrid, isDesktopWeb && styles.webRightsGrid]}>
            {RIGHTS.map((right, index) => (
              <View key={index} style={[styles.rightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.rightIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={right.icon} size={20} color={colors.primary} />
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
            <ThemedText style={styles.ctaBannerTitle}>Have Privacy Questions?</ThemedText>
            <ThemedText style={styles.ctaBannerSubtitle}>
              Contact our Privacy Team at{' '}
              <ThemedText style={[styles.ctaBannerEmail]}>privacy@inzira.co</ThemedText>
            </ThemedText>
            <View style={styles.ctaBannerActions}>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: '#fff' }]}
                onPress={() => router.push('/contact')}
              >
                <ThemedText style={[styles.ctaBtnText, { color: colors.primary }]}>Contact Support</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaBtnOutline]}
                onPress={() => router.push('/delete' as any)}
              >
                <ThemedText style={styles.ctaBtnOutlineText}>Delete My Data</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <WebFooter />
      </ScrollView>
    </View>
  );
}

const QUICK_NAV = [
  { icon: 'lock.fill', title: 'Data Security' },
  { icon: 'person.fill', title: 'Your Data' },
  { icon: 'eye.fill', title: 'Usage Info' },
  { icon: 'hand.raised.fill', title: 'Your Rights' },
  { icon: 'bell.fill', title: 'Notifications' },
  { icon: 'globe', title: 'Third Parties' },
];

const POLICY_SECTIONS = [
  {
    icon: 'doc.text.fill',
    title: 'Information We Collect',
    summary: 'We collect only what is necessary to provide a trusted, functional vehicle marketplace.',
    items: [
      {
        title: 'Account Information',
        description: 'When you register, we collect your full name, phone number, email address, and profile photo. This is used to create and identify your account.',
      },
      {
        title: 'Vehicle Listings',
        description: 'Sellers provide vehicle details including title, brand, model, year, mileage, fuel type, transmission, price, and photos. This data is publicly visible to buyers browsing listings.',
      },
      {
        title: 'Location Data',
        description: 'With your permission, we access your device location to display nearby vehicles and auto-fill your location field on your profile. You may deny this permission at any time.',
      },
      {
        title: 'Messages & Transactions',
        description: 'Chat messages between buyers and sellers and deal proposal records are stored securely to support dispute resolution and transaction history.',
      },
      {
        title: 'Device & Usage Data',
        description: 'We collect device identifiers, app version, OS type, and anonymised usage analytics to improve platform stability and performance.',
      },
    ],
  },
  {
    icon: 'gearshape.fill',
    title: 'How We Use Your Information',
    summary: 'Your data powers the features you use — nothing more.',
    items: [
      {
        title: 'Platform Operations',
        description: 'To create and maintain your account, display your listings, facilitate buyer–seller communication, and process subscription payments.',
      },
      {
        title: 'Personalisation',
        description: 'To show you relevant vehicle recommendations, category filters, and market insights based on your browsing history and saved preferences.',
      },
      {
        title: 'Safety & Trust',
        description: 'To verify seller identities, review reported listings, detect fraudulent activity, and enforce our Terms of Service.',
      },
      {
        title: 'Notifications',
        description: 'To send you alerts about new messages, deal updates, listing views, and platform news. You can manage notification preferences in Settings.',
      },
      {
        title: 'Legal Compliance',
        description: 'To comply with applicable Rwandan law, respond to lawful government requests, and resolve legal disputes when necessary.',
      },
    ],
  },
  {
    icon: 'person.2.fill',
    title: 'Sharing Your Information',
    summary: 'We do not sell your personal data. Sharing is limited and purposeful.',
    items: [
      {
        title: 'With Other Users',
        description: 'Your public profile (name, verified status, listed vehicles) is visible to other Inzira users. Your phone number is only shared when both parties accept a deal proposal.',
      },
      {
        title: 'Service Providers',
        description: 'We work with trusted partners for payment processing, cloud hosting, and analytics. These providers are contractually bound to handle your data securely and only for specified purposes.',
      },
      {
        title: 'Legal Authorities',
        description: 'We may disclose data when required by Rwandan law, court order, or to protect the rights and safety of Inzira users.',
      },
      {
        title: 'Business Transfers',
        description: 'In the event of a merger or acquisition, user data may be transferred. We will notify you before your data becomes subject to a different Privacy Policy.',
      },
    ],
  },
  {
    icon: 'lock.shield.fill',
    title: 'Data Security',
    summary: 'We use industry-standard security to protect your information.',
    items: [
      {
        title: 'Encryption',
        description: 'All data in transit is encrypted using TLS 1.3. Sensitive fields such as passwords are hashed with bcrypt and never stored in plaintext.',
      },
      {
        title: 'Access Controls',
        description: 'Only authorised Inzira engineers with a documented need can access personal data. All internal access is logged and audited.',
      },
      {
        title: 'Infrastructure',
        description: 'Our servers are hosted on reputable cloud infrastructure with automated backups, intrusion detection, and DDoS protection.',
      },
      {
        title: 'Incident Response',
        description: 'In the event of a data breach, we will notify affected users within 72 hours and take immediate steps to contain and remediate the issue.',
      },
    ],
  },
  {
    icon: 'clock.fill',
    title: 'Data Retention',
    summary: 'We keep your data only as long as necessary.',
    items: [
      {
        title: 'Active Accounts',
        description: 'We retain your account data for as long as your account is active or as needed to provide services.',
      },
      {
        title: 'Deleted Accounts',
        description: 'When you delete your account, your personal data is permanently removed within 30 days. Anonymised transaction records may be retained for legal compliance.',
      },
      {
        title: 'Messages',
        description: 'Chat messages are retained for 12 months after a transaction closes, then permanently deleted unless required for an open dispute.',
      },
    ],
  },
  {
    icon: 'globe',
    title: "Children's Privacy",
    summary: 'Inzira is not intended for users under the age of 18.',
    items: [
      {
        title: 'Age Requirement',
        description: 'You must be at least 18 years old to create an account or use Inzira services. We do not knowingly collect personal information from minors.',
      },
      {
        title: 'Parental Contact',
        description: 'If we discover that a minor has provided us with personal information, we will delete it immediately. Parents may contact privacy@inzira.co to request removal.',
      },
    ],
  },
];

const RIGHTS = [
  {
    icon: 'eye.fill',
    title: 'Right to Access',
    description: 'Request a copy of all personal data we hold about you at any time.',
  },
  {
    icon: 'square.and.pencil',
    title: 'Right to Correct',
    description: 'Update or correct inaccurate personal information through your profile settings or by contacting us.',
  },
  {
    icon: 'trash.fill',
    title: 'Right to Delete',
    description: 'Request permanent deletion of your account and all associated data within 30 days.',
  },
  {
    icon: 'arrow.down.doc.fill',
    title: 'Right to Export',
    description: 'Download a portable copy of your data in a machine-readable format.',
  },
  {
    icon: 'hand.raised.fill',
    title: 'Right to Object',
    description: 'Opt out of marketing communications or data processing for analytics at any time.',
  },
  {
    icon: 'xmark.circle.fill',
    title: 'Right to Restrict',
    description: 'Ask us to limit how we use your data while a correction or objection is being reviewed.',
  },
];

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