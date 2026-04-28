import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions, Modal, TextInput, Pressable } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { isWeb } from '@/lib/platform';
import { getMyPrivacySettings, updateMyPrivacySettings } from '@/lib/api-privacy';
import { apiRequest } from '@/lib/api-client';
import { clearLocalAuthSession } from '@/lib/userPreference';

export default function PrivacyScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Privacy Settings | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with contact/sell)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const isDark = theme === 'dark';
  const skeletonBase = isDark ? '#1F2937' : '#E5E7EB';
  
  const [dataSharing, setDataSharing] = useState<boolean | null>(null);
  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const isLoaded = dataSharing !== null && twoFactor !== null;

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getMyPrivacySettings();
        if (mounted) {
          setDataSharing(res.data.settings.dataSharing);
          setTwoFactor(res.data.settings.twoFactor);
        }
      } catch {
        // keep null to show skeletons
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persist = async (next: Partial<{ dataSharing: boolean; twoFactor: boolean }>) => {
    try {
      setSaving(true);
      await updateMyPrivacySettings(next);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError(null);
    if (!currentPassword || !newPassword) {
      setPwdError('Please fill both fields');
      return;
    }
    try {
      await apiRequest('/profile/me/change-password', { method: 'PATCH', auth: true, body: { currentPassword, newPassword } });
      setShowPwdModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setPwdError(e?.message || 'Failed to change password');
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && [styles.webHeader, { paddingHorizontal: webPaddingHorizontal }]]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('profile.privacySec')}</ThemedText>
          {/* Change Password Modal */}
      <Modal transparent animationType="fade" visible={showPwdModal} onRequestClose={() => setShowPwdModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPwdModal(false)}>
          <Pressable style={[styles.modalContainer, { backgroundColor: colors.background }]} onPress={() => {}}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>Change Password</ThemedText>
            {pwdError && <ThemedText style={[styles.errorText, { color: '#DC2626' }]}>{pwdError}</ThemedText>}
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Current password"
              placeholderTextColor={colors.icon}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="New password"
              placeholderTextColor={colors.icon}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowPwdModal(false)}>
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleChangePassword}>
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Update</ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb} 
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && [styles.webScrollContent, { paddingHorizontal: webPaddingHorizontal }]]}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Security</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>Two-Factor Authentication</ThemedText>
                <ThemedText style={[styles.subLabel, { color: colors.icon }]}>Secure your account with OTP</ThemedText>
              </View>
              {isLoaded ? (
                <TouchableOpacity 
                  style={[styles.toggle, { backgroundColor: twoFactor ? colors.primary : colors.border, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => { const v = !Boolean(twoFactor); setTwoFactor(v); persist({ twoFactor: v }); }}
                >
                  <View style={[styles.toggleCircle, { transform: [{ translateX: Boolean(twoFactor) ? 16 : 2 }] }]} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggle, { backgroundColor: skeletonBase }]} />
              )}
            </View>
            <TouchableOpacity style={styles.row} onPress={() => setShowPwdModal(true)}>
              <ThemedText style={styles.label}>Change Password</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>Data Sharing</ThemedText>
                <ThemedText style={[styles.subLabel, { color: colors.icon }]}>Allow analytics to improve app</ThemedText>
              </View>
              {isLoaded ? (
                <TouchableOpacity 
                  style={[styles.toggle, { backgroundColor: dataSharing ? colors.primary : colors.border, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => { const v = !Boolean(dataSharing); setDataSharing(v); persist({ dataSharing: v }); }}
                >
                  <View style={[styles.toggleCircle, { transform: [{ translateX: Boolean(dataSharing) ? 16 : 2 }] }]} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggle, { backgroundColor: skeletonBase }]} />
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
          <ThemedText style={styles.deleteButtonText}>Delete Account</ThemedText>
        </TouchableOpacity>
      </ScrollView>
      {/* Delete Account Modal */}
      <Modal transparent animationType="fade" visible={showDeleteModal} onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={[styles.modalContainer, { backgroundColor: colors.background }]} onPress={() => {}}>
            <ThemedText type="defaultSemiBold" style={[styles.modalTitle, { color: colors.text }]}>Confirm Deletion</ThemedText>
            <ThemedText style={{ color: colors.icon, marginBottom: 12 }}>This will permanently delete your account and all associated data. This action cannot be undone.</ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowDeleteModal(false)} disabled={deleting}>
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#DC2626', opacity: deleting ? 0.7 : 1 }]} onPress={async () => {
                setDeleting(true);
                try {
                  await apiRequest('/profile/me', { method: 'DELETE', auth: true });
                  await clearLocalAuthSession();
                  router.replace('/auth/login');
                } catch (e) {
                  // Optionally show feedback
                } finally {
                  setDeleting(false);
                }
              }}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{deleting ? 'Deleting...' : 'Delete'}</ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  rowText: {
    flex: 1,
    paddingRight: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingVertical: 24,
  },
  webHeader: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 2,
  },
});
