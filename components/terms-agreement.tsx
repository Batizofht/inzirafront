import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

/**
 * Required agreement to the Terms of Use (EULA) shown before registering or
 * signing in (App Store guideline 1.2). The terms make clear there is zero
 * tolerance for objectionable content and abusive users.
 */
export function TermsAgreement({
  checked,
  onToggle,
  showError,
}: {
  checked: boolean;
  onToggle: () => void;
  showError?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const borderColor = showError && !checked ? '#EF4444' : colors.border;

  return (
    <View style={[styles.box, { borderColor, backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.row}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <IconSymbol
          name={checked ? 'checkmark.square.fill' : 'square'}
          size={24}
          color={checked ? colors.primary : colors.icon}
        />
        <ThemedText style={[styles.text, { color: colors.text }]}>
          {t('moderation.terms.agreePrefix')}{' '}
          <ThemedText style={[styles.link, { color: colors.primary }]} onPress={() => router.push('/terms' as any)}>
            {t('moderation.terms.termsLink')}
          </ThemedText>{' '}
          {t('moderation.terms.and')}{' '}
          <ThemedText style={[styles.link, { color: colors.primary }]} onPress={() => router.push('/guidelines' as any)}>
            {t('moderation.terms.guidelinesLink')}
          </ThemedText>
          .
        </ThemedText>
      </TouchableOpacity>
      <ThemedText style={[styles.zeroTolerance, { color: colors.icon }]}>
        {t('moderation.terms.zeroTolerance')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  zeroTolerance: { fontSize: 12, lineHeight: 17, marginTop: 8, marginLeft: 34 },
});
