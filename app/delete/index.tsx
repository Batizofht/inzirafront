import { StyleSheet, ScrollView, View, TouchableOpacity, TextInput, Platform, StatusBar, useWindowDimensions, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { getAuthUser } from '@/lib/userPreference';
import { useAuth } from '@/context/AuthContext';

type Step = 'info' | 'reason' | 'confirm' | 'done';

const DELETE_REASONS = [
  { id: 'not_useful', label: "I don't find it useful", icon: 'xmark.circle' },
  { id: 'privacy', label: 'Privacy concerns', icon: 'lock.fill' },
  { id: 'sold', label: 'I already sold / bought my vehicle', icon: 'checkmark.circle.fill' },
  { id: 'duplicate', label: 'I have a duplicate account', icon: 'person.2.fill' },
  { id: 'switching', label: 'Switching to another platform', icon: 'arrow.right.circle.fill' },
  { id: 'other', label: 'Other reason', icon: 'ellipsis.circle.fill' },
];

export default function DeleteAccountScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Delete Account | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;

  const [step, setStep] = useState<Step>('info');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const errorColor = isDark ? '#FCA5A5' : '#DC2626';

  useEffect(() => {
    getAuthUser().then(setAuthUser);
  }, []);

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return;
    try {
      setIsLoading(true);
      // TODO: replace with your actual delete-account API call
      // await apiRequest('/account/delete', { method: 'DELETE', auth: true, body: { reason: selectedReason, note: otherReason } });
      await new Promise((r) => setTimeout(r, 1800)); // simulate network
      setStep('done');
    } catch (err) {
      Alert.alert('Error', 'Could not delete your account. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoneLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=90' }}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(139,0,0,0.55)', 'rgba(0,0,0,0.75)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={[styles.heroTag, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
              <ThemedText style={styles.heroTagText}>Account Management</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Delete Account</ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              This action is permanent and cannot be undone
            </ThemedText>
          </View>
        </View>

        {/* Step Indicator */}
        {step !== 'done' && (
          <View style={[styles.stepIndicatorSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
            <View style={styles.stepIndicator}>
              {(['info', 'reason', 'confirm'] as Step[]).map((s, i) => {
                const stepIndex = ['info', 'reason', 'confirm'].indexOf(step);
                const thisIndex = i;
                const isActive = step === s;
                const isDone = stepIndex > thisIndex;
                return (
                  <View key={s} style={styles.stepIndicatorItem}>
                    <View style={[
                      styles.stepDot,
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                      isDone && { backgroundColor: '#10B981', borderColor: '#10B981' },
                      !isActive && !isDone && { backgroundColor: 'transparent', borderColor: colors.border },
                    ]}>
                      {isDone
                        ? <IconSymbol name="checkmark" size={12} color="#fff" />
                        : <ThemedText style={[styles.stepDotText, { color: isActive ? '#fff' : colors.icon }]}>{i + 1}</ThemedText>
                      }
                    </View>
                    <ThemedText style={[styles.stepLabel, { color: isActive ? colors.primary : colors.icon }]}>
                      {s === 'info' ? 'What Happens' : s === 'reason' ? 'Reason' : 'Confirm'}
                    </ThemedText>
                    {i < 2 && <View style={[styles.stepLine, { backgroundColor: isDone ? '#10B981' : colors.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── STEP 1: INFO ── */}
        {step === 'info' && (
          <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
            <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.4)' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={errorColor} style={{ marginBottom: 10 }} />
              <ThemedText style={[styles.warningTitle, { color: errorColor }]}>Before You Continue</ThemedText>
              <ThemedText style={[styles.warningText, { color: colors.icon }]}>
                Deleting your account is permanent. Please read carefully what will be removed.
              </ThemedText>
            </View>

            <ThemedText type="defaultSemiBold" style={[styles.listHeading, { marginTop: 24 }]}>
              What will be permanently deleted:
            </ThemedText>
            {DELETED_DATA.map((item, index) => (
              <View key={index} style={[styles.dataRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.dataRowIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <IconSymbol name={item.icon} size={18} color={errorColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.dataRowTitle}>{item.title}</ThemedText>
                  <ThemedText style={[styles.dataRowDesc, { color: colors.icon }]}>{item.description}</ThemedText>
                </View>
              </View>
            ))}

            <ThemedText type="defaultSemiBold" style={[styles.listHeading, { marginTop: 24 }]}>
              What we retain (legally required):
            </ThemedText>
            {RETAINED_DATA.map((item, index) => (
              <View key={index} style={[styles.dataRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.dataRowIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.dataRowTitle}>{item.title}</ThemedText>
                  <ThemedText style={[styles.dataRowDesc, { color: colors.icon }]}>{item.description}</ThemedText>
                </View>
              </View>
            ))}

            {/* Alternative actions */}
            <View style={[styles.altCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 28 }]}>
              <ThemedText style={styles.altCardTitle}>Consider these alternatives</ThemedText>
              {ALTERNATIVES.map((alt, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.altItem, { borderTopColor: colors.border }, index === 0 && { borderTopWidth: 0 }]}
                  onPress={() => router.push(alt.route as any)}
                >
                  <View style={[styles.altItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <IconSymbol name={alt.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.altItemTitle}>{alt.title}</ThemedText>
                    <ThemedText style={[styles.altItemDesc, { color: colors.icon }]}>{alt.desc}</ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.back()}
              >
                <ThemedText style={[styles.btnSecondaryText, { color: colors.text }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnDanger, { backgroundColor: errorColor }]}
                onPress={() => setStep('reason')}
              >
                <ThemedText style={styles.btnDangerText}>I Understand, Continue</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 2: REASON ── */}
        {step === 'reason' && (
          <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Why are you leaving?</ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.icon }]}>
              Your feedback helps us improve Inzira for everyone.
            </ThemedText>

            <View style={styles.reasonsGrid}>
              {DELETE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { borderColor: errorColor, backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)' },
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                  >
                    <IconSymbol name={reason.icon as any} size={20} color={isSelected ? errorColor : colors.icon} />
                    <ThemedText style={[styles.reasonLabel, { color: isSelected ? errorColor : colors.text }]}>
                      {reason.label}
                    </ThemedText>
                    {isSelected && (
                      <View style={[styles.reasonCheck, { backgroundColor: errorColor }]}>
                        <IconSymbol name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedReason === 'other' && (
              <TextInput
                style={[styles.otherInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Tell us more (optional)..."
                placeholderTextColor={colors.icon}
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setStep('info')}
              >
                <ThemedText style={[styles.btnSecondaryText, { color: colors.text }]}>Back</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnDanger, { backgroundColor: errorColor, opacity: selectedReason ? 1 : 0.45 }]}
                onPress={() => selectedReason && setStep('confirm')}
                disabled={!selectedReason}
              >
                <ThemedText style={styles.btnDangerText}>Continue</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3: CONFIRM ── */}
        {step === 'confirm' && (
          <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
            <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: `rgba(239,68,68,0.5)` }]}>
              {authUser && (
                <View style={styles.confirmUserRow}>
                  <View style={[styles.confirmAvatar, { backgroundColor: errorColor }]}>
                    <ThemedText style={styles.confirmAvatarText}>
                      {(authUser.fullName || 'U')[0].toUpperCase()}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.confirmUserName}>{authUser.fullName}</ThemedText>
                    <ThemedText style={[styles.confirmUserSub, { color: colors.icon }]}>{authUser.phone || authUser.email}</ThemedText>
                  </View>
                </View>
              )}

              <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />

              <ThemedText style={[styles.confirmInstructLabel, { color: colors.icon }]}>
                Type <ThemedText style={{ fontWeight: '800', color: errorColor }}>DELETE</ThemedText> below to confirm
              </ThemedText>
              <TextInput
                style={[
                  styles.confirmInput,
                  {
                    backgroundColor: isDark ? '#1F1F1F' : '#F9F9F9',
                    borderColor: confirmText.toUpperCase() === 'DELETE' ? '#10B981' : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Type DELETE here"
                placeholderTextColor={colors.icon}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.finalWarning, { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)' }]}>
              <IconSymbol name="clock.fill" size={16} color={errorColor} />
              <ThemedText style={[styles.finalWarningText, { color: colors.icon }]}>
                Your data will be permanently deleted within <ThemedText style={{ fontWeight: '700', color: colors.text }}>30 days</ThemedText>. This cannot be reversed.
              </ThemedText>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setStep('reason')}
              >
                <ThemedText style={[styles.btnSecondaryText, { color: colors.text }]}>Back</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnDanger,
                  { backgroundColor: errorColor, opacity: confirmText.toUpperCase() === 'DELETE' && !isLoading ? 1 : 0.4 },
                ]}
                onPress={handleDelete}
                disabled={confirmText.toUpperCase() !== 'DELETE' || isLoading}
              >
                <ThemedText style={styles.btnDangerText}>
                  {isLoading ? 'Deleting...' : 'Permanently Delete Account'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === 'done' && (
          <View style={[styles.section, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
            <View style={[styles.doneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.doneIconWrap}>
                <IconSymbol name="checkmark.circle.fill" size={64} color="#10B981" />
              </View>
              <ThemedText style={styles.doneTitle}>Account Deletion Requested</ThemedText>
              <ThemedText style={[styles.doneSubtitle, { color: colors.icon }]}>
                Your account deletion has been queued. All your personal data will be permanently removed within 30 days.
                You will receive a confirmation email once the process is complete.
              </ThemedText>

              <View style={[styles.doneStepsCard, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: colors.border }]}>
                {DONE_STEPS.map((s, i) => (
                  <View key={i} style={[styles.doneStep, { borderTopColor: colors.border }, i === 0 && { borderTopWidth: 0 }]}>
                    <View style={[styles.doneStepNum, { backgroundColor: '#10B98120' }]}>
                      <ThemedText style={[styles.doneStepNumText, { color: '#10B981' }]}>{i + 1}</ThemedText>
                    </View>
                    <ThemedText style={[styles.doneStepText, { color: colors.icon }]}>{s}</ThemedText>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btnDoneBack, { backgroundColor: colors.primary }]}
                onPress={handleDoneLogout}
              >
                <ThemedText style={styles.btnDoneBackText}>Close & Logout</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <WebFooter />
      </ScrollView>
    </View>
  );
}

const DELETED_DATA = [
  { icon: 'person.fill', title: 'Profile & Account', description: 'Your name, phone number, email, profile photo, and all account settings.' },
  { icon: 'car.fill', title: 'Vehicle Listings', description: 'All your active and past vehicle listings, including photos and descriptions.' },
  { icon: 'message.fill', title: 'Messages & Chats', description: 'All conversations with buyers or sellers through our messaging system.' },
  { icon: 'heart.fill', title: 'Favorites', description: 'Your saved vehicles and shortlist.' },
  { icon: 'bell.fill', title: 'Notifications', description: 'All unread notifications and notification history.' },
  { icon: 'creditcard.fill', title: 'Subscription', description: 'Your active subscription plan will be cancelled immediately with no refund.' },
];

const RETAINED_DATA = [
  { icon: 'doc.text.fill', title: 'Transaction Records', description: 'Anonymised records of completed transactions for legal and financial compliance (up to 7 years).' },
  { icon: 'shield.fill', title: 'Fraud Prevention Logs', description: 'Anonymised signals to prevent re-registration of banned accounts.' },
];

const ALTERNATIVES = [
  { icon: 'bell.slash.fill', title: 'Pause Notifications', desc: 'Turn off all emails and push alerts without deleting your account.', route: '/settings/notifications' },
  { icon: 'eye.slash.fill', title: 'Hide Your Listings', desc: 'Make your listings private so they are not visible to buyers.', route: '/listings' },
  { icon: 'envelope.fill', title: 'Contact Support', desc: 'Let our team help resolve any issue you are experiencing.', route: '/contact' },
];

const DONE_STEPS = [
  'You are now logged out of all Inzira sessions.',
  'A confirmation email has been sent to your registered address.',
  'All personal data will be purged within 30 days.',
  'Anonymised transaction records are retained per legal requirements.',
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {},
  heroContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 400,
  },
  stepIndicatorSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 4,
  },
  stepLine: {
    width: 24,
    height: 2,
    marginHorizontal: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 6,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  listHeading: {
    fontSize: 15,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dataRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  dataRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  dataRowDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  altCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  altCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 12,
  },
  altItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  altItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  altItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  altItemDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnDanger: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  reasonsGrid: {
    gap: 10,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  reasonCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherInput: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
  },
  confirmUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  confirmAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  confirmUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  confirmUserSub: {
    fontSize: 13,
  },
  confirmDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  confirmInstructLabel: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  confirmInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  finalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  finalWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  doneCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  doneIconWrap: {
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  doneSubtitle: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  doneStepsCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  doneStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  doneStepNumText: {
    fontSize: 12,
    fontWeight: '700',
  },
  doneStepText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  btnDoneBack: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDoneBackText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});