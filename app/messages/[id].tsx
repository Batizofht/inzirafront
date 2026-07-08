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
        <View style={[
          styles.messageBubble,
          isMe ? styles.myBubble : styles.theirBubble,
          { backgroundColor: isMe ? colors.primary : (isDark ? '#1e293b' : '#ffffff') }
        ]}>
          <ThemedText style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
            {item.content}
          </ThemedText>
          <ThemedText style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.65)' : colors.icon }]}>
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

  // Determine who we're chatting with - use conversation data directly (no gates)
  const chatPartner = userType === 'buyer' 
    ? { name: conversation.sellerName, phone: conversation.sellerPhone, email: conversation.sellerEmail, type: 'Seller' }
    : { name: conversation.buyerName, phone: conversation.buyerPhone, email: conversation.buyerEmail, type: 'Buyer' };

  const chatBg = isDark ? '#0f1729' : '#e8eef5';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: chatBg, paddingTop: insets.top }]}
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
            <ThemedText type="defaultSemiBold" style={styles.headerName} numberOfLines={1}>
              {chatPartner.name}
            </ThemedText>
            <View style={styles.headerMetaRow}>
              <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]} numberOfLines={1}>
                {chatPartner.email || chatPartner.type}
              </ThemedText>
              {chatPartner.email && (
                <ThemedText style={[styles.headerVehicleRef, { color: colors.icon }]} numberOfLines={1}>
                  • {conversation.vehicleTitle}
                </ThemedText>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.vehicleBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => router.push(`/vehicle/${conversation.vehicleId}`)}
          >
            <IconSymbol name="car.fill" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={[styles.messagesContainer, { backgroundColor: chatBg }, desktopOuterPadding]}>
        <View style={[styles.messagesInner, desktopInnerWidth]}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messagesList, isDesktopWeb && styles.webMessagesList]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>
      </View>

      {/* Input */}
      <View style={[styles.inputContainer, desktopOuterPadding, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
        <View style={[styles.inputInner, desktopInnerWidth]}>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f3f5', color: colors.text, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.icon}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { 
              backgroundColor: inputText.trim() ? colors.primary : (isDark ? '#334155' : '#d1d5db')
            }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  backBtn: {
    padding: 6,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerVehicleRef: {
    fontSize: 12,
    flexShrink: 1,
  },
  vehicleBtn: {
    padding: 8,
    borderRadius: 10,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesInner: {
    flex: 1,
    width: '100%',
  },
  messagesList: {
    padding: 12,
    paddingBottom: 4,
  },
  messageContainer: {
    marginBottom: 6,
    maxWidth: '78%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMessagesList: {
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webLoadingContainer: {},
});
