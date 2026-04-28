import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions, Modal } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { isWeb } from '@/lib/platform';
import { deleteAllNotifications, deleteNotification, fetchNotifications, type Notification } from '@/lib/api-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { getAuthUser } from '@/lib/userPreference';

export default function NotificationsScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Notifications | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadNotifications = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      if (showLoader) setError(null);

      const authUser = await getAuthUser();
      if (!authUser) {
        setNotifications([]);
        setError('Authentication required');
        return;
      }

      const res = await fetchNotifications();
      setNotifications(res.data.notifications);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
      if (/missing auth token|unauthorized|not authenticated|authentication required|401/i.test(message)) {
        setNotifications([]);
      } else {
        console.error('Failed to load notifications:', err);
      }
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const openDeleteOneModal = (notification: Notification) => {
    setDeleteMode('single');
    setNotificationToDelete(notification);
    setDeleteModalVisible(true);
  };

  const openDeleteAllModal = () => {
    setDeleteMode('all');
    setNotificationToDelete(null);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteModalVisible(false);
    setNotificationToDelete(null);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);

      if (deleteMode === 'all') {
        await deleteAllNotifications();
        setNotifications([]);
      } else if (notificationToDelete) {
        await deleteNotification(notificationToDelete.id);
        setNotifications((prev) => prev.filter((item) => item.id !== notificationToDelete.id));
      }

      closeDeleteModal();
      setDeleteModalVisible(false);
    } catch (err) {
      console.error('Failed to delete notifications:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const goToLogin = () => {
    router.push('/auth/login' as any);
  };

  const isAuthError =
    !!error &&
    /missing auth token|unauthorized|not authenticated|authentication required|401/i.test(error);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(true);

      // Poll every 10 seconds while the screen is focused
      const interval = setInterval(() => {
        loadNotifications(false);
      }, 10000);

      return () => clearInterval(interval);
    }, [])
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return 'message.fill';
      case 'price': return 'bell.fill';
      case 'system': return 'checkmark.circle.fill';
      default: return 'bell.fill';
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Notifications</ThemedText>
        </View>
        {!!notifications.length && !isLoading && !isAuthError && (
          <TouchableOpacity style={[styles.deleteAllBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={openDeleteAllModal}>
            <IconSymbol name="trash.fill" size={14} color="#DC2626" />
            <ThemedText style={styles.deleteAllText}>Delete All</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={isDesktopWeb && styles.webScrollContent}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.icon }}>Loading...</ThemedText>
          </View>
        ) : isAuthError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
              <IconSymbol name="person.fill" size={42} color={colors.icon} />
            </View>
            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>Login Required</ThemedText>
            <ThemedText style={{ color: colors.icon, textAlign: 'center', maxWidth: '80%', marginBottom: 16 }}>
              To see your notifications login first
            </ThemedText>
            <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={goToLogin}>
              <ThemedText style={styles.loginButtonText}>Login</ThemedText>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.icon }}>{error}</ThemedText>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.fill" size={48} color={colors.icon} style={{ marginBottom: 16 }} />
            <ThemedText style={{ color: colors.icon, fontSize: 16 }}>No new notifications</ThemedText>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity 
              key={notif.id} 
              style={[
                styles.notifItem, 
                { borderBottomColor: colors.border, backgroundColor: notif.isRead ? colors.background : `${colors.primary}10` }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol name={getIcon(notif.type)} size={24} color={colors.primary} />
              </View>
              
              <View style={styles.notifInfo}>
                <View style={styles.notifHeader}>
                  <ThemedText style={[styles.notifTitle, { fontWeight: notif.isRead ? '500' : '700' }]} numberOfLines={1}>{notif.title}</ThemedText>
                  <ThemedText style={[styles.time, { color: colors.icon }]}>{notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}</ThemedText>
                </View>
                <ThemedText style={[styles.message, { color: notif.isRead ? colors.icon : colors.text }]} numberOfLines={2}>
                  {notif.body}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.deleteOneBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openDeleteOneModal(notif)}
              >
                <IconSymbol name="trash.fill" size={14} color="#DC2626" />
              </TouchableOpacity>
              
              {!notif.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal transparent animationType="fade" visible={deleteModalVisible} onRequestClose={closeDeleteModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            <View style={styles.modalHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#DC2626" />
              <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
                {deleteMode === 'all' ? 'Delete All Notifications' : 'Delete Notification'}
              </ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: colors.icon }]}>
                {deleteMode === 'all'
                  ? 'This action will remove all your notifications.'
                  : 'This action will remove this notification.'}
              </ThemedText>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <ThemedText style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { opacity: isDeleting ? 0.7 : 1 }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                <ThemedText style={styles.confirmDeleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteAllText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifInfo: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
    marginTop: 6,
  },
  deleteOneBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loginButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  webScrollContent: {
    paddingHorizontal: 400,
    paddingVertical: 24,
  },
  webHeader: {
    paddingHorizontal: 400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
