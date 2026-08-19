import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { isWeb } from '@/lib/platform';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyContactRequests, type ContactRequestResponse } from '@/lib/api-contact-requests';
import { fetchConversations, startConversation, type Conversation } from '@/lib/api-messages';
import { resolveImageUrl } from '@/lib/image-url';

export default function OrderScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'My Orders | Inzira';
    }
  }, []);

  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Same breakpoint ladder the rest of the app uses. A flat 400px of padding
  // from 768px up collapsed the content column to almost nothing on a laptop.
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const [orders, setOrders] = useState<ContactRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // fetchMyContactRequests throws 'Missing auth token' before it ever hits the
  // network when there is no session. That was being swallowed into the generic
  // "no orders yet" empty state, so a signed-out visitor was told they had no
  // orders rather than that they needed to sign in.
  const [isAuthError, setIsAuthError] = useState(false);
  const skeletonBase = isDark ? '#1F2937' : '#E5E7EB';
  const skeletonSoft = isDark ? '#111827' : '#F3F4F6';

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsAuthError(false);
      const res = await fetchMyContactRequests({ scope: 'buyer', onlyActiveVehicle: true });
      setOrders(res.data.requests);
    } catch (err: any) {
      const message = String(err?.message || err);
      if (/missing auth token|unauthorized|not authenticated|authentication required|401/i.test(message)) {
        setIsAuthError(true);
      } else {
        console.error('Failed to load buyer orders:', err);
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const goToVehicle = (id: string) => {
    const href = `/vehicle/${id}` as any;
    router.push(href);
  };

  const handleStartChat = async (vehicleId: string, sellerId: string) => {
    try {
      // Find existing conversation for this vehicle and seller
      const conversationsRes = await fetchConversations();
      const existingConversation = conversationsRes.data.conversations.find(
        (conv: Conversation) => conv.vehicleId === vehicleId && conv.sellerId === sellerId
      );

      if (existingConversation) {
        // Navigate to existing conversation
        router.push(`/messages/${existingConversation.id}`);
        return;
      }

      // No thread yet. Dropping the user on the messages list left them staring
      // at an empty screen wondering where the seller went - open the thread the
      // button promised instead.
      const created = await startConversation(
        vehicleId,
        t('vehicleDetails.buyIntentMessage', { title: '' }).trim() || 'Hi, I have a question about this vehicle.',
      );
      const newId = created?.data?.conversation?.id;
      router.push(newId ? (`/messages/${newId}` as any) : ('/messages' as any));
    } catch (err) {
      console.error('Failed to open conversation:', err);
      router.push(`/messages`);
    }
  };

  const statusMeta = (status: ContactRequestResponse['status']) => {
    if (status === 'approved') {
      return {
        label: t('legal.order.seenBySeller'),
        helper: t('legal.order.seenBySellerHelper'),
        bg: '#D4EDDA',
        text: '#155724',
      };
    }
    if (status === 'rejected') {
      return {
        label: t('legal.order.declined'),
        helper: t('legal.order.declinedHelper'),
        bg: '#F8D7DA',
        text: '#721C24',
      };
    }
    return {
      label: t('legal.order.waitingForSeller'),
      helper: t('legal.order.waitingForSellerHelper'),
      bg: '#FFF3CD',
      text: '#856404',
    };
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('legal.order.title')}</ThemedText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.webScrollContent,
          isDesktopWeb && { paddingHorizontal: webPaddingHorizontal },
        ]}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <View key={`order-skeleton-${idx}`} style={[styles.orderCard, { backgroundColor: colors.background, borderColor: colors.border }]}> 
              <View style={[styles.orderImage, { backgroundColor: skeletonSoft }]} />
              <View style={styles.orderInfo}>
                <View style={styles.orderHeader}>
                  <View style={[styles.skeletonLine, { width: 110, height: 20, borderRadius: 6, backgroundColor: skeletonBase, marginBottom: 0 }]} />
                  <View style={[styles.skeletonLine, { width: 70, height: 12, borderRadius: 6, backgroundColor: skeletonBase, marginBottom: 0 }]} />
                </View>
                <View style={[styles.skeletonLine, { width: '76%', height: 14, backgroundColor: skeletonBase }]} />
                <View style={[styles.skeletonLine, { width: '58%', height: 12, backgroundColor: skeletonBase }]} />
                <View style={styles.actionsRow}>
                  <View style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: skeletonSoft }]} />
                  <View style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: skeletonSoft }]} />
                </View>
              </View>
            </View>
          ))
        ) : isAuthError ? (
          <View style={styles.emptyState}>
            <IconSymbol name="person.fill" size={48} color={colors.icon} style={{ marginBottom: 16 }} />
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17, marginBottom: 6 }}>
              {t('legal.order.loginRequired')}
            </ThemedText>
            <ThemedText style={{ color: colors.icon, fontSize: 15, textAlign: 'center', marginBottom: 18 }}>
              {t('legal.order.loginPrompt')}
            </ThemedText>
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/auth/login' as any)}>
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{t('messages.login')}</ThemedText>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="car.fill" size={48} color={colors.icon} style={{ marginBottom: 16 }} />
            <ThemedText style={{ color: colors.icon, fontSize: 16 }}>{t('legal.order.emptyText')}</ThemedText>
          </View>
        ) : (
          orders.map((item) => {
            const vehicle = (item as any).vehicle as { title?: string; images?: string[] } | undefined;
            const meta = statusMeta(item.status);
            return (
              <TouchableOpacity key={item.id} style={[styles.orderCard, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => goToVehicle(item.vehicleId)}>
                <Image source={{ uri: resolveImageUrl(vehicle?.images?.[0]) }} style={styles.orderImage} contentFit="cover" />
                <View style={styles.orderInfo}>
                  <View style={styles.orderHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}> 
                      <ThemedText style={[styles.statusText, { color: meta.text }]}> 
                        {meta.label}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.dateText, { color: colors.icon }]}>{new Date(item.createdAt).toLocaleDateString()}</ThemedText>
                  </View>

                  <ThemedText style={styles.orderTitle} numberOfLines={2}>{vehicle?.title || item.vehicleTitle || t('legal.order.vehicleOrder')}</ThemedText>
                  <ThemedText style={[styles.orderHint, { color: colors.icon }]} numberOfLines={1}>{meta.helper}</ThemedText>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                      onPress={() => goToVehicle(item.vehicleId)}
                    >
                      <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>{t('legal.order.openCar')}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => handleStartChat(item.vehicleId, item.sellerId)}
                    >
                      <ThemedText style={[styles.actionBtnText, { color: '#fff' }]}>
                        {item.status === 'approved' ? t('legal.order.keepWriting') : t('legal.order.chatSeller')}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webHeader: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  orderCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 128,
  },
  orderImage: {
    width: 100,
    height: '100%',
  },
  orderInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-start',
    gap: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderHint: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonLine: {
    borderRadius: 6,
    marginBottom: 6,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  webScrollContent: {
    // Was a flat paddingHorizontal: 400 applied from 768px up, which left a
    // ~200px content column on a 1000px viewport. This is the same ladder the
    // rest of the app uses.
    paddingVertical: 24,
  },
  signInBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
