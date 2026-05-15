import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { isWeb } from '@/lib/platform';
import { subscribeToPlan } from '@/lib/api-subscriptions';
import { displayPrice } from '@/lib/currencyConverter';

const PLANS = [
  {
    id: 'basic_weekly',
    name: 'Basic Weekly',
    price: '5,000',
    period: 'week',
    features: [
      { icon: 'car.fill', text: 'View buyer contact details' },
      { icon: 'bell.fill', text: 'Priority notifications' },
      { icon: 'message.fill', text: 'Reply to 10 messages/week' },
    ],
    recommended: false,
  },
  {
    id: 'basic_monthly',
    name: 'Basic Monthly',
    price: '15,000',
    period: 'month',
    features: [
      { icon: 'car.fill', text: 'View buyer contact details' },
      { icon: 'bell.fill', text: 'Priority notifications' },
      { icon: 'message.fill', text: 'Reply to 40 messages/month' },
    ],
    recommended: false,
  },
  {
    id: 'pro_weekly',
    name: 'Pro Weekly',
    price: '15,000',
    period: 'week',
    features: [
      { icon: 'car.fill', text: 'Unlimited contact views' },
      { icon: 'bell.fill', text: 'Instant notifications' },
      { icon: 'message.fill', text: 'Unlimited messaging' },
      { icon: 'checkmark.seal.fill', text: 'Verified seller badge' },
    ],
    recommended: true,
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '45,000',
    period: 'month',
    features: [
      { icon: 'car.fill', text: 'Unlimited contact views' },
      { icon: 'bell.fill', text: 'Instant notifications' },
      { icon: 'message.fill', text: 'Unlimited messaging' },
      { icon: 'checkmark.seal.fill', text: 'Verified seller badge' },
    ],
    recommended: false,
  },
  {
    id: 'business_weekly',
    name: 'Business Weekly',
    price: '50,000',
    period: 'week',
    features: [
      { icon: 'car.fill', text: 'Multiple dealership accounts' },
      { icon: 'bell.fill', text: 'API access for inventory' },
      { icon: 'message.fill', text: 'Dedicated support' },
      { icon: 'checkmark.seal.fill', text: 'Featured listings' },
    ],
    recommended: false,
  },
  {
    id: 'business_monthly',
    name: 'Business Monthly',
    price: '150,000',
    period: 'month',
    features: [
      { icon: 'car.fill', text: 'Multiple dealership accounts' },
      { icon: 'bell.fill', text: 'API access for inventory' },
      { icon: 'message.fill', text: 'Dedicated support' },
      { icon: 'checkmark.seal.fill', text: 'Featured listings' },
    ],
    recommended: false,
  },
];

export default function SubscriptionScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Subscription | Inzira';
    }
  }, []);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true);
    try {
      await subscribeToPlan(planId);
      if (!isWeb) {
        Alert.alert('Success', 'Subscription activated successfully!');
      }
      router.push('/(tabs)/profile');
    } catch (error: any) {
      if (!isWeb) {
        Alert.alert('Error', error.message || 'Failed to subscribe');
      } else {
        window.alert(error.message || 'Failed to subscribe');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Subscription</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.content, isDesktopWeb && styles.webContent]}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.iconRow, { backgroundColor: `${colors.primary}15` }]}>
            <IconSymbol name="car.fill" size={28} color={colors.primary} />
            <IconSymbol name="bell.fill" size={28} color={colors.primary} />
            <IconSymbol name="message.fill" size={28} color={colors.primary} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.heroTitle}>
            Unlock Full Access
          </ThemedText>
          <ThemedText style={[styles.heroSubtitle, { color: colors.icon }]}>
            Subscribe weekly or monthly to connect with buyers, receive notifications, and manage unlimited messages
          </ThemedText>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <View 
              key={plan.id}
              style={[
                styles.planCard, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: plan.recommended ? colors.primary : colors.border,
                  borderWidth: plan.recommended ? 2 : 1,
                }
              ]}
            >
              {plan.recommended && (
                <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                  <ThemedText style={styles.recommendedText}>Recommended</ThemedText>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <ThemedText type="defaultSemiBold" style={styles.planName}>{plan.name}</ThemedText>
                <View style={styles.priceRow}>
                  <ThemedText style={[styles.price, { color: colors.primary }]}>{displayPrice(Number(plan.price.replace(/,/g, '')) || 0)}</ThemedText>
                  <ThemedText style={[styles.period, { color: colors.icon }]}>/{plan.period}</ThemedText>
                </View>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <IconSymbol name={feature.icon as any} size={18} color={colors.primary} />
                    <ThemedText style={[styles.featureText, { color: colors.text }]}>
                      {feature.text}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[
                  styles.subscribeBtn, 
                  { 
                    backgroundColor: plan.recommended ? colors.primary : 'transparent',
                    borderWidth: plan.recommended ? 0 : 1,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleSubscribe(plan.id)}
              >
                <ThemedText 
                  style={[
                    styles.subscribeBtnText, 
                    { color: plan.recommended ? '#fff' : colors.text }
                  ]}
                >
                  Subscribe
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Note */}
        <ThemedText style={[styles.note, { color: colors.icon }]}>
          All plans auto-renew. Cancel anytime from your account settings.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  period: {
    fontSize: 14,
  },
  featuresList: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  webContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
});
