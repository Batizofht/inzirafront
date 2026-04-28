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
import { AboutSEO } from '@/components/page-meta';

export default function AboutScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'About Us | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
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
              <ThemedText style={styles.heroTagText}>The Verified Car Marketplace</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>About Us</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Connecting buyers and sellers since 2020
            </ThemedText>
          </View>
        </View>

        {/* Mission */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.missionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.missionContent, isDesktopWeb && styles.webMissionContent]}>
              <View style={styles.missionTextColumn}>
                <IconSymbol name="target" size={32} color={colors.primary} style={{ marginBottom: 16 }} />
                <ThemedText type="defaultSemiBold" style={styles.missionTitle}>Our Mission</ThemedText>
                <ThemedText style={[styles.missionText, { color: colors.icon }]}>
                  Inzira.co is the premier digital marketplace for buying and selling vehicles across Rwanda. 
                  Our mission is to revolutionize the automotive marketplace by making transactions simple, transparent, 
                  and trustworthy. We connect verified sellers with genuine buyers, ensuring every deal is secure and fair. 
                  Whether you're looking for luxury sedans, commercial trucks, motorcycles, electric vehicles, or hybrid cars, 
                  we provide a reliable platform where trust meets convenience. Since 2020, we've been bridging the gap 
                  between buyers and sellers with cutting-edge technology and local expertise.
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
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>What We Offer</ThemedText>
          <ThemedText style={[styles.overviewText, { color: colors.icon }]}>
            Our platform supports multiple vehicle categories including cars, motorcycles, electric vehicles, 
            hybrid vehicles, and conventional fuel vehicles. We provide a comprehensive ecosystem with three 
            main components: a Mobile App for on-the-go access, a full-featured Web Platform for desktop users, 
            and a powerful Admin Dashboard for managing operations, users, payments, and listings.
          </ThemedText>
        </View>

        {/* Stats */}
        <View style={[styles.statsSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={styles.statsGrid}>
            {STATS.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={[styles.statNumber, { color: colors.primary }]}>{stat.number}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Values */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Our Values</ThemedText>
          <View style={[styles.valuesGrid, isDesktopWeb && styles.webValuesGrid]}>
            {VALUES.map((value, index) => (
              <View key={index} style={[styles.valueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.valueIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name={value.icon} size={24} color={colors.primary} />
                </View>
                <ThemedText style={styles.valueTitle}>{value.title}</ThemedText>
                <ThemedText style={[styles.valueText, { color: colors.icon }]}>{value.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Meet the Team</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
            The people building a trusted vehicle marketplace for Rwanda.
          </ThemedText>
          <View style={[styles.teamGrid, isDesktopWeb && styles.webTeamGrid]}>
            {TEAM.map((member, index) => (
              <View key={index} style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.teamImageWrap, { borderColor: `${colors.primary}55` }]}>
                  <Image source={{ uri: member.image }} style={styles.teamImage} contentFit="cover" />
                </View>
                <View style={[styles.teamFocusBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <ThemedText style={[styles.teamFocusText, { color: colors.primary }]}>{member.focus}</ThemedText>
                </View>
                <ThemedText style={styles.teamName}>{member.name}</ThemedText>
                <ThemedText style={[styles.teamRole, { color: colors.primary }]}>{member.role}</ThemedText>
                <ThemedText style={[styles.teamBio, { color: colors.icon }]}>{member.bio}</ThemedText>
                <View style={[styles.teamMetaRow, { borderTopColor: colors.border }]}> 
                  <View style={styles.teamMetaItem}>
                    <IconSymbol name="clock.fill" size={12} color={colors.icon} />
                    <ThemedText style={[styles.teamMetaText, { color: colors.icon }]}>{member.tenure}</ThemedText>
                  </View>
                  <View style={styles.teamMetaItem}>
                    <IconSymbol name="mappin.and.ellipse" size={12} color={colors.icon} />
                    <ThemedText style={[styles.teamMetaText, { color: colors.icon }]}>{member.location}</ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={[styles.ctaSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.ctaCard, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.ctaTitle}>Ready to find your perfect vehicle?</ThemedText>
            <ThemedText style={styles.ctaText}>Join thousands of happy customers today</ThemedText>
            <TouchableOpacity 
              style={[styles.ctaButton, { backgroundColor: '#fff' }]}
              onPress={() => router.push('/explore')}
            >
              <ThemedText style={[styles.ctaButtonText, { color: colors.primary }]}>Browse Vehicles</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const STATS = [
  { number: '10K+', label: 'Vehicles Listed' },
  { number: '50K+', label: 'Happy Customers' },
  { number: '5K+', label: 'Dealers' },
  { number: '98%', label: 'Satisfaction Rate' },
];

const VALUES = [
  { icon: 'checkmark.shield.fill', title: 'Trust & Transparency', description: 'We verify every listing and seller to ensure you deal with genuine, trustworthy parties. Our verification process includes identity checks and vehicle documentation validation.' },
  { icon: 'bolt.fill', title: 'Speed & Efficiency', description: 'Our platform is designed for quick transactions. From listing to sale, we streamline every step with smart categorization, instant messaging, and deal management tools.' },
  { icon: 'hand.thumbsup.fill', title: '24/7 Customer Support', description: 'Our dedicated support team is available around the clock to assist with any questions, disputes, or technical issues you may encounter.' },
  { icon: 'lock.fill', title: 'Security First', description: 'Your data and transactions are protected with industry-standard encryption. We never share your personal information without consent.' },
  { icon: 'creditcard.fill', title: 'Flexible Payments', description: 'We offer multiple payment options including subscription plans for sellers and secure transaction processing for all users.' },
  { icon: 'chart.bar.fill', title: 'Market Intelligence', description: 'Access real-time market data, pricing insights, and analytics to make informed buying or selling decisions.' },
];

const TEAM = [
  {
    name: 'Jean Mugabo',
    role: 'CEO & Founder',
    focus: 'Platform Vision',
    tenure: '6+ years',
    location: 'Kigali HQ',
    bio: 'Leads strategy, trust standards, and dealer growth across Rwanda.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
  },
  {
    name: 'Claire Uwase',
    role: 'Head of Operations',
    focus: 'Marketplace Ops',
    tenure: '5+ years',
    location: 'Kigali HQ',
    bio: 'Owns listing quality, seller onboarding, and smooth buyer journeys.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80'
  },
  {
    name: 'Eric Ndayisaba',
    role: 'Tech Lead',
    focus: 'Product Engineering',
    tenure: '4+ years',
    location: 'Kigali HQ',
    bio: 'Builds secure search, messaging, and real-time listing infrastructure.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80'
  },
  {
    name: 'Grace Ingabire',
    role: 'Customer Success',
    focus: 'User Experience',
    tenure: '4+ years',
    location: 'Kigali HQ',
    bio: 'Ensures every transaction feels guided, fast, and genuinely supported.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80'
  },
];

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
