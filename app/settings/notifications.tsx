import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { isWeb } from '@/lib/platform';
import { getMyNotificationSettings, updateMyNotificationSettings } from '@/lib/api-notifications';

export default function SettingsNotificationsScreen() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = t('settings.notificationsPageTitle');
    }
  }, [t]);
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with contact/sell)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const isDark = theme === 'dark';
  const skeletonBase = isDark ? '#1F2937' : '#E5E7EB';
  
  const [pushNotif, setPushNotif] = useState<boolean | null>(null);
  const [emailNotif, setEmailNotif] = useState<boolean | null>(null);
  const [marketing, setMarketing] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const isLoaded = pushNotif !== null && emailNotif !== null && marketing !== null;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getMyNotificationSettings();
        if (mounted) {
          setPushNotif(res.data.settings.push);
          setEmailNotif(res.data.settings.email);
          setMarketing(res.data.settings.marketing);
        }
      } catch (e) {
        // keep defaults null -> shows disabled toggles
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async (next: Partial<{ push: boolean; email: boolean; marketing: boolean }>) => {
    try {
      setSaving(true);
      await updateMyNotificationSettings(next);
    } catch (e) {
      // rollbacks are not handled; server is source of truth on next load
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
        isDesktopWeb && [styles.webHeader, { paddingHorizontal: webPaddingHorizontal }]
      ]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('profile.notifications')}</ThemedText>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb} 
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && [styles.webScrollContent, { paddingHorizontal: webPaddingHorizontal }]]}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('settings.preferences')}</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>{t('settings.pushNotifications')}</ThemedText>
                <ThemedText style={[styles.subLabel, { color: colors.icon }]}>{t('settings.pushNotificationsDesc')}</ThemedText>
              </View>
              {isLoaded ? (
                <TouchableOpacity 
                  style={[styles.toggle, { backgroundColor: pushNotif ? colors.primary : colors.border, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => { const current = !!pushNotif; const val = !current; setPushNotif(val); save({ push: val }); }}
                >
                  <View style={[styles.toggleCircle, { transform: [{ translateX: (!!pushNotif) ? 16 : 2 }] }]} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggle, { backgroundColor: skeletonBase }]} />
              )}
            </View>
            <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>{t('settings.emailNotifications')}</ThemedText>
                <ThemedText style={[styles.subLabel, { color: colors.icon }]}>{t('settings.emailNotificationsDesc')}</ThemedText>
              </View>
              {isLoaded ? (
                <TouchableOpacity 
                  style={[styles.toggle, { backgroundColor: emailNotif ? colors.primary : colors.border, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => { const current = !!emailNotif; const val = !current; setEmailNotif(val); save({ email: val }); }}
                >
                  <View style={[styles.toggleCircle, { transform: [{ translateX: (!!emailNotif) ? 16 : 2 }] }]} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggle, { backgroundColor: skeletonBase }]} />
              )}
            </View>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.label}>{t('settings.marketingPromos')}</ThemedText>
                <ThemedText style={[styles.subLabel, { color: colors.icon }]}>{t('settings.marketingPromosDesc')}</ThemedText>
              </View>
              {isLoaded ? (
                <TouchableOpacity 
                  style={[styles.toggle, { backgroundColor: marketing ? colors.primary : colors.border, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={() => { const current = !!marketing; const val = !current; setMarketing(val); save({ marketing: val }); }}
                >
                  <View style={[styles.toggleCircle, { transform: [{ translateX: (!!marketing) ? 16 : 2 }] }]} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggle, { backgroundColor: skeletonBase }]} />
              )}
            </View>
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
