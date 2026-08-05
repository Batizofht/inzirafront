import { StyleSheet, TextInput, ScrollView, View, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/api-client';
import { isWeb } from '@/lib/platform';

export default function ReportScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Report | Inzira';
    }
  }, []);

  const params = useLocalSearchParams<{
    targetType?: 'vehicle' | 'other';
    targetId?: string;
    reason?: string;
    description?: string;
    subject?: string;
  }>();
  const insets = useSafeAreaInsets();
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
  const reportMaxWidth = is2Xl ? 980 : isXl ? 920 : isLg ? 840 : undefined;
  const initialTab = params.targetType === 'other' ? 'other' : 'vehicle';
  const REPORT_REASONS = t('legal.report.reasons', { returnObjects: true }) as string[];
  const [selectedReason, setSelectedReason] = useState<string>(String(params.reason || ''));
  const [description, setDescription] = useState(String(params.description || ''));
  const [targetId, setTargetId] = useState(String(params.targetId || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicle' | 'other'>(initialTab);
  const [subject, setSubject] = useState(String(params.subject || ''));

  const handleSubmit = async () => {
    if (!selectedReason) {
      if (Platform.OS === 'web') setFeedback({ type: 'error', message: t('legal.report.selectReasonError') });
      else Alert.alert('Validation', t('legal.report.selectReasonError'));
      return;
    }
    if (!description.trim()) {
      if (Platform.OS === 'web') setFeedback({ type: 'error', message: t('legal.report.descriptionRequiredError') });
      else Alert.alert('Validation', t('legal.report.descriptionRequiredError'));
      return;
    }
    if (activeTab === 'vehicle') {
      if (!targetId.trim()) {
        if (Platform.OS === 'web') setFeedback({ type: 'error', message: t('legal.report.vehicleIdRequiredError') });
        else Alert.alert('Validation', t('legal.report.vehicleIdRequiredError'));
        return;
      }
    } else {
      if (!subject.trim()) {
        if (Platform.OS === 'web') setFeedback({ type: 'error', message: t('legal.report.subjectRequiredError') });
        else Alert.alert('Validation', t('legal.report.subjectRequiredError'));
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await apiRequest('/reports', {
        method: 'POST',
        auth: true,
        body: {
          targetType: activeTab === 'vehicle' ? 'vehicle' : 'other',
          targetId: activeTab === 'vehicle' ? targetId.trim() : undefined,
          reason: selectedReason,
          description: description.trim(),
          subject: activeTab === 'other' ? subject.trim() : undefined,
        },
      });
      if (Platform.OS === 'web') setFeedback({ type: 'success', message: t('legal.report.submitSuccess') });
      else Alert.alert('Success', t('legal.report.submitSuccess'));
      setSelectedReason('');
      setDescription('');
      setTargetId('');
      setSubject('');
      // Keep user on page so they see success on web
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('legal.report.submitFailed');
      if (Platform.OS === 'web') setFeedback({ type: 'error', message: msg });
      else Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
        <View style={[styles.headerInner, isDesktopWeb && reportMaxWidth && { maxWidth: reportMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('legal.report.title')}</ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb}>
        <View style={isDesktopWeb && [{ paddingHorizontal: webPaddingHorizontal }]}>
          <View style={[styles.content, isDesktopWeb && reportMaxWidth && { maxWidth: reportMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {feedback && (
          <View style={[
            styles.banner,
            feedback.type === 'success' ? styles.bannerSuccess : styles.bannerError,
            { borderColor: colors.border, backgroundColor: feedback.type === 'success' ? (theme === 'dark' ? '#064e3b' : '#ecfdf5') : (theme === 'dark' ? '#7f1d1d' : '#fef2f2') }
          ]}>
            <ThemedText style={{ color: feedback.type === 'success' ? (theme === 'dark' ? '#a7f3d0' : '#065f46') : (theme === 'dark' ? '#fecaca' : '#991b1b') }}>
              {feedback.message}
            </ThemedText>
          </View>
        )}
        <View style={styles.section}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, { borderColor: colors.border, backgroundColor: activeTab === 'vehicle' ? colors.card : 'transparent' }]}
              onPress={() => setActiveTab('vehicle')}
            >
              <ThemedText style={[styles.tabText, { color: colors.text, fontWeight: activeTab === 'vehicle' ? '700' : '500' }]}>{t('legal.report.vehicleIssue')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, { borderColor: colors.border, backgroundColor: activeTab === 'other' ? colors.card : 'transparent' }]}
              onPress={() => setActiveTab('other')}
            >
              <ThemedText style={[styles.tabText, { color: colors.text, fontWeight: activeTab === 'other' ? '700' : '500' }]}>{t('legal.report.other')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'vehicle' ? (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.report.vehicleIdTitle')}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder={t('legal.report.vehicleIdPlaceholder')}
              placeholderTextColor={colors.icon}
              value={targetId}
              onChangeText={setTargetId}
            />
            <ThemedText style={[styles.hint, { color: colors.icon }]}> 
              {t('legal.report.vehicleIdHint')}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.report.subjectTitle')}</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder={t('legal.report.subjectPlaceholder')}
              placeholderTextColor={colors.icon}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.report.reasonTitle')}</ThemedText>
          <View style={styles.reasonGrid}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonChip,
                  {
                    backgroundColor: selectedReason === reason ? colors.primary : colors.card,
                    borderColor: selectedReason === reason ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <ThemedText
                  style={{
                    color: selectedReason === reason ? '#fff' : colors.text,
                    fontSize: 13,
                    fontWeight: selectedReason === reason ? '600' : '400',
                  }}
                >
                  {reason}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.report.descriptionTitle')}</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder={t('legal.report.descriptionPlaceholder')}
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <ThemedText style={styles.submitButtonText}>
            {isSubmitting ? t('legal.report.submitting') : t('legal.report.submitReport')}
          </ThemedText>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerSuccess: {},
  bannerError: {},
  submitButton: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 200,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
});
