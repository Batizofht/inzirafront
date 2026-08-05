import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors, Elevation } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { isWeb } from '@/lib/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
function RoleOptionCard({
  icon,
  title,
  desc,
  selected,
  onPress,
  colors,
}: {
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const highlighted = selected || isHovered;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        {
          backgroundColor: selected ? `${colors.primary}12` : isHovered ? `${colors.primary}08` : colors.card,
          borderColor: highlighted ? colors.primary : colors.border,
          borderWidth: highlighted ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      android_ripple={{ color: `${colors.primary}30` }}
    >
      <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
        <IconSymbol name={icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.optionTextContainer}>
        <ThemedText type="defaultSemiBold" style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={[styles.optionDesc, { color: colors.icon }]}>{desc}</ThemedText>
      </View>
      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: selected ? colors.primary : 'transparent',
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
      >
        {selected && <IconSymbol name="checkmark" size={14} color="#fff" />}
      </View>
    </Pressable>
  );
}

function AuthActionButton({
  label,
  onPress,
  disabled,
  variant = 'solid',
  colors,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  colors: (typeof Colors)['light'];
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'outline') {
    return (
      <Pressable
        style={[
          styles.outlineButton,
          {
            borderColor: colors.primary,
            backgroundColor: isHovered ? `${colors.primary}0C` : 'transparent',
          },
        ]}
        onPress={onPress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <ThemedText style={[styles.outlineButtonText, { color: colors.primary }]}>{label}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.button,
        Elevation.raised,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.4 : 1,
          shadowOpacity: disabled ? 0 : isHovered ? 0.16 : 0.1,
          transform: [{ translateY: isHovered && !disabled ? -1 : 0 }],
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

export default function RoleSelectorScreen() {
  const { t } = useTranslation();
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
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;

  const authContainerMaxWidth = 440;
  const webHorizontalPadding = is2Xl ? 40 : isXl ? 32 : isLg ? 28 : 24;

  const handleCreateAccount = () => {
    if (!selectedType) return;
    router.push(`/auth/register?role=${selectedType}` as any);
  };

  const handleLogin = () => {
    router.push('/auth/login-form' as any);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border },
          isDesktopWeb && {
            width: '100%',
            maxWidth: authContainerMaxWidth,
            alignSelf: 'center',
            paddingHorizontal: webHorizontalPadding,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          style={styles.backBtn}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('auth.roleSelect.welcome')}</ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={isDesktopWeb}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 },
          isDesktopWeb && styles.webContent,
          isDesktopWeb && {
            maxWidth: authContainerMaxWidth,
            paddingHorizontal: webHorizontalPadding,
          },
        ]}
      >
        <View
          style={[
            { width: '100%', alignItems: 'center' },
            isDesktopWeb && [
              styles.webCard,
              { backgroundColor: colors.background, borderColor: colors.border },
              Elevation.raised,
            ],
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <IconSymbol name="car.fill" size={32} color={colors.primary} />
          </View>

          <ThemedText type="defaultSemiBold" style={styles.title}>{t('auth.roleSelect.welcome')}</ThemedText>

          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.roleSelect.subtitle')}
          </ThemedText>

          <View style={styles.optionsContainer}>
            <RoleOptionCard
              icon="car.fill"
              title={t('auth.roleSelect.buyerTitle')}
              desc={t('auth.roleSelect.buyerDesc')}
              selected={selectedType === 'buyer'}
              onPress={() => setSelectedType('buyer')}
              colors={colors}
            />
            <RoleOptionCard
              icon="plus.circle.fill"
              title={t('auth.roleSelect.sellerTitle')}
              desc={t('auth.roleSelect.sellerDesc')}
              selected={selectedType === 'seller'}
              onPress={() => setSelectedType('seller')}
              colors={colors}
            />
          </View>

          <AuthActionButton
            label={t('auth.roleSelect.createAccount')}
            onPress={handleCreateAccount}
            disabled={!selectedType}
            colors={colors}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <ThemedText style={[styles.dividerText, { color: colors.icon }]}>{t('auth.roleSelect.or')}</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <AuthActionButton
            label={t('auth.roleSelect.alreadyHaveAccount')}
            onPress={handleLogin}
            variant="outline"
            colors={colors}
          />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  webContent: {
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  webCard: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    minHeight: 72,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 15.5, marginBottom: 2 },
  optionDesc: { fontSize: 12.5, lineHeight: 16 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  outlineButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
