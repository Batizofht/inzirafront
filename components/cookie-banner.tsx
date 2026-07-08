import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isWeb } from '@/lib/platform';

export function CookieBanner() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];

  const [visible, setVisible] = useState(() => {
    if (!isWeb || typeof window === 'undefined') return false;
    return !localStorage.getItem('cookie_consent');
  });

  if (!isWeb || !visible) return null;

  const handleAccept = () => {
    if (typeof window !== 'undefined') localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    if (typeof window !== 'undefined') localStorage.setItem('cookie_consent', 'rejected');
    setVisible(false);
  };

  const handlePreferences = () => {
    if (typeof window !== 'undefined') localStorage.setItem('cookie_consent', 'preferences');
    setVisible(false);
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') localStorage.setItem('cookie_consent', 'dismissed');
    setVisible(false);
  };

  return (
    <View style={[styles.banner, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={styles.content}>
        <ThemedText style={[styles.text, { color: colors.text }]}>
          This website uses cookies and similar technologies to enable our website functionalities. We also share information about your use of our site with our social media, advertising and analytics partners. For more details see "Cookie preferences".
        </ThemedText>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, { borderColor: colors.text }]}
            onPress={handlePreferences}
          >
            <ThemedText style={[styles.btnText, { color: colors.text }]}>Cookie preferences</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.text }]}
            onPress={handleReject}
          >
            <ThemedText style={[styles.btnText, { color: colors.background }]}>Reject all</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.text }]}
            onPress={handleAccept}
          >
            <ThemedText style={[styles.btnText, { color: colors.background, fontWeight: '700' }]}>Accept all</ThemedText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <IconSymbol name="xmark" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  content: {
    flexDirection: 'column',
    gap: 14,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    paddingRight: 30,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 6,
  },
  btnOutline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 6,
  },
});
