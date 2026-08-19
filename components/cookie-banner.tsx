import { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isWeb } from '@/lib/platform';

function CookieButton({
  label,
  onPress,
  variant,
  colors,
}: {
  label: string;
  onPress: () => void;
  variant: 'solid' | 'outline' | 'text';
  colors: (typeof Colors)['light'];
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'text') {
    return (
      <Pressable
        style={styles.linkBtn}
        onPress={onPress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <ThemedText style={[styles.linkBtnText, { color: colors.text, textDecorationLine: isHovered ? 'underline' : 'none' }]}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable
        style={[
          styles.btn,
          styles.btnOutline,
          { borderColor: colors.border, backgroundColor: isHovered ? colors.card : 'transparent' },
        ]}
        onPress={onPress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <ThemedText style={[styles.btnText, { color: colors.text }]}>{label}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.btn, { backgroundColor: colors.primary, opacity: isHovered ? 0.9 : 1 }]}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <ThemedText style={[styles.btnText, { color: '#fff' }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function CookieBanner() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];

  // Start hidden and decide after mount. Reading localStorage in the state
  // initialiser ran during render, so the Node static export produced markup
  // with no banner while the browser's first render produced one - a hydration
  // mismatch (React #418) on every single route, since this banner sits in the
  // shared web layout. React responded by discarding the pre-rendered HTML and
  // re-rendering the whole tree on the client, which is exactly the slow,
  // visibly-assembling first paint we are fixing.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    if (!localStorage.getItem('cookie_consent')) setVisible(true);
  }, []);

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
        <View style={styles.textRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>
            <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
          </View>
          <ThemedText style={[styles.text, { color: colors.text }]}>
            This website uses cookies and similar technologies to enable our website functionalities. We also share information about your use of our site with our social media, advertising and analytics partners. For more details see "Cookie preferences".
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <CookieButton label="Cookie preferences" onPress={handlePreferences} variant="text" colors={colors} />
          <CookieButton label="Reject all" onPress={handleReject} variant="outline" colors={colors} />
          <CookieButton label="Accept all" onPress={handleAccept} variant="solid" colors={colors} />
        </View>
        <Pressable style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleDismiss}>
          <IconSymbol name="xmark" size={14} color={colors.icon} />
        </Pressable>
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    zIndex: 99999,
    ...Elevation.raised,
    shadowOffset: { width: 0, height: -6 },
  },
  content: {
    flexDirection: 'column',
    gap: Spacing.md,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingRight: 30,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  btnOutline: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    marginRight: Spacing.xs,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
