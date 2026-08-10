import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Toast } from '@/components/Toast';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { isWeb } from '@/lib/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getAuthUser, getAuthToken, setAuthSession } from '@/lib/userPreference';
import { apiRequest } from '@/lib/api-client';

export default function AccountScreen() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = t('settings.accountPageTitle');
    }
  }, [t]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with contact/sell)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState<{ title: string; body?: string; icon?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await getAuthUser();
        if (user) {
          setFullName(user.fullName || '');
          setPhone(user.phone || '');
          setEmail(user.email || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const res = await apiRequest<{ status: number; data: { profile: any } }>('/profile/me', { method: 'PATCH', auth: true, body: { fullName, email, phone } });
      const updated = res.data.profile;
      const token = await getAuthToken();
      const user = await getAuthUser();
      if (token && user) {
        await setAuthSession(token, { ...user, fullName: updated.fullName, email: updated.email, phone: updated.phone });
      }
      setToast({ title: t('settings.profileUpdated'), body: t('settings.profileUpdatedBody'), icon: 'checkmark.circle.fill' });
      setTimeout(() => router.back(), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.failedUpdateProfile');
      setToast({ title: t('settings.updateFailed'), body: message, icon: 'exclamationmark.circle.fill' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {!!toast && (
        <Toast
          visible={!!toast}
          title={toast.title}
          body={toast.body}
          icon={toast.icon}
          onHide={() => setToast(null)}
        />
      )}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && [styles.webHeader, { paddingHorizontal: webPaddingHorizontal }]]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('profile.accountDetails')}</ThemedText>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb} 
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && [styles.webScrollContent, { paddingHorizontal: webPaddingHorizontal }]]}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.personalInformation')}</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>{t('settings.fullName')}</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('settings.fullNamePlaceholder')}
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>{t('settings.email')}</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('settings.emailPlaceholder')}
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={styles.row}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>{t('settings.phoneNumber')}</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t('settings.phonePlaceholder')}
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={onSave} disabled={saving || loading}>
          {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>{t('settings.saveChanges')}</ThemedText>}
        </TouchableOpacity>
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
    paddingTop: 16,
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
    padding: 16,
  },
  input: {
    marginLeft: 16,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
});
