import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, TextInput, useWindowDimensions, LayoutAnimation, UIManager, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Heading } from '@/components/heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { isWeb } from '@/lib/platform';
import { WebFooter } from '@/components/web-footer';
import { ContactSEO } from '@/components/page-meta';
import { createContactMessage } from '@/lib/api-contact-messages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function ContactScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Contact Us | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  // Responsive breakpoints
  const isLg = isWeb && width >= 1024 && width < 1440;
  const isXl = isWeb && width >= 1440 && width < 1920;
  const is2Xl = isWeb && width >= 1920;
  const webPaddingHorizontal = is2Xl ? 400 : isXl ? 160 : isLg ? 80 : 40;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams();

  // Pre-fill subject from URL params (e.g. from insurance page)
  useEffect(() => {
    const subjectParam = typeof params.subject === 'string' ? params.subject : '';
    if (subjectParam && !subject) {
      setSubject(subjectParam);
    }
  }, [params.subject]);
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!submitSuccess) return;

    const timeoutId = setTimeout(() => {
      setSubmitSuccess(null);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [submitSuccess]);

  const handleToggleFaq = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const handleSubmitContact = async () => {
    if (isSubmitting) return;

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };

    if (!payload.fullName || !payload.email || !payload.subject || !payload.message) {
      setSubmitSuccess(null);
      setSubmitError(t('legal.contact.fillAllFields'));
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);
      await createContactMessage(payload);
      setSubmitSuccess(t('legal.contact.sentSuccess'));
      setFullName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('legal.contact.sendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ContactSEO />
      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section - Full Width */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1600&q=90' }}
            style={styles.heroBackgroundImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <ThemedText style={styles.heroTagText}>{t('legal.contact.heroTag')}</ThemedText>
            </View>
            <Heading level={1} style={styles.heroTitle}>{t('legal.contact.heroTitle')}</Heading>
            <ThemedText style={styles.heroSubtitle}>
              {t('legal.contact.heroSubtitle')}
            </ThemedText>
          </View>
        </View>

        {/* Contact Section - 2 Column Layout on Web */}
        <View style={[styles.contactSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal, flexDirection: 'row', gap: 48 }]}>
          {/* Left Column - Contact Info */}
          <View style={[styles.contactInfoColumn, isDesktopWeb && styles.webContactInfoColumn]}>
            <ThemedText type="defaultSemiBold" style={styles.contactInfoTitle}>{t('legal.contact.contactInfoTitle')}</ThemedText>
            <ThemedText style={[styles.contactInfoSubtitle, { color: colors.icon }]}>
              {t('legal.contact.contactInfoSubtitle')}
            </ThemedText>

            <View style={styles.contactInfoList}>
              <View style={[styles.contactInfoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconBg, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name="phone.fill" size={24} color={colors.primary} />
                </View>
                <View style={styles.contactInfoText}>
                  <ThemedText style={styles.contactInfoLabel}>{t('legal.contact.phone')}</ThemedText>
                  <ThemedText style={[styles.contactInfoValue, { color: colors.text }]}>+250 788 307 583</ThemedText>
                </View>
              </View>

              <View style={[styles.contactInfoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconBg, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name="envelope.fill" size={24} color={colors.primary} />
                </View>
                <View style={styles.contactInfoText}>
                  <ThemedText style={styles.contactInfoLabel}>{t('legal.contact.email')}</ThemedText>
                  <ThemedText style={[styles.contactInfoValue, { color: colors.text }]}>info@inzira.co</ThemedText>
                </View>
              </View>

              <View style={[styles.contactInfoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconBg, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name="location.fill" size={24} color={colors.primary} />
                </View>
                <View style={styles.contactInfoText}>
                  <ThemedText style={styles.contactInfoLabel}>{t('legal.contact.address')}</ThemedText>
                  <ThemedText style={[styles.contactInfoValue, { color: colors.text }]}>Kigali, Rwanda</ThemedText>
                </View>
              </View>

              <View style={[styles.contactInfoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconBg, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol name="clock.fill" size={24} color={colors.primary} />
                </View>
                <View style={styles.contactInfoText}>
                  <ThemedText style={styles.contactInfoLabel}>{t('legal.contact.workingHours')}</ThemedText>
                  <ThemedText style={[styles.contactInfoValue, { color: colors.text }]}>{t('legal.contact.workingHoursValue')}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column - Contact Form */}
          <View style={[styles.formColumn, isDesktopWeb && styles.webFormColumn]}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText type="defaultSemiBold" style={styles.formTitle}>{t('legal.contact.formTitle')}</ThemedText>
              <ThemedText style={[styles.formSubtitle, { color: colors.icon }]}>
                {t('legal.contact.formSubtitle')}
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>{t('legal.contact.fullName')}</ThemedText>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
                  placeholder={t('legal.contact.fullNamePlaceholder')}
                  placeholderTextColor={colors.icon}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>{t('legal.contact.emailAddress')}</ThemedText>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
                  placeholder={t('legal.contact.emailPlaceholder')}
                  placeholderTextColor={colors.icon}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>{t('legal.contact.subject')}</ThemedText>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
                  placeholder={t('legal.contact.subjectPlaceholder')}
                  placeholderTextColor={colors.icon}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>{t('legal.contact.message')}</ThemedText>
                <TextInput 
                  style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} 
                  placeholder={t('legal.contact.messagePlaceholder')}
                  placeholderTextColor={colors.icon}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>

              {submitError ? <ThemedText style={{ color: '#DC2626', marginBottom: 12 }}>{submitError}</ThemedText> : null}
              {submitSuccess ? <ThemedText style={{ color: '#16A34A', marginBottom: 12 }}>{submitSuccess}</ThemedText> : null}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.75 : 1 }]}
                onPress={handleSubmitContact}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.submitBtnText}>{t('legal.contact.sendMessage')}</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={[styles.faqSection, isDesktopWeb && { paddingHorizontal: webPaddingHorizontal }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{t('legal.contact.faqTitle')}</ThemedText>
          <ThemedText style={[styles.faqSubtitle, { color: colors.icon }]}> 
            {t('legal.contact.faqSubtitle')}
          </ThemedText>

          <View style={styles.faqGrid}>
            {(t('legal.contact.faqItems', { returnObjects: true }) as { question: string; answer: string }[]).map((item, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <View key={index} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => handleToggleFaq(index)}
                    activeOpacity={0.85}>
                    <View style={[styles.faqIndex, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
                      <ThemedText style={[styles.faqIndexText, { color: colors.primary }]}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.faqQuestionContent}>
                      <ThemedText style={styles.faqQuestion}>{item.question}</ThemedText>
                      <ThemedText style={[styles.faqQuestionHint, { color: colors.icon }]}>
                        {isOpen ? t('legal.contact.tapToCollapse') : t('legal.contact.tapToExpand')}
                      </ThemedText>
                    </View>
                    <View style={[styles.faqChevronWrap, { backgroundColor: `${colors.primary}12` }]}>
                      <IconSymbol name={isOpen ? 'chevron.down' : 'chevron.right'} size={18} color={colors.primary} />
                    </View>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={[styles.faqAnswerWrap, { borderTopColor: colors.border, backgroundColor: `${colors.primary}06` }]}>
                      <View style={styles.faqAnswerHeader}>
                        <IconSymbol name="checkmark.seal.fill" size={15} color={colors.primary} />
                        <ThemedText style={[styles.faqAnswerHeaderText, { color: colors.primary }]}>{t('legal.contact.detailedAnswer')}</ThemedText>
                      </View>
                      <ThemedText style={[styles.faqAnswer, { color: colors.icon }]}>{item.answer}</ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <View style={{marginBottom:insets.bottom}} />
        </View>
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  heroContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 0,
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingVertical:4
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 500,
  },
  contactSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  contactInfoColumn: {
    marginBottom: 32,
  },
  webContactInfoColumn: {
    flex: 1,
    marginBottom: 0,
  },
  contactInfoTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  contactInfoSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  contactInfoList: {
    gap: 16,
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfoText: {
    flex: 1,
  },
  contactInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  contactInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  formColumn: {
    flex: 1,
  },
  webFormColumn: {
    flex: 1.2,
  },
  formCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 15,
    minHeight: 120,
  },
  submitBtn: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  faqSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 14,
    textAlign: 'center',
  },
  faqSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  faqGrid: {
    gap: 12,
  },
  faqCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  faqQuestionContent: {
    flex: 1,
  },
  faqQuestionHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  faqChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  faqAnswerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  faqAnswerHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  faqIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  faqIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 24,
  },
  scrollContent: {
    // paddingBottom: 40,
  },
});
