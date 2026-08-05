import { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isWeb } from '@/lib/platform';

export interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

type ShareOption = {
  key: 'whatsapp' | 'facebook' | 'x' | 'telegram' | 'email';
  // Material Icons has no X/Twitter glyph, so that one option draws its
  // wordmark as text instead of an icon.
  icon?: string;
  glyph?: string;
  color: string;
  buildUrl: (url: string, title: string) => string;
};

const SHARE_OPTIONS: ShareOption[] = [
  {
    key: 'whatsapp',
    icon: 'message.fill',
    color: '#25D366',
    buildUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
  },
  {
    key: 'facebook',
    icon: 'person.2.fill',
    color: '#1877F2',
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'x',
    glyph: 'X',
    color: '#000000',
    buildUrl: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'telegram',
    icon: 'paperplane.fill',
    color: '#26A5E4',
    buildUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: 'email',
    icon: 'envelope.fill',
    color: '#6B7280',
    buildUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

export function ShareModal({ visible, onClose, url, title }: ShareModalProps) {
  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (isWeb && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // No clipboard module bundled for native — fall back to the OS share
        // sheet, which lets the user copy the link from there.
        const { Share } = require('react-native');
        await Share.share({ message: url });
      }
    } catch {
      // best-effort
    }
  };

  const handleOpenOption = (option: ShareOption) => {
    const target = option.buildUrl(url, title);
    Linking.openURL(target).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {t('share.title')}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            {SHARE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.optionItem}
                onPress={() => handleOpenOption(option)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: option.color },
                    // A pure black circle vanishes against the dark sheet.
                    option.key === 'x' && theme === 'dark' && styles.optionIconCircleOutlined,
                  ]}
                >
                  {option.glyph ? (
                    <ThemedText style={styles.optionGlyph}>{option.glyph}</ThemedText>
                  ) : (
                    <IconSymbol name={option.icon as any} size={20} color="#fff" />
                  )}
                </View>
                <ThemedText style={[styles.optionLabel, { color: colors.text }]}>
                  {t(`share.${option.key}`)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.copyRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.copyUrl, { color: colors.icon }]} numberOfLines={1}>
              {url}
            </ThemedText>
            <View style={[styles.copyBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.copyBtnText}>
                {copied ? t('share.copied') : t('share.copy')}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionItem: {
    alignItems: 'center',
    width: '18%',
    gap: 6,
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconCircleOutlined: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  optionGlyph: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
  optionLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  copyUrl: {
    flex: 1,
    fontSize: 12,
  },
  copyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
