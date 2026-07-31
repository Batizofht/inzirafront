import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, StatusBar, TextInput, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { verifyOtp, resendOtp } from '@/lib/userPreference';
import { isWeb } from '@/lib/platform';

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Verify OTP | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints (consistent with other pages)
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  // Auth pages use maxWidth to stay centered and not stretch
  const authFormMaxWidth = is2Xl ? 800 : isXl ? 760 : isLg ? 700 : 640;
  const webHorizontalPadding = is2Xl ? 40 : isXl ? 32 : isLg ? 28 : 24;

  const params = useLocalSearchParams<{ userId?: string; email?: string; role?: string; mode?: string }>();
  const userId = params.userId || '';
  const email = params.email ? decodeURIComponent(params.email) : '';
  const role = params.role || 'buyer';
  const mode = params.mode || 'register'; // 'register' | 'verify'

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = cleaned;
    setOtp(newOtp);
    setError('');

    if (cleaned && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError(t('auth.verifyOtp.errIncompleteCode'));
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await verifyOtp(userId, code);
      router.replace('/(tabs)/profile' as any);
    } catch (err: any) {
      setError(err?.message || t('auth.verifyOtp.errInvalidCode'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      await resendOtp(userId);
      setSuccess(t('auth.verifyOtp.newCodeSent'));
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || t('auth.verifyOtp.errResendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})[^@]+(@.+)/, '$1****$2')
    : t('auth.verifyOtp.yourEmail');

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('auth.verifyOtp.headerTitle')}</ThemedText>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(40, insets.bottom) }, isDesktopWeb && styles.webContent, isDesktopWeb && { maxWidth: authFormMaxWidth, paddingHorizontal: webHorizontalPadding, alignSelf: 'center' }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <IconSymbol name="envelope.fill" size={48} color={colors.primary} />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.title}>{t('auth.verifyOtp.checkEmail')}</ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          {t('auth.verifyOtp.codeSentTo')}{'\n'}
          <ThemedText style={{ fontWeight: '600', color: colors.text }}>{maskedEmail}</ThemedText>
        </ThemedText>

        {!!error && (
          <View style={[styles.messageBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={16} color="#EF4444" />
            <ThemedText style={[styles.messageText, { color: '#EF4444' }]}>{error}</ThemedText>
          </View>
        )}

        {!!success && (
          <View style={[styles.messageBox, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#16A34A" />
            <ThemedText style={[styles.messageText, { color: '#16A34A' }]}>{success}</ThemedText>
          </View>
        )}

        {/* OTP Input Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => { inputRefs.current[idx] = ref; }}
              style={[
                styles.otpBox,
                {
                  backgroundColor: colors.card,
                  borderColor: digit ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={idx === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isLoading ? colors.border : colors.primary }]}
          onPress={handleVerify}
          disabled={isLoading || otp.join('').length < 6}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? t('auth.verifyOtp.verifying') : t('auth.verifyOtp.verifyEmailBtn')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendBtn, { opacity: countdown > 0 ? 0.5 : 1 }]}
          onPress={handleResend}
          disabled={countdown > 0 || isResending}
        >
          <ThemedText style={[styles.resendText, { color: colors.primary }]}>
            {isResending
              ? t('auth.verifyOtp.sending')
              : countdown > 0
              ? t('auth.verifyOtp.resendIn', { seconds: countdown })
              : t('auth.verifyOtp.resendCode')}
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={[styles.hint, { color: colors.icon }]}>
          {t('auth.verifyOtp.spamHint')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  webContent: { width: '100%' },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  messageText: { fontSize: 13, flex: 1 },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resendBtn: { marginTop: 20 },
  resendText: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 16, textAlign: 'center' },
});
