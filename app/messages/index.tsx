import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchConversations, type Conversation } from '@/lib/api-messages';
import { getAuthUser, getUserType, type UserType } from '@/lib/userPreference';

export default function MessagesScreen() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = t('messages.pageTitle');
    }
  }, [t]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const [userType, setUserType] = useState<UserType>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authUser = await getAuthUser();
      if (!authUser) {
        setConversations([]);
        setUserType(null);
        setError('Authentication required');
        return;
      }

      const [conversationsRes, type] = await Promise.all([
        fetchConversations(),
        getUserType(),
      ]);
      setConversations(conversationsRes.data.conversations);
      setUserType(type);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      setError(message);
      if (/missing auth token|unauthorized|not authenticated|authentication required|401/i.test(message)) {
        setConversations([]);
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
      return { name: conv.sellerName, phone: conv.sellerPhone, email: conv.sellerEmail, type: t('messages.seller') };
    } else {
      return { name: conv.buyerName, phone: conv.buyerPhone, email: conv.buyerEmail, type: t('messages.buyer') };
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
          <View style={[styles.topHeaderInner, desktopInnerWidth]}> 
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={22} color={colors.text} />
              </TouchableOpacity>
              <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('messages.title')}</ThemedText>
           
            </View>
          </View>
        </View>
        <View style={[styles.centerContent, desktopOuterPadding]}>
          <ThemedText>{t('messages.loading')}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
        <View style={[styles.topHeaderInner, desktopInnerWidth]}> 
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="chevron.left" size={22} color={colors.text} />
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('messages.title')}</ThemedText>
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
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>{t('messages.loginRequired')}</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>{t('messages.loginPrompt')}</ThemedText>
            <TouchableOpacity style={[styles.browseBtn, { backgroundColor: colors.primary }]} onPress={goToLogin}>
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{t('messages.login')}</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol name="message.fill" size={32} color={colors.primary} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>{t('messages.noMessagesYet')}</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: colors.icon }]}>
              {userType === 'buyer' 
                ? t('messages.emptyBuyer')
                : t('messages.emptySeller')
              }
            </ThemedText>
            {userType === 'buyer' && (
              <TouchableOpacity 
                style={[styles.browseBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/explore')}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{t('messages.browseVehicles')}</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Conversation List */}
        {conversations.map((chat) => {
          const partner = getChatPartner(chat);
          
          return (
            <TouchableOpacity 
              key={chat.id} 
              style={[styles.chatItem, { borderBottomColor: colors.border }]}
              onPress={() => handleChatPress(chat.id)}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                  <IconSymbol name="person.fill" size={22} color={colors.icon} />
                </View>
                {chat.unreadCount > 0 && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.nameRow}>
                    <ThemedText style={[styles.userName, chat.unreadCount > 0 && { fontWeight: '700' }]} numberOfLines={1}>
                      {partner.name}
                    </ThemedText>
                    {partner.phone && (
                      <ThemedText style={[styles.contactHint, { color: colors.icon }]} numberOfLines={1}>
                        {partner.phone}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.timeRow}>
                    {chat.unreadCount > 0 && (
                      <View style={[styles.unreadBadgeSmall, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.unreadTextSmall}>{chat.unreadCount}</ThemedText>
                      </View>
                    )}
                    <ThemedText style={[styles.time, { color: colors.icon }]}>
                      {formatTime(chat.lastMessageAt)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.subRow}>
                  <IconSymbol name="car.fill" size={10} color={colors.icon} />
                  <ThemedText style={[styles.vehicleRef, { color: colors.icon }]} numberOfLines={1}>
                    {chat.vehicleTitle}
                  </ThemedText>
                  <ThemedText style={[styles.subDot, { color: colors.icon }]}>•</ThemedText>
                  <ThemedText 
                    style={[styles.lastMessage, { 
                      color: chat.unreadCount > 0 ? colors.text : colors.icon,
                    }]} 
                    numberOfLines={1}
                  >
                    {chat.lastMessage}
                  </ThemedText>
                  {partner.email && (
                    <>
                      <ThemedText style={[styles.subDot, { color: colors.icon }]}>•</ThemedText>
                      <ThemedText style={[styles.contactHint, { color: colors.icon }]} numberOfLines={1}>
                        {partner.email}
                      </ThemedText>
                    </>
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
  },
  header: {
    paddingVertical: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  content: {
    padding: 16,
    paddingBottom: 200,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
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
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  contactHint: {
    fontSize: 11,
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  time: {
    fontSize: 11,
    textAlign: 'right',
  },
  unreadBadgeSmall: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleRef: {
    fontSize: 12,
    maxWidth: '30%',
  },
  subDot: {
    fontSize: 10,
  },
  lastMessage: {
    fontSize: 13,
    flexShrink: 1,
  },
  webScrollContent: {
    paddingVertical: 24,
    paddingBottom: 200,
  },
});
