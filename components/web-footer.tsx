import { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Pressable, Linking } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { isWeb } from '@/lib/platform';
import { openWhatsApp } from '@/lib/whatsapp';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import { getThemeModePreference, setThemeModePreference, subscribeThemePreference } from '@/lib/themePreference';

const LOGO_IMAGE = require('@/assets/images/Logo.png');

// Web-native link component that renders as an <a> tag with hover support + client-side nav
function WebLink({ href, children, style }: { href: string; children: React.ReactNode; style?: any }) {
  const [hovered, setHovered] = useState(false);

  const handlePress = (e?: any) => {
    if (e) {
      e.preventDefault();
    }
    router.push(href as any);
  };

  if (!isWeb) {
    return (
      <Pressable onPress={handlePress} style={style}>
        {children}
      </Pressable>
    );
  }
  // Use any type for web-specific props
  const WebView = View as any;

  return (
    <WebView
      accessibilityRole="link"
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handlePress}
      style={[
        { cursor: 'pointer' },
        style,
        hovered && styles.linkItemHovered,
      ]}
    >
      {children}
    </WebView>
  );
}

const FOOTER_LINK_PATHS = {
  company: [
    { key: 'about', path: '/about' },
    { key: 'careers', path: '/careers' },
    { key: 'press', path: '/press' },
  ],
  support: [
    { key: 'help', path: '/help' },
    { key: 'safety', path: '/safety' },
    { key: 'guidelines', path: '/guidelines' },
    { key: 'report', path: '/report' },
    { key: 'contact', path: '/contact' },
  ],
  legal: [
    { key: 'terms', path: '/terms' },
    { key: 'privacy', path: '/privacy' },
    { key: 'cookies', path: '/cookies' },
    { key: 'accessibility', path: '/accessibility' },
  ],
};

type SocialLink = {
  icon: any;
  label: string;
  color: string;
  /** Plain link opened as-is. */
  url?: string;
  /** Custom opener, for links that need per-device handling (WhatsApp). */
  open?: () => void;
};

const SOCIAL_LINKS: SocialLink[] = [
  // WhatsApp goes through openWhatsApp so desktop lands on WhatsApp Web
  // instead of the wa.me "Continue to Chat" page.
  { icon: require('@/assets/social/whatsapp.png'), label: 'WhatsApp', color: '#25D366', open: () => openWhatsApp({ phone: '250788307583' }) },
  { icon: require('@/assets/social/instagram.png'), label: 'Instagram', color: '#E4405F', url: 'https://www.instagram.com/inzira.co?utm_source=qr' },
  { icon: require('@/assets/social/tiktok.png'), label: 'TikTok', color: '#111111', url: 'https://www.tiktok.com/@inzira.co?_r=1&_t=ZS-98IMhe0iOHt' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
];

export function WebFooter() {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const isMobile = width < 768;
  const isVerySmallMobile = width < 393;
  // Desktop scaling breakpoints
  const isCompact = width >= 768 && width < 1200;
  const isLg = width >= 1024 && width < 1440;
  const isXl = width >= 1440 && width < 1920;
  const is2Xl = width >= 1920;

  // Dynamic padding based on screen size
  const footerPadding = is2Xl ? 200 : isXl ? 120 : isLg ? 80 : isCompact ? 40 : isMobile ? 8 : 48;
  const contentMaxWidth = is2Xl ? 1600 : isXl ? 1400 : 1200;

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [themeMode, setThemeMode] = useState(() => getThemeModePreference());

  useEffect(() => {
    const unsubscribe = subscribeThemePreference(() => {
      setThemeMode(getThemeModePreference());
    });
    return () => { unsubscribe(); };
  }, []);

  if (!isWeb) return null;

  const handleSubscribe = () => {
    setEmailError('');
    if (!email.trim()) {
      setEmailError(t('footer.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t('footer.emailInvalid'));
      return;
    }
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  return (
    <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Main Footer Content */}
      <View style={[styles.footerMain, (isMobile || isCompact) && styles.footerMainCompact, { paddingHorizontal: footerPadding, maxWidth: contentMaxWidth }]}>
        {/* Brand & Subscription Section */}
        <View style={[styles.brandSection, (isMobile || isCompact) && styles.brandSectionCompact]}>
          <View style={styles.brandHeader}>
            <View style={styles.logoContainer}>
              <Image source={LOGO_IMAGE} style={styles.brandLogo} contentFit="contain" />
              <ThemedText style={[styles.brandName, { color: colors.text }]}>
                Inzira
              </ThemedText>
            </View>
            <ThemedText style={[styles.brandTagline, { color: colors.icon }]}>
              {t('footer.brandTagline')}
            </ThemedText>
          </View>

          <ThemedText style={[styles.brandDescription, { color: colors.icon }]}>
            {t('footer.brandDescription')}
          </ThemedText>

          {/* Car Subscription Form */}
          <View style={[styles.subscriptionBox, isMobile && styles.subscriptionBoxMobile]}>
            <ThemedText style={[styles.subscriptionTitle, { color: colors.text }]}>
              <IconSymbol name="bell.fill" size={14} color={colors.primary} /> {t('footer.subscriptionTitle')}
            </ThemedText>
            <ThemedText style={[styles.subscriptionDesc, { color: colors.icon }]}>
              {t('footer.subscriptionDesc')}
            </ThemedText>

            {subscribed ? (
              <View style={[styles.successMessage, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                <ThemedText style={[styles.successText, { color: colors.primary }]}>
                  {t('footer.subscriptionSuccess')}
                </ThemedText>
              </View>
            ) : (
              <>
              <View style={[styles.subscriptionForm, isMobile && styles.subscriptionFormMobile]}>
                <TextInput
                  style={[styles.emailInput, isMobile && styles.emailInputMobile, {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: emailError ? '#EF4444' : colors.border,
                  }]}
                  placeholder={t('footer.emailPlaceholder')}
                  placeholderTextColor={colors.icon}
                  value={email}
                  onChangeText={(txt) => { setEmail(txt); setEmailError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.subscribeBtn, isMobile && styles.subscribeBtnMobile, { backgroundColor: colors.primary }]}
                  onPress={handleSubscribe}
                >
                  <ThemedText style={styles.subscribeBtnText}>{t('footer.subscribeBtn')}</ThemedText>
                </TouchableOpacity>
              </View>
              {!!emailError && (
                <ThemedText style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>{emailError}</ThemedText>
              )}
            </>
            )}
          </View>
        </View>

        {/* Links Sections */}
        <View style={[styles.linksContainer, (isMobile || isCompact) && (isVerySmallMobile ? styles.linksContainerVerySmall : styles.linksContainerCompact)]}>
          {/* Company Links */}
          <View style={styles.linkColumn}>
            <ThemedText style={[styles.linkColumnTitle, { color: colors.text }]}>
              {t('footer.company')}
            </ThemedText>
            {FOOTER_LINK_PATHS.company.map((link) => (
              <WebLink key={link.path} href={link.path} style={styles.linkItem}>
                <ThemedText style={[styles.linkText, { color: colors.icon }]}>
                  {t(`footer.companyLinks.${link.key}`)}
                </ThemedText>
              </WebLink>
            ))}
          </View>

          {/* Support Links */}
          <View style={styles.linkColumn}>
            <ThemedText style={[styles.linkColumnTitle, { color: colors.text }]}>
              {t('footer.support')}
            </ThemedText>
            {FOOTER_LINK_PATHS.support.map((link) => (
              <WebLink key={link.path} href={link.path} style={styles.linkItem}>
                <ThemedText style={[styles.linkText, { color: colors.icon }]}>
                  {t(`footer.supportLinks.${link.key}`)}
                </ThemedText>
              </WebLink>
            ))}
          </View>

          {/* Legal Links */}
          <View style={styles.linkColumn}>
            <ThemedText style={[styles.linkColumnTitle, { color: colors.text }]}>
              {t('footer.legal')}
            </ThemedText>
            {FOOTER_LINK_PATHS.legal.map((link) => (
              <WebLink key={link.path} href={link.path} style={styles.linkItem}>
                <ThemedText style={[styles.linkText, { color: colors.icon }]}>
                  {t(`footer.legalLinks.${link.key}`)}
                </ThemedText>
              </WebLink>
            ))}
          </View>
        </View>
      </View>

      {/* Contact Bar */}
      <View style={[styles.contactBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: footerPadding }]}>
        <View style={[styles.contactContent, (isMobile || isCompact) && styles.contactContentCompact, { maxWidth: contentMaxWidth }]}>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <IconSymbol name="phone.fill" size={16} color={colors.primary} />
              <ThemedText style={[styles.contactText, { color: colors.text }]}>
                +250 788 307 583
              </ThemedText>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <IconSymbol name="envelope.fill" size={16} color={colors.primary} />
              <ThemedText style={[styles.contactText, { color: colors.text }]}>
                info@inzira.co
              </ThemedText>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactItem}>
              <IconSymbol name="location.fill" size={16} color={colors.primary} />
              <ThemedText style={[styles.contactText, { color: colors.text }]}>
                Kigali, Rwanda
              </ThemedText>
            </View>
          </View>

          {/* Social Links */}
          <View style={styles.socialLinks}>
            {SOCIAL_LINKS.map((social) => (
              <TouchableOpacity
                key={social.label}
                style={[styles.socialBtn, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (social.open) social.open();
                  else if (social.url) Linking.openURL(social.url);
                }}
              >
                <Image source={social.icon} style={{ width: 30, height: 30 }} contentFit="contain" />
              </TouchableOpacity>
            ))}

            {/* Language Selector */}
            <View style={styles.langContainer}>
              <TouchableOpacity
                style={[styles.langButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowLangDropdown((prev) => !prev)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: LANGUAGES.find(l => l.code === i18n.language)?.flag || 'https://flagcdn.com/w40/gb.png' }} style={{ width: 20, height: 14, borderRadius: 2 }} contentFit="cover" />
                <IconSymbol name={showLangDropdown ? "chevron.up" : "chevron.down"} size={10} color={colors.icon} />
              </TouchableOpacity>

              {showLangDropdown && (
                <>
                  <Pressable
                    style={styles.dropdownOverlay}
                    onPress={() => setShowLangDropdown(false)}
                  />
                  <View style={[styles.langDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.langDropdownArrow} />
                    <View style={styles.langDropdownContent}>
                      {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                          key={lang.code}
                          style={[
                            styles.langOption,
                            i18n.language === lang.code && styles.langOptionActive,
                          ]}
                          onPress={() => {
                            changeLanguage(lang.code);
                            setShowLangDropdown(false);
                          }}
                          activeOpacity={0.85}
                        >
                          <Image source={{ uri: lang.flag }} style={{ width: 24, height: 16, borderRadius: 2 }} contentFit="cover" />
                          <View style={styles.langOptionInfo}>
                            <ThemedText style={styles.langOptionLabel}>{lang.name}</ThemedText>
                          </View>
                          {i18n.language === lang.code && (
                            <IconSymbol name="checkmark" size={14} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, isMobile && styles.bottomBarMobile, { backgroundColor: colors.primary, paddingHorizontal: footerPadding }]}>
        <ThemedText style={styles.copyrightText}>
          {t('footer.copyright')}
        </ThemedText>
        <View style={styles.paymentMethods}>
          <View style={styles.paymentIcons}>
            <View style={[styles.paymentBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemedText style={styles.paymentBadgeText}>MTN MoMo</ThemedText>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemedText style={styles.paymentBadgeText}>Airtel Money</ThemedText>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemedText style={styles.paymentBadgeText}>Bank Transfer</ThemedText>
            </View>
          </View>
        </View>
        {/* Dark Mode Toggle */}
        <TouchableOpacity
          style={styles.darkModeToggle}
          onPress={() => {
            const next = themeMode === 'dark' ? 'light' : 'dark';
            setThemeModePreference(next);
            setThemeMode(next);
          }}
          activeOpacity={0.8}
        >
          <IconSymbol name={themeMode === 'dark' ? 'sun.max.fill' : 'moon.fill'} size={16} color="#fff" />
          <ThemedText style={styles.darkModeToggleText}>
            {themeMode === 'dark' ? t('footer.lightMode') : t('footer.darkMode')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    borderTopWidth: 1,
    marginTop: 20,
    marginBottom: 0,
  },
  footerMain: {
    flexDirection: 'row',
    paddingVertical: 48,
    gap: 64,
    alignSelf: 'center',
    width: '100%',
  },
  footerMainCompact: {
    flexDirection: 'column',
    paddingVertical: 32,
    gap: 32,
  },
  brandSection: {
    flex: 1.2,
    minWidth: 300,
  },
  brandSectionCompact: {
    minWidth: '100%',
  },
  brandHeader: {
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  brandLogo: {
    width: 30,
    height: 30,
     borderRadius: 5,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '500',
  },
  brandDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  subscriptionBox: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 8,
  },
  subscriptionBoxMobile: {
    padding: 12,
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  subscriptionForm: {
    flexDirection: 'row',
    gap: 10,
  },
  subscriptionFormMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  emailInputMobile: {
    width: '100%',
    minWidth: 0,
    height: 54,
    minHeight: 54,
  },
  subscribeBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeBtnMobile: {
    width: '100%',
    height: 54,
    minHeight: 54,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linksContainer: {
    flex: 2,
    flexDirection: 'row',
    gap: 48,
    justifyContent: 'flex-end',
  },
  linksContainerCompact: {
    flexDirection:'row',
    flexWrap: 'wrap',
    gap: 48,
    justifyContent: 'center',
    width: '100%',
    marginTop: 70,
  },
  linksContainerVerySmall: {
    flexDirection:'column',
    gap: 16,
    width: '100%',
    marginTop: 24,
    marginLeft:40
  },
  linkColumn: {
    minWidth: 140,
  },
  linkColumnTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  linkItem: {
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkItemHovered: {
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  linkText: {
    fontSize: 14,
  },
  contactBar: {
    borderTopWidth: 1,
    paddingVertical: 20,
  },
  contactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  contactContentCompact: {
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBar: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  bottomBarMobile: {
    justifyContent: 'center',
  },
  copyrightText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentMethods: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  paymentIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  langContainer: {
    position: 'relative',
    marginLeft: 12,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  langFlag: {
    fontSize: 16,
  },
  langDropdown: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 100001,
  },
  langDropdownArrow: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
    zIndex: 99999,
  },
  langDropdownContent: {
    gap: 2,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  langOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  langOptionFlag: {
    fontSize: 20,
  },
  langOptionInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  langOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100000,
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  darkModeToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
