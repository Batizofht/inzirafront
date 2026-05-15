import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, useWindowDimensions, Alert } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { isWeb } from '@/lib/platform';
import { fetchConversations, type Conversation } from '@/lib/api-messages';
import { fetchMySubscription, hasActiveSubscription, subscribeToPlan, getSubscriptionRemainingDays } from '@/lib/api-subscriptions';
import { getAuthUser, getUserType, type UserType } from '@/lib/userPreference';

export default function MessagesScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Messages | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with SearchScreen)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const messagesMaxWidth = is2Xl ? 980 : isXl ? 920 : isLg ? 840 : 720;
  const desktopOuterPadding: ViewStyle | undefined = isDesktopWeb
    ? { paddingHorizontal: webPaddingHorizontal }
    : undefined;
  const desktopInnerWidth: ViewStyle | undefined = isDesktopWeb
    ? { width: '100%', alignSelf: 'center' as const, maxWidth: messagesMaxWidth }
    : undefined;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSub, setHasSub] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMockSubscriptionPayment = async (planId: string = 'basic_weekly') => {
    if (isProcessingSubscription) return;

    try {
      setIsProcessingSubscription(true);
      await subscribeToPlan(planId);
      setHasSub(true);
      if (!isWeb) {
        alert('Subscription activated. Messaging is now unlocked.');
      } else {
        window.alert('Subscription activated. Messaging is now unlocked.');
      }
      loadConversations();
    } catch (error: any) {
      if (!isWeb) {
        alert(error?.message || 'Unable to process subscription payment.');
      } else {
        window.alert(error?.message || 'Unable to process subscription payment.');
      }
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authUser = await getAuthUser();
      if (!authUser) {
        setConversations([]);
        setHasSub(false);
        setUserType(null);
        setError('Authentication required');
        return;
      }

      const [conversationsRes, subscriptionRes, type] = await Promise.all([
        fetchConversations(),
        fetchMySubscription().catch(() => ({ data: { subscription: null } })),
        getUserType(),
      ]);
      setConversations(conversationsRes.data.conversations);
      setHasSub(hasActiveSubscription(subscriptionRes.data.subscription));
      setSubscription(subscriptionRes.data.subscription);
      setUserType(type);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      if (/missing auth token|unauthorized|not authenticated|authentication required|401/i.test(message)) {
        setConversations([]);
        setHasSub(false);
        setUserType(null);
      } else {
        console.error('Failed to load messages:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours - show time
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Less than 7 days - show day name
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    // Otherwise - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleChatPress = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  const goToLogin = () => {
    router.push('/auth/login' as any);
  };

  const isAuthError =
    !!error &&
    /missing auth token|unauthorized|not authenticated|authentication required|401/i.test(error);

  const getChatPartner = (conv: Conversation) => {
    if (userType === 'buyer') {
      return { name: conv.sellerName, type: 'Seller' };
    } else {
      return { name: conv.buyerName, type: 'Buyer' };
    }
  };

  const handleLockedConversationPress = () => {
    if (userType === 'seller' && !hasSub) {
      // Show subscription options (weekly or monthly)
      if (isWeb && typeof window !== 'undefined') {
        const choice = window.confirm(
          'Subscribe to view buyer details:\n\nOK = Weekly (RWF 5,000/week)\nCancel = Choose Monthly from subscription page'
        );
        if (choice) {
          handleMockSubscriptionPayment('basic_weekly');
        } else {
          router.push('/subscription');
        }
      } else {
        Alert.alert(
          'Subscription Required',
          'Choose a plan to view buyer details:',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Weekly RWF 5,000', onPress: () => handleMockSubscriptionPayment('basic_weekly') },
            { text: 'View All Plans', onPress: () => router.push('/subscription') },
          ]
        );
      }
      return;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
          <View style={[styles.topHeaderInner, desktopInnerWidth]}> 
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, styles.backBtnAbsolute]}>
                <IconSymbol name="chevron.left" size={24} color={colors.text} />
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Messages</ThemedText>
              </TouchableOpacity>
           
            </View>
          </View>
        </View>
        <View style={[styles.centerContent, desktopOuterPadding]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}> 
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
        <View style={[styles.topHeaderInner, desktopInnerWidth]}> 
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, styles.backBtnAbsolute]}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
         <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Messages</ThemedText>
            </TouchableOpacity>
            
          </View>
        </View>
        
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={isDesktopWeb && styles.webScrollContent}> 
        <View style={desktopOuterPadding}>
        <View style={[styles.content, desktopInnerWidth]}> 
        {isAuthError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <IconSymbol name="person.fill" size={32} color={colors.icon} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>Login Required</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>To see your messages login first</ThemedText>
            <TouchableOpacity style={[styles.browseBtn, { backgroundColor: colors.primary }]} onPress={goToLogin}>
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Login</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* Seller Subscription Banner */}
        {userType === 'seller' && !hasSub && (
          <View style={[styles.subscriptionBanner, { backgroundColor: `${colors.primary}15`, borderColor: colors.border }]}> 
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.primary} />
            <View style={styles.bannerContent}>
              <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                Subscription Required
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                Subscribe weekly or monthly to view buyer info and reply to messages
              </ThemedText>
            </View>
            <TouchableOpacity 
              style={[styles.subscribeBtn, { backgroundColor: colors.primary, opacity: isProcessingSubscription ? 0.7 : 1 }]}
              onPress={() => router.push('/subscription')}
              disabled={isProcessingSubscription}
            >
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Subscribe</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Active subscription remaining days */}
        {userType === 'seller' && hasSub && subscription && (
          <View style={[styles.subscriptionBanner, { backgroundColor: `${colors.primary}10`, borderColor: colors.border }]}>
            <IconSymbol name="checkmark.seal.fill" size={20} color={colors.primary} />
            <View style={styles.bannerContent}>
              <ThemedText style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                Subscription Active
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>
                {getSubscriptionRemainingDays(subscription)} days remaining
              </ThemedText>
            </View>
          </View>
        )}

        {/* Empty State */}
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol name="message.fill" size={32} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>No messages yet</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>
              {userType === 'buyer' 
                ? "Start browsing vehicles and contact sellers"
                : "Buyers will appear here when they message you"
              }
            </ThemedText>
            {userType === 'buyer' && (
              <TouchableOpacity 
                style={[styles.browseBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/explore')}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Browse Vehicles</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Conversation List */}
        {conversations.map((chat) => {
          const partner = getChatPartner(chat);
          const isSeller = userType === 'seller';
          const canReply = !isSeller || hasSub;
          
          return (
            <TouchableOpacity 
              key={chat.id} 
              style={[styles.chatItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                if (isSeller && !hasSub) {
                  handleLockedConversationPress();
                  return;
                }
                handleChatPress(chat.id);
              }}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                  <IconSymbol name="person.fill" size={24} color={colors.icon} />
                </View>
                {chat.unreadCount > 0 && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.nameRow}>
                    <ThemedText style={styles.userName} numberOfLines={1}>
                      {isSeller && !hasSub ? '••••••••' : partner.name}
                    </ThemedText>
                    {/* Seller can't see buyer name without subscription */}
                    {isSeller && !hasSub && (
                      <View style={[styles.lockedBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <IconSymbol name="lock.fill" size={10} color={colors.icon} />
                        <ThemedText style={{ color: colors.icon, fontSize: 10 }}>Locked</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.time, { 
                    color: chat.unreadCount > 0 ? colors.primary : colors.icon,
                    fontWeight: chat.unreadCount > 0 ? '600' : '400'
                  }]}>
                    {formatTime(chat.lastMessageAt)}
                  </ThemedText>
                </View>
                
                <View style={styles.vehicleContext}>
                  <IconSymbol name="car.fill" size={12} color={colors.icon} style={{ marginRight: 4 }} />
                  <ThemedText style={[styles.vehicleRef, { color: colors.icon }]} numberOfLines={1}>
                    {chat.vehicleTitle}
                  </ThemedText>
                </View>
                
                <View style={styles.messageRow}>
                  <ThemedText 
                    style={[styles.lastMessage, { 
                      color: chat.unreadCount > 0 ? colors.text : colors.icon,
                      fontWeight: chat.unreadCount > 0 ? '600' : '400',
                      opacity: isSeller && !hasSub ? 0.55 : 1,
                    }]} 
                    numberOfLines={1}
                  >
                    {isSeller && !hasSub ? 'Tap to pay RWF 5,000 and unlock buyer info' : chat.lastMessage}
                  </ThemedText>
                  
                  {chat.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                      <ThemedText style={styles.unreadText}>{chat.unreadCount}</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
          </>
        )}
        </View>
        </View>
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
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topHeaderInner: {
    width: '100%',
    paddingHorizontal: 16,
  },
  headerRow: {
    width: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    padding: 16,
    paddingBottom: 200,
  },
  backBtn: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtnAbsolute: {
    position: 'absolute',
    left: 0,
  },
  headerTitle: {
    fontSize: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerContent: {
    flex: 1,
  },
  subscribeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  browseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
    textAlign: 'right',
  },
  vehicleContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleRef: {
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  webScrollContent: {
    paddingVertical: 24,
    paddingBottom: 200,
  },
});
