import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, StatusBar, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { useAuth } from '@/context/AuthContext';
import { RegisterSEO } from '@/components/page-meta';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { registerUser } from '@/lib/userPreference';
import { isWeb } from '@/lib/platform';
import { subscribeToPlan } from '@/lib/api-subscriptions';

export default function RegisterScreen() {
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
  const [sellerType, setSellerType] = useState<'individual' | 'company'>('individual');

  const isSeller = role === 'seller';

  const validate = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
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
        sellerType: isSeller ? sellerType : undefined
      });
      // Go to OTP verification
      router.push(
        `/auth/verify-otp?userId=${result.userId}&email=${encodeURIComponent(result.email)}&role=${result.role}&mode=register` as any
      );
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
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
          Create Account
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
            Registering as {isSeller ? 'Seller' : 'Buyer'}
          </ThemedText>
        </View>

        {isSeller && (
          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: colors.icon }]}>Seller Type</ThemedText>
            <View style={[styles.switchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.switchOption, sellerType === 'individual' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                onPress={() => setSellerType('individual')}
              >
                <IconSymbol name="person.fill" size={18} color={sellerType === 'individual' ? colors.primary : colors.icon} />
                <ThemedText style={[styles.switchOptionText, { color: sellerType === 'individual' ? colors.primary : colors.text }]}>
                  Individual
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchOption, sellerType === 'company' && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
                onPress={() => setSellerType('company')}
              >
                <IconSymbol name="building.2.fill" size={18} color={sellerType === 'company' ? colors.primary : colors.icon} />
                <ThemedText style={[styles.switchOptionText, { color: sellerType === 'company' ? colors.primary : colors.text }]}>
                  Company
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ThemedText type="defaultSemiBold" style={styles.title}>
          {isSeller ? 'Create Seller Account' : 'Create Buyer Account'}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          {isSeller
            ? 'Enter your details. We\'ll send a verification code to your email.'
            : 'Enter your details to start browsing and buying vehicles.'}
        </ThemedText>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Full Name</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="person.fill" size={18} color={colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your names"
              placeholderTextColor={colors.icon}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Email Address</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="envelope.fill" size={18} color={colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <ThemedText style={[styles.hint, { color: colors.icon }]}>
            A 6-digit verification code will be sent to this email
          </ThemedText>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Password</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={18} color={colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.icon}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <IconSymbol name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Confirm Password</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={18} color={colors.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Repeat your password"
              placeholderTextColor={colors.icon}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
            {isLoading ? 'Creating Account...' : 'Continue'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/login-form' as any)}
        >
          <ThemedText style={[styles.loginLinkText, { color: colors.icon }]}>
            Already have an account?{' '}
            <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Login</ThemedText>
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
  input: { flex: 1, fontSize: 15 },
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
