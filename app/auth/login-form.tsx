import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, StatusBar, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { useAuth } from '@/context/AuthContext';
import { LoginSEO } from '@/components/page-meta';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { loginWithEmail } from '@/lib/userPreference';
import { isWeb } from '@/lib/platform';

export default function LoginFormScreen() {
  const { refreshUser } = useAuth();
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
  const authHeaderMaxWidth = is2Xl ? 1200 : isXl ? 1120 : isLg ? 1000 : 900;
  const authFormMaxWidth = is2Xl ? 800 : isXl ? 760 : isLg ? 700 : 640;
  const webHorizontalPadding = is2Xl ? 40 : isXl ? 32 : isLg ? 28 : 24;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginWithEmail(email.trim(), password);
      await refreshUser();
      // Redirect based on role
      if (user.role === 'seller') {
        router.replace('/(tabs)/profile' as any);
      } else {
        router.replace('/(tabs)/profile' as any);
      }
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      // Handle unverified email case
      if (msg.includes('not verified') || err?.data?.requiresVerification) {
        const userId = err?.data?.userId;
        if (userId) {
          router.push(`/auth/verify-otp?userId=${userId}&email=${encodeURIComponent(email.trim())}&mode=verify` as any);
          return;
        }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LoginSEO /> 
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
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Login</ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(60, insets.bottom) },
          isDesktopWeb && styles.webContent,
          isDesktopWeb && {
            maxWidth: authFormMaxWidth,
            paddingHorizontal: webHorizontalPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <IconSymbol name="person.fill" size={48} color={colors.primary} />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.title}>Welcome Back</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          Sign in to your Inzira account
        </ThemedText>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color="#EF4444" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Email Address</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="envelope.fill" size={18} color={colors.icon} style={styles.inputIcon} />
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
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: colors.icon }]}>Password</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={18} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Your password"
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

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isLoading ? colors.border : colors.primary }]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Signing in...' : 'Login'}
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <ThemedText style={[styles.dividerText, { color: colors.icon }]}>Don't have an account?</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/auth/login' as any)}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.outlineButtonText, { color: colors.primary }]}>
            Create Account
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
  },
  webContent: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: { color: '#EF4444', fontSize: 14, flex: 1 },
  formGroup: { width: '100%', marginBottom: 20 },
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
  inputIcon: {},
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { padding: 4 },
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  outlineButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600' },
});
