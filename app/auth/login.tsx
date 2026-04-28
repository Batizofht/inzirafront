import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, StatusBar, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { isWeb } from '@/lib/platform';

export default function RoleSelectorScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Sign In | Inzira';
    }
  }, []);

  const [selectedType, setSelectedType] = useState<'buyer' | 'seller' | null>(null);
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
  const authContainerMaxWidth = is2Xl ? 800 : isXl ? 760 : isLg ? 700 : 640;
  const webHorizontalPadding = is2Xl ? 40 : isXl ? 32 : isLg ? 28 : 24;

  const handleCreateAccount = () => {
    if (!selectedType) return;
    router.push(`/auth/register?role=${selectedType}` as any);
  };

  const handleLogin = () => {
    router.push('/auth/login-form' as any);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
        style={[styles.backBtn, isDesktopWeb && { paddingHorizontal: webHorizontalPadding }]}
      >
        <IconSymbol name="chevron.left" size={24} color={colors.text} />
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(40, insets.bottom) },
          isDesktopWeb && styles.webContent,
          isDesktopWeb && {
            maxWidth: authContainerMaxWidth,
            paddingHorizontal: webHorizontalPadding,
          },
        ]}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <IconSymbol name="car.fill" size={48} color={colors.primary} />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.title}>Welcome to Inzira</ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          Select how you want to use the app
        </ThemedText>

        <View style={styles.optionsContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: selectedType === 'buyer' ? `${colors.primary}15` : colors.card,
                borderColor: selectedType === 'buyer' ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setSelectedType('buyer')}
            android_ripple={{ color: `${colors.primary}30` }}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol name="car.fill" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.optionTitle}>I'm a Buyer</ThemedText>
              <ThemedText style={[styles.optionDesc, { color: colors.icon }]}>
                Browse and purchase vehicles
              </ThemedText>
            </View>
            {selectedType === 'buyer' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: selectedType === 'seller' ? `${colors.primary}15` : colors.card,
                borderColor: selectedType === 'seller' ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => setSelectedType('seller')}
            android_ripple={{ color: `${colors.primary}30` }}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol name="plus.circle.fill" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionTextContainer}>
              <ThemedText type="defaultSemiBold" style={styles.optionTitle}>I'm a Seller</ThemedText>
              <ThemedText style={[styles.optionDesc, { color: colors.icon }]}>
                List and manage your vehicles
              </ThemedText>
            </View>
            {selectedType === 'seller' && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: selectedType ? colors.primary : colors.border,
              shadowColor: selectedType ? colors.primary : 'transparent',
            },
          ]}
          onPress={handleCreateAccount}
          disabled={!selectedType}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.buttonText}>Create Account</ThemedText>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <ThemedText style={[styles.dividerText, { color: colors.icon }]}>or</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: colors.primary }]}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.outlineButtonText, { color: colors.primary }]}>
            Already have an account? Login
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
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  webContent: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
    minHeight: 90,
    marginBottom: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 18, marginBottom: 4 },
  optionDesc: { fontSize: 14 },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  outlineButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
