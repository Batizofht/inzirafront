import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { blockUser, submitContentReport, type ReportTargetType } from '@/lib/api-moderation';
import { isLoggedIn } from '@/lib/userPreference';

type Step = 'menu' | 'report' | 'block' | 'done';

export type ReportBlockSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The user who would be reported / blocked. */
  user: { id: string; name?: string | null } | null;
  /**
   * What is being flagged. Defaults to the user themselves; pass a listing or
   * a single message to flag that specific piece of content.
   */
  content?: { type: ReportTargetType; id: string };
  /** Extra context recorded with a block, so moderators can see where it came from. */
  context?: { vehicleId?: string; conversationId?: string };
  /** Called after a successful block (e.g. to leave the blocked user's screen). */
  onBlocked?: () => void;
  /** Open straight on the report form instead of the menu. */
  initialStep?: 'menu' | 'report';
};

const REASON_KEYS = ['spam', 'harassment', 'offensive', 'sexual', 'fraud', 'other'] as const;

/**
 * Report / block sheet for user-generated content (App Store guideline 1.2):
 * lets anyone flag objectionable content and block an abusive user. Blocking
 * hides the user's listings and chats immediately and notifies the moderation
 * team, which acts on reports within 24 hours.
 */
export function ReportBlockSheet({
  visible,
  onClose,
  user,
  content,
  context,
  onBlocked,
  initialStep = 'menu',
}: ReportBlockSheetProps) {
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(initialStep);
  const [reason, setReason] = useState<(typeof REASON_KEYS)[number] | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setStep(initialStep);
      setReason(null);
      setDetails('');
      setError('');
      setBusy(false);
    }
  }, [visible, initialStep]);

  const name = user?.name || t('moderation.thisUser');
  const target = content ?? (user ? { type: 'user' as const, id: user.id } : null);

  const requireLogin = async (): Promise<boolean> => {
    if (await isLoggedIn()) return true;
    onClose();
    router.push('/auth/login' as any);
    return false;
  };

  const handleSubmitReport = async () => {
    if (!target || !reason) {
      setError(t('moderation.chooseReason'));
      return;
    }
    if (!(await requireLogin())) return;
    setBusy(true);
    setError('');
    try {
      await submitContentReport({
        targetType: target.type,
        targetId: target.id,
        reason: t(`moderation.reasons.${reason}`),
        description: details.trim() || undefined,
      });
      setDoneMessage(t('moderation.reportSent'));
      setStep('done');
    } catch (err: any) {
      setError(err?.message || t('moderation.reportFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    if (!(await requireLogin())) return;
    setBusy(true);
    setError('');
    try {
      await blockUser(user.id, context);
      setDoneMessage(t('moderation.blockedDone', { name }));
      setStep('done');
      onBlocked?.();
    } catch (err: any) {
      setError(err?.message || t('moderation.blockFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reportTitle =
    target?.type === 'vehicle'
      ? t('moderation.reportListing')
      : target?.type === 'message'
        ? t('moderation.reportMessage')
        : t('moderation.reportUser', { name });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(20, insets.bottom + 12) },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {step === 'menu' && (
            <>
              <ThemedText type="defaultSemiBold" style={styles.title}>{t('moderation.safetyOptions')}</ThemedText>
              <TouchableOpacity style={[styles.option, { borderColor: colors.border }]} onPress={() => setStep('report')}>
                <IconSymbol name="flag.fill" size={20} color="#DC2626" />
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionTitle}>{reportTitle}</ThemedText>
                  <ThemedText style={[styles.optionDesc, { color: colors.icon }]}>{t('moderation.reportDesc')}</ThemedText>
                </View>
              </TouchableOpacity>
              {!!user && (
                <TouchableOpacity style={[styles.option, { borderColor: colors.border }]} onPress={() => setStep('block')}>
                  <IconSymbol name="nosign" size={20} color="#DC2626" />
                  <View style={styles.optionText}>
                    <ThemedText style={[styles.optionTitle, { color: '#DC2626' }]}>{t('moderation.blockUser', { name })}</ThemedText>
                    <ThemedText style={[styles.optionDesc, { color: colors.icon }]}>{t('moderation.blockDesc')}</ThemedText>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancel} onPress={onClose}>
                <ThemedText style={{ color: colors.icon, fontWeight: '600' }}>{t('moderation.cancel')}</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === 'report' && (
            <>
              <ThemedText type="defaultSemiBold" style={styles.title}>{reportTitle}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.icon }]}>{t('moderation.whyReport')}</ThemedText>
              {REASON_KEYS.map((key) => {
                const selected = reason === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.reason,
                      { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}12` : 'transparent' },
                    ]}
                    onPress={() => setReason(key)}
                  >
                    <ThemedText style={{ flex: 1, fontSize: 14 }}>{t(`moderation.reasons.${key}`)}</ThemedText>
                    {selected && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder={t('moderation.detailsPlaceholder')}
                placeholderTextColor={colors.icon}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={1000}
              />
              {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#DC2626', opacity: busy || !reason ? 0.6 : 1 }]}
                onPress={handleSubmitReport}
                disabled={busy || !reason}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>{t('moderation.submitReport')}</ThemedText>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancel} onPress={initialStep === 'report' ? onClose : () => setStep('menu')} disabled={busy}>
                <ThemedText style={{ color: colors.icon, fontWeight: '600' }}>{t('moderation.cancel')}</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === 'block' && (
            <>
              <ThemedText type="defaultSemiBold" style={styles.title}>{t('moderation.blockConfirmTitle', { name })}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.icon }]}>{t('moderation.blockConfirmBody')}</ThemedText>
              {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#DC2626', opacity: busy ? 0.6 : 1 }]}
                onPress={handleBlock}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>{t('moderation.blockConfirm')}</ThemedText>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancel} onPress={() => setStep('menu')} disabled={busy}>
                <ThemedText style={{ color: colors.icon, fontWeight: '600' }}>{t('moderation.cancel')}</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.doneIcon}>
                <IconSymbol name="checkmark.circle.fill" size={44} color="#16A34A" />
              </View>
              <ThemedText style={[styles.subtitle, { textAlign: 'center', color: colors.text }]}>{doneMessage}</ThemedText>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
                <ThemedText style={styles.primaryBtnText}>{t('moderation.done')}</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 18, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12, marginTop: 2 },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
    marginTop: 4,
  },
  error: { color: '#DC2626', fontSize: 13, marginTop: 10 },
  primaryBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { alignItems: 'center', paddingVertical: 14 },
  doneIcon: { alignItems: 'center', marginVertical: 10 },
});
