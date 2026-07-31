import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, StatusBar, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { useAuth } from '@/context/AuthContext';
import { RegisterSEO } from '@/components/page-meta';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { registerUser } from '@/lib/userPreference';
import { isWeb } from '@/lib/platform';

export default function RegisterScreen() {
  const { t } = useTranslation();
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

  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role === 'seller' ? 'seller' : 'buyer') as 'buyer' | 'seller';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'dealer' | 'company'>('individual');
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | 'confirmPassword' | null>(null);

  const isSeller = role === 'seller';

  const validate = () => {
    if (!fullName.trim()) return t('auth.register.errFullNameRequired');
    if (!email.trim()) return t('auth.register.errEmailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('auth.register.errEmailInvalid');
    if (password.length < 6) return t('auth.register.errPasswordLength');
    if (password !== confirmPassword) return t('auth.register.errPasswordMismatch');
    return null;
  };

  const handleRegister = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // if (isSeller && sellerType === 'individual') {
    //   try {
    //     const paymentResult = await subscribeToPlan({ planId: 'verification', amount: 5000 });
    //     if (!paymentResult.success) {
    //       setError('Payment required to proceed with verification.');
    //       return;
    //     }
    //   } catch (error) {
    //     setError('Payment failed. Please try again.');
    //     return;
    //   }
    // }

    setIsLoading(true);
    try {
      const result = await registerUser({ 
        fullName: fullName.trim(), 
        email: email.trim(), 
        password, 
        role,
        accountType,
        sellerType: isSeller ? (accountType === 'company' ? 'company' : accountType === 'dealer' ? 'individual' : undefined) : undefined,
        isBroker: accountType === 'dealer',
      });
      // Go to OTP verification
      router.push(
        `/auth/verify-otp?userId=${result.userId}&email=${encodeURIComponent(result.email)}&role=${result.role}&mode=register` as any
      );
    } catch (err: any) {
      setError(err?.message || t('auth.register.errRegistrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <RegisterSEO />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {t('auth.register.headerTitle')}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(60, insets.bottom) }, isDesktopWeb && styles.webContent, isDesktopWeb && { maxWidth: authFormMaxWidth, paddingHorizontal: webHorizontalPadding, alignSelf: 'center' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!isDesktopWeb}
      >
        <View style={[styles.roleBadge, { backgroundColor: isSeller ? `${colors.primary}15` : '#16A34A20', borderColor: isSeller ? colors.primary : '#16A34A' }]}>
          <IconSymbol name={isSeller ? 'plus.circle.fill' : 'car.fill'} size={16} color={isSeller ? colors.primary : '#16A34A'} />
          <ThemedText style={[styles.roleBadgeText, { color: isSeller ? colors.primary : '#16A34A' }]}>
            {isSeller ? t('auth.register.registeringAsSeller') : t('auth.register.registeringAsBuyer')}
          </ThemedText>
        </View>

        {isSeller && (
          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>{t('auth.register.accountTypeLabel')}</ThemedText>
            <View style={[styles.accountTypeTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {([
                { key: 'individual' as const, icon: 'person.fill', label: t('auth.register.accountTypeIndividual') },
                { key: 'dealer' as const, icon: 'briefcase.fill', label: t('auth.register.accountTypeDealer') },
                { key: 'company' as const, icon: 'building.2.fill', label: t('auth.register.accountTypeCompany') },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.accountTypeTab, {
                    backgroundColor: accountType === opt.key ? colors.primary : 'transparent',
                  }]}
                  onPress={() => setAccountType(opt.key)}
                  activeOpacity={0.7}
                >
                  <IconSymbol name={opt.icon as any} size={16} color={accountType === opt.key ? '#fff' : colors.icon} />
                  <ThemedText style={[styles.accountTypeTabText, { color: accountType === opt.key ? '#fff' : colors.text }]}>
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <ThemedText style={[styles.hint, { color: colors.icon }]}>
              {accountType === 'individual' && t('auth.register.accountTypeIndividualHint')}
              {accountType === 'dealer' && t('auth.register.accountTypeDealerHint')}
              {accountType === 'company' && t('auth.register.accountTypeCompanyHint')}
            </ThemedText>
          </View>
        )}

        <ThemedText type="defaultSemiBold" style={styles.title}>
          {isSeller ? t('auth.register.titleSeller') : t('auth.register.titleBuyer')}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          {isSeller
            ? t('auth.register.subtitleSeller')
            : t('auth.register.subtitleBuyer')}
        </ThemedText>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>{t('auth.register.fullNameLabel')}</ThemedText>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: focusedField === 'fullName' ? colors.primary : colors.border,
                borderWidth: focusedField === 'fullName' ? 2 : 1,
              },
            ]}
          >
            <IconSymbol name="person.fill" size={18} color={focusedField === 'fullName' ? colors.primary : colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.fullNamePlaceholder')}
              placeholderTextColor={colors.icon}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>{t('auth.register.emailLabel')}</ThemedText>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: focusedField === 'email' ? colors.primary : colors.border,
                borderWidth: focusedField === 'email' ? 2 : 1,
              },
            ]}
          >
            <IconSymbol name="envelope.fill" size={18} color={focusedField === 'email' ? colors.primary : colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          <ThemedText style={[styles.hint, { color: colors.icon }]}>
            {t('auth.register.emailHint')}
          </ThemedText>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>{t('auth.register.passwordLabel')}</ThemedText>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: focusedField === 'password' ? colors.primary : colors.border,
                borderWidth: focusedField === 'password' ? 2 : 1,
              },
            ]}
          >
            <IconSymbol name="lock.fill" size={18} color={focusedField === 'password' ? colors.primary : colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.passwordPlaceholder')}
              placeholderTextColor={colors.icon}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>{t('auth.register.confirmPasswordLabel')}</ThemedText>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: focusedField === 'confirmPassword' ? colors.primary : colors.border,
                borderWidth: focusedField === 'confirmPassword' ? 2 : 1,
              },
            ]}
          >
            <IconSymbol name="lock.fill" size={18} color={focusedField === 'confirmPassword' ? colors.primary : colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              placeholderTextColor={colors.icon}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <IconSymbol name={showConfirm ? 'eye.slash.fill' : 'eye.fill'} size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isLoading ? colors.border : colors.primary }]}
          onPress={handleRegister}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? t('auth.register.creatingAccount') : t('auth.register.continueBtn')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/login-form' as any)}
        >
          <ThemedText style={[styles.loginLinkText, { color: colors.icon }]}>
            {t('auth.register.alreadyHaveAccount')}{' '}
            <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>{t('auth.register.loginLink')}</ThemedText>
          </ThemedText>
        </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },
  webContent: { width: '100%' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: { color: '#EF4444', fontSize: 14, flex: 1 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, outlineStyle: 'none' as any },
  eyeBtn: { padding: 4 },
  hint: { fontSize: 12, marginTop: 6 },
  switchContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  switchOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  switchOptionText: { fontSize: 15, fontWeight: '600' },
  accountTypeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  accountTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  accountTypeTabText: { fontSize: 13, fontWeight: '600' },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginLink: { marginTop: 24, alignSelf: 'center' },
  loginLinkText: { fontSize: 14 },
});
