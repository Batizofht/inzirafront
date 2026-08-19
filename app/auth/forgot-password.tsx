import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { requestPasswordReset, resetPassword } from '@/lib/userPreference';
import { isWeb } from '@/lib/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Account recovery, in two steps on one screen: ask for the code, then use it.
 *
 * Kept as a single screen deliberately - the code lands in the user's inbox
 * seconds after step one, and pushing a second route would lose the email they
 * just typed if they navigated back.
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const isDesktopWeb = isWeb && width >= 768;

  // Same ladder as the other auth screens so this does not stretch on desktop.
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const authHeaderMaxWidth = is2Xl ? 1200 : isXl ? 1120 : isLg ? 1000 : 900;
  const authFormMaxWidth = is2Xl ? 800 : isXl ? 760 : isLg ? 700 : 640;
  const webHorizontalPadding = is2Xl ? 40 : isXl ? 32 : isLg ? 28 : 24;

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'otp' | 'password' | null>(null);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError(t('auth.forgotPassword.emailRequired'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const message = await requestPasswordReset(email.trim());
      // The backend answers the same way for unknown addresses on purpose, so
      // move to step two regardless rather than revealing whether it existed.
      setNotice(message || t('auth.forgotPassword.codeSent'));
      setStep('reset');
    } catch (err: any) {
      setError(err?.message || t('auth.forgotPassword.requestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp.trim() || !newPassword) {
      setError(t('auth.forgotPassword.allFieldsRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('auth.forgotPassword.passwordTooShort'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      // resetPassword stores the new session, so land them signed in.
      await refreshUser();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      setError(err?.message || t('auth.forgotPassword.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputWrapperStyle = (field: 'email' | 'otp' | 'password') => [
    styles.inputWrapper,
    {
      backgroundColor: colors.card,
      borderColor: focusedField === field ? colors.primary : colors.border,
      borderWidth: focusedField === field ? 2 : 1,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border },
          isDesktopWeb && {
            width: '100%',
            maxWidth: authHeaderMaxWidth,
            alignSelf: 'center',
            paddingHorizontal: webHorizontalPadding,
          },
        ]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/login-form' as any))}
          style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {t('auth.forgotPassword.headerTitle')}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDesktopWeb && styles.webContent,
          isDesktopWeb && { maxWidth: authFormMaxWidth, paddingHorizontal: webHorizontalPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <IconSymbol name="lock.fill" size={48} color={colors.primary} />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.title}>
          {step === 'request' ? t('auth.forgotPassword.title') : t('auth.forgotPassword.resetTitle')}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          {step === 'request'
            ? t('auth.forgotPassword.subtitle')
            : t('auth.forgotPassword.resetSubtitle', { email: email.trim() })}
        </ThemedText>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        {!error && !!notice && step === 'reset' && (
          <View style={[styles.noticeBox, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
            <IconSymbol name="envelope.fill" size={18} color={colors.primary} />
            <ThemedText style={[styles.noticeText, { color: colors.text }]}>{notice}</ThemedText>
          </View>
        )}

        {step === 'request' ? (
          <>
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                {t('auth.forgotPassword.emailLabel')}
              </ThemedText>
              <View style={inputWrapperStyle('email')}>
                <IconSymbol
                  name="envelope.fill"
                  size={18}
                  color={focusedField === 'email' ? colors.primary : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.icon}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: isLoading ? colors.border : colors.primary }]}
              onPress={handleRequest}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendCode')}
              </ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                {t('auth.forgotPassword.codeLabel')}
              </ThemedText>
              <View style={inputWrapperStyle('otp')}>
                <IconSymbol
                  name="number"
                  size={18}
                  color={focusedField === 'otp' ? colors.primary : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text, letterSpacing: 4 }]}
                  placeholder="123456"
                  placeholderTextColor={colors.icon}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: colors.icon }]}>
                {t('auth.forgotPassword.newPasswordLabel')}
              </ThemedText>
              <View style={inputWrapperStyle('password')}>
                <IconSymbol
                  name="lock.fill"
                  size={18}
                  color={focusedField === 'password' ? colors.primary : colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={colors.icon} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: isLoading ? colors.border : colors.primary }]}
              onPress={handleReset}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? t('auth.forgotPassword.resetting') : t('auth.forgotPassword.resetBtn')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => { setStep('request'); setError(''); setNotice(''); }}
              disabled={isLoading}
            >
              <ThemedText style={[styles.linkText, { color: colors.primary }]}>
                {t('auth.forgotPassword.resendCode')}
              </ThemedText>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <ThemedText style={[styles.dividerText, { color: colors.icon }]}>
            {t('auth.forgotPassword.rememberedIt')}
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: colors.primary }]}
          onPress={() => router.replace('/auth/login-form' as any)}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.outlineButtonText, { color: colors.primary }]}>
            {t('auth.forgotPassword.backToLogin')}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
  },
  webContent: { width: '100%', alignSelf: 'center', paddingHorizontal: 24 },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: '#991B1B', fontSize: 14, flex: 1 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  noticeText: { fontSize: 14, flex: 1 },
  formGroup: { width: '100%', marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  eyeBtn: { padding: 6 },
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { marginTop: 16, padding: 8 },
  linkText: { fontSize: 14, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 28,
    gap: 12,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13 },
  outlineButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: { fontSize: 16, fontWeight: '600' },
});
