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
import { ServicesSEO } from '@/components/page-meta';

export default function ServicesScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Our Services | Inzira';
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
              <ThemedText style={styles.heroTagText}>What We Offer</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Our Services</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              Everything you need to buy, sell, and maintain your vehicle
            </ThemedText>
          </View>
        </View>

        {/* Main Services */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>For Buyers</ThemedText>
          <View style={[styles.servicesGrid, isDesktopWeb && styles.webServicesGrid]}>
            {BUYER_SERVICES.map((service, index) => (
              <View key={index} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={service.icon} size={28} color={colors.primary} />
                </View>
                <ThemedText style={styles.serviceTitle}>{service.title}</ThemedText>
                <ThemedText style={[styles.serviceDesc, { color: colors.icon }]}>{service.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>For Sellers</ThemedText>
          <View style={[styles.servicesGrid, isDesktopWeb && styles.webServicesGrid]}>
            {SELLER_SERVICES.map((service, index) => (
              <View key={index} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={service.icon} size={28} color={colors.primary} />
                </View>
                <ThemedText style={styles.serviceTitle}>{service.title}</ThemedText>
                <ThemedText style={[styles.serviceDesc, { color: colors.icon }]}>{service.description}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Services */}
        <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Premium Services</ThemedText>
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {PREMIUM_SERVICES.map((service, index) => (
              <View key={index} style={[styles.premiumItem, { borderBottomColor: colors.border }, index === PREMIUM_SERVICES.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.premiumLeft}>
                  <View style={[styles.premiumIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <IconSymbol name={service.icon} size={24} color={colors.primary} />
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
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>How It Works</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
            A simple step-by-step journey from discovery to a secure transaction.
          </ThemedText>
          <View style={styles.stepsContainer}>
            {STEPS.map((step, index) => (
              <View key={index} style={[styles.stepItem, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}50` }]}> 
                    <ThemedText style={[styles.stepNumberText, { color: colors.primary }]}>{index + 1}</ThemedText>
                  </View>
                  <View style={[styles.stepIconWrap, { backgroundColor: `${colors.primary}15` }]}> 
                    <IconSymbol name={step.icon} size={18} color={colors.primary} />
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
            <ThemedText style={styles.ctaText}>Find Your Car</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryCta, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/sell')}
          >
            <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
            <ThemedText style={[styles.secondaryCtaText, { color: colors.text }]}>Sell Your Car</ThemedText>
          </TouchableOpacity>
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const BUYER_SERVICES = [
  { icon: 'magnifyingglass', title: 'Vehicle Browsing', description: 'Browse thousands of verified listings across all vehicle categories including cars, motorcycles, electric vehicles, hybrids, and conventional fuel vehicles. Filter by brand, model, price, location, and vehicle type.' },
  { icon: 'checkmark.shield.fill', title: 'Category Filters', description: 'Advanced filtering system to find exactly what you need. Filter by vehicle type (car, motorcycle, hybrid, electric), fuel type (petrol, diesel, hybrid, electric), status (brand new, imported used, used in Rwanda), and more.' },
  { icon: 'doc.text.magnifyingglass', title: 'Detailed Specifications', description: 'View complete vehicle information including brand, model, year, fuel type, mileage, transmission type, price, and comprehensive descriptions with multiple high-quality images.' },
  { icon: 'photo.stack', title: 'Image Gallery', description: 'See multiple photos showing different angles of the vehicle - front, back, interior, sides - giving you a complete visual understanding before making contact.' },
  { icon: 'message.fill', title: 'Contact Sellers', description: 'Send requests to communicate with sellers directly through our platform. Once accepted, engage in real-time chat to negotiate and ask questions about the vehicle.' },
  { icon: 'handshake.fill', title: 'Deal Proposals', description: 'Propose offers to sellers through our deal management system. Accept, reject, or negotiate offers until you reach an agreement that works for both parties.' },
  { icon: 'heart.fill', title: 'Favorite Listings', description: 'Save vehicles for later viewing. Build your shortlist and compare options before making your final decision.' },
  { icon: 'person.fill', title: 'Profile Management', description: 'Manage your account information, preferences, and communication history all in one place. Track your deal requests and favorite listings.' },
];

const SELLER_SERVICES = [
  { icon: 'plus.circle.fill', title: 'Vehicle Listing', description: 'Add vehicles for sale with full details including title, brand, model, year, vehicle type, fuel type, status, mileage, transmission, price, and comprehensive descriptions.' },
  { icon: 'camera.fill', title: 'Image Upload', description: 'Upload multiple images of the vehicle (front, back, interior, sides) to give buyers a complete visual understanding of your listing.' },
  { icon: 'square.and.pencil', title: 'Listing Management', description: 'Edit, update, or remove vehicle listings at any time. Keep your inventory current with real-time updates and status changes.' },
  { icon: 'person.2.fill', title: 'Buyer Requests', description: 'View and manage all buyers interested in your vehicles. Respond to inquiries and track engagement through your seller dashboard.' },
  { icon: 'chart.bar.fill', title: 'Listing Analytics', description: 'View statistics such as views, inquiries, and interest levels for each listing. Use data-driven insights to optimize your pricing and presentation.' },
  { icon: 'doc.text.fill', title: 'Seller Dashboard', description: 'Get an overview of all active listings, buyer inquiries, deal requests, and transaction history in one comprehensive dashboard.' },
  { icon: 'star.fill', title: 'Subscription Access', description: 'Subscribe to premium plans to unlock full buyer details, featured placements, and advanced analytics for maximum selling potential.' },
  { icon: 'creditcard.fill', title: 'Commission System', description: 'Transparent commission structure for completed deals. We only charge when you successfully sell through our platform.' },
];

const PREMIUM_SERVICES = [
  { icon: 'star.fill', title: 'Featured Listing', description: 'Get 5x more visibility with top placement in search results and featured sections across the platform', price: '$9.99/mo' },
  { icon: 'checkmark.seal.fill', title: 'Seller Verification', description: 'Get verified badge to increase buyer trust and close deals faster', price: '$19.99' },
  { icon: 'arrow.up.circle.fill', title: 'Priority Support', description: 'Jump to the front of the queue with 24/7 priority customer support', price: '$4.99/mo' },
  { icon: 'megaphone.fill', title: 'Promoted Listings', description: 'Your listings appear in special promotional banners and email campaigns', price: '$14.99/mo' },
];

const STEPS = [
  {
    icon: 'person.crop.circle.badge.plus',
    title: 'Create Account',
    outcome: 'Get a verified profile ready for buying or selling.',
    description: 'Sign up as a buyer or seller with your phone number in seconds. Select your role to unlock personalized features.'
  },
  {
    icon: 'line.3.horizontal.decrease.circle.fill',
    title: 'Browse or List',
    outcome: 'Discover matches faster with smart filters and rich listings.',
    description: 'Search for your dream vehicle using advanced filters, or list your vehicle with detailed specifications and photos.'
  },
  {
    icon: 'message.badge.fill',
    title: 'Connect & Chat',
    outcome: 'Speak directly and clarify details before any commitment.',
    description: 'Send contact requests to sellers or respond to buyer inquiries. Our chat system enables real-time communication.'
  },
  {
    icon: 'handshake.fill',
    title: 'Propose & Negotiate',
    outcome: 'Reach mutually fair terms using structured deal flows.',
    description: 'Make deal proposals, negotiate terms, and reach agreements through our secure deal management system.'
  },
  {
    icon: 'checkmark.circle.fill',
    title: 'Complete Transaction',
    outcome: 'Close the deal with confidence and platform support.',
    description: 'Meet, inspect the vehicle, and complete the sale securely with our transaction monitoring and support.'
  },
];

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
