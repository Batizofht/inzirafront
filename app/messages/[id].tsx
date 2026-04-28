import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  fetchConversation,
  sendMessage as apiSendMessage,
  type Message,
  type Conversation,
} from '@/lib/api-messages';
import { getUserType, type UserType } from '@/lib/userPreference';
import { fetchMySubscription, hasActiveSubscription, subscribeToPlan } from '@/lib/api-subscriptions';
import { isWeb } from '@/lib/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Chat | Inzira';
    }
  }, []);

  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with SearchScreen)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const chatMaxWidth = is2Xl ? 980 : isXl ? 920 : isLg ? 840 : undefined;
  const desktopOuterPadding: ViewStyle | undefined = isDesktopWeb
    ? { paddingHorizontal: webPaddingHorizontal }
    : undefined;
  const desktopInnerWidth: ViewStyle | undefined = isDesktopWeb
    ? { width: '100%', alignSelf: 'center' as const, ...(chatMaxWidth ? { maxWidth: chatMaxWidth } : {}) }
    : undefined;
  const listRef = useRef<FlatList>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [canReply, setCanReply] = useState(true);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);

  const handleMockSubscriptionPayment = async () => {
    if (isProcessingSubscription) return;

    try {
      setIsProcessingSubscription(true);
      await subscribeToPlan('basic');
      setCanReply(true);
      if (!isWeb) {
        Alert.alert('Payment Successful', 'Subscription activated. You can now reply to messages.');
      } else {
        window.alert('Subscription activated. You can now reply to messages.');
      }
    } catch (error: any) {
      if (!isWeb) {
        Alert.alert('Payment Failed', error?.message || 'Unable to process mock payment.');
      } else {
        window.alert(error?.message || 'Unable to process mock payment.');
      }
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    setIsLoading(true);

    if (!conversationId) {
      setIsLoading(false);
      setLoadError('Invalid conversation link');
      return;
    }

    setLoadError(null);
    try {
      const [type, convRes] = await Promise.all([
        getUserType(),
        fetchConversation(conversationId),
      ]);
      setUserType(type);

      if (type === 'seller') {
        const subRes = await fetchMySubscription().catch(() => ({ data: { subscription: null } }));
        setCanReply(hasActiveSubscription(subRes.data.subscription));
      }

      setConversation(convRes.data.conversation);
      setMessages(convRes.data.messages);
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setConversation(null);
      setMessages([]);
      setLoadError(err?.message || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversation) return;

    if (userType === 'seller' && !canReply) {
      Alert.alert(
        'Subscription Required',
        'Pay RWF 5,000 to view buyer info and reply to messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay Now', onPress: handleMockSubscriptionPayment },
        ]
      );
      return;
    }

    const content = inputText.trim();
    setInputText('');
    const temporaryMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: temporaryMessageId,
      conversationId: conversation.id,
      senderId: userType === 'seller' ? conversation.sellerId : conversation.buyerId,
      senderRole: userType === 'seller' ? 'seller' : 'buyer',
      content,
      createdAt: new Date().toISOString(),
      isRead: true,
      seen: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 0);

    try {
      const res = await apiSendMessage(conversation.id, content);
      setConversation((prev) => (prev ? { ...prev, ...res.data.conversation } : res.data.conversation));
      setMessages((prev) => {
        const replaced = prev.map((msg) => (msg.id === temporaryMessageId ? res.data.message : msg));
        const hasServerMessage = replaced.some((msg) => msg.id === res.data.message.id);
        return hasServerMessage ? replaced : [...replaced, res.data.message];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages((prev) => prev.filter((msg) => msg.id !== temporaryMessageId));
      setInputText(content);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderRole === userType;
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, {
          backgroundColor: isMe ? colors.primary : colors.card,
          borderColor: isMe ? colors.primary : colors.border,
        }]}>
          <ThemedText style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
            {item.content}
          </ThemedText>
          <ThemedText style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.icon }]}>
            {formatTime(item.createdAt)}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, isDesktopWeb && [styles.webLoadingContainer, { paddingHorizontal: webPaddingHorizontal }], isDesktopWeb && { maxWidth: chatMaxWidth, alignSelf: 'center' }]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={[styles.loadingContainer, isDesktopWeb && [styles.webLoadingContainer, { paddingHorizontal: webPaddingHorizontal }], isDesktopWeb && { maxWidth: chatMaxWidth, alignSelf: 'center' }]}> 
          <ThemedText>{loadError || 'Conversation not found'}</ThemedText>
        </View>
      </View>
    );
  }

  const insets = useSafeAreaInsets()

  // Determine who we're chatting with
  const chatPartner = userType === 'buyer' 
    ? { name: conversation.sellerName, type: 'Seller' }
    : { name: conversation.buyerName, type: 'Buyer' };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background ,paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, desktopOuterPadding, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.headerInner, desktopInnerWidth]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <ThemedText type="defaultSemiBold" style={styles.headerName}>
              {chatPartner.name}
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
              {chatPartner.type} • {conversation.vehicleTitle}
            </ThemedText>
          </View>

          <TouchableOpacity 
            style={styles.vehicleBtn}
            onPress={() => router.push(`/vehicle/${conversation.vehicleId}`)}
          >
            <IconSymbol name="car.fill" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={[styles.messagesContainer, desktopOuterPadding]}>
        <View style={[styles.messagesInner, desktopInnerWidth]}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messagesList, isDesktopWeb && styles.webMessagesList]}
            showsVerticalScrollIndicator={isDesktopWeb}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>
      </View>

      {/* Subscription Warning for Seller */}
      {userType === 'seller' && !canReply && (
        <View style={desktopOuterPadding}>
          <View style={[styles.subscriptionBanner, desktopInnerWidth, { backgroundColor: `${colors.primary}15`, borderColor: colors.border }]}> 
            <IconSymbol name="lock.fill" size={16} color={colors.primary} />
            <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
              Pay RWF 5,000 to unlock buyer info and reply
            </ThemedText>
            <TouchableOpacity 
              style={[styles.subscribeBtn, { backgroundColor: colors.primary, opacity: isProcessingSubscription ? 0.7 : 1 }]}
              onPress={handleMockSubscriptionPayment}
              disabled={isProcessingSubscription}
            >
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{isProcessingSubscription ? 'Processing...' : 'Pay Now'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, desktopOuterPadding, { borderTopColor: colors.border, backgroundColor: colors.background,paddingBottom:insets.bottom }]}>
        <View style={[styles.inputInner, desktopInnerWidth]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder={canReply ? "Type a message..." : "Subscribe to reply..."}
            placeholderTextColor={colors.icon}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={canReply || userType === 'buyer'}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { 
              backgroundColor: inputText.trim() && (canReply || userType === 'buyer') ? colors.primary : colors.border 
            }]}
            onPress={handleSend}
            disabled={!inputText.trim() || (userType === 'seller' && !canReply)}
          >
            <IconSymbol name="arrow.up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  backBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerName: {
    fontSize: 17,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  vehicleBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesInner: {
    flex: 1,
    width: '100%',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  subscriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  subscribeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    width: '100%',
    paddingBottom:10
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
        marginBottom:10
  },
  webMessagesList: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webLoadingContainer: {
    // padding applied dynamically
  },
});
