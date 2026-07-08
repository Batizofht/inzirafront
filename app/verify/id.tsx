import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { isWeb } from '@/lib/platform';
import { getVerificationDraft, setVerificationDraft } from '@/lib/verificationDraft';
import { submitSellerVerification } from '@/lib/api-verifications';
import { setSellerVerificationStatus } from '@/lib/userPreference';

type IDType = 'national_id' | 'passport' | 'driving_license' | null;

export default function IDVerificationScreen() {
  const colorScheme = useResolvedTheme();
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;

  const [sellerType, setSellerType] = useState<'individual' | 'company'>('individual');
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // Individual fields
  const [selectedIDType, setSelectedIDType] = useState<IDType>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);

  // Business fields
  const [rdbCertificate, setRdbCertificate] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    getVerificationDraft().then((draft) => {
      if (draft.sellerType) setSellerType(draft.sellerType as 'individual' | 'company');
      setIsLoadingDraft(false);
    });
  }, []);

  const idOptions = [
    { id: 'national_id', label: 'National ID', icon: 'person.fill' as const },
    { id: 'passport', label: 'Passport', icon: 'book.fill' as const },
    { id: 'driving_license', label: 'Driving License', icon: 'car.fill' as const },
  ];

  const pickImage = async (setter: (uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setter(result.assets[0].uri);
    }
  };

  // Individual: go to selfie next
  const handleIndividualContinue = async () => {
    if (!selectedIDType || !frontImage) return;
    setIsSubmitting(true);
    try {
      await setVerificationDraft({
        idType: selectedIDType,
        idFrontImage: frontImage,
      });
      router.push('/verify/selfie');
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  // Business: submit directly from here (no selfie step)
  const handleBusinessSubmit = async () => {
    if (!rdbCertificate) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const draft = await getVerificationDraft();
      if (!draft.phoneNumber) {
        throw new Error('Phone verification data missing. Please restart.');
      }

      await submitSellerVerification({
        phoneNumber: draft.phoneNumber,
        phoneVerified: Boolean(draft.phoneVerified),
        rdbCertificate,
      });

      await setSellerVerificationStatus('pending');
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinueIndividual = selectedIDType && frontImage;
  const canSubmitBusiness = !!rdbCertificate;

  if (isLoadingDraft) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {sellerType === 'company' ? 'Business Verification' : 'ID Verification'}
        </ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, { backgroundColor: colors.primary }]}>
            <IconSymbol name="checkmark" size={16} color="#fff" />
          </View>
          <View style={[styles.progressLine, { backgroundColor: colors.primary }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.progressStepText}>2</ThemedText>
          </View>
          {sellerType === 'individual' && (
            <>
              <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
              <View style={[styles.progressStep, { backgroundColor: colors.border }]}>
                <ThemedText style={[styles.progressStepText, { color: colors.icon }]}>3</ThemedText>
              </View>
            </>
          )}
        </View>

        <View style={styles.content}>
          {/* ── INDIVIDUAL: ID type + front image ── */}
          {sellerType === 'individual' && (
            <>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol name="person.fill" size={48} color={colors.primary} />
              </View>

              <ThemedText type="defaultSemiBold" style={styles.title}>
                Verify Your Identity
              </ThemedText>

              <ThemedText style={[styles.description, { color: colors.icon }]}>
                Select your ID type and upload a clear photo of the front side.
              </ThemedText>

              {/* ID Type Selection */}
              <View style={styles.idTypeContainer}>
                {idOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.idTypeButton,
                      {
                        backgroundColor: selectedIDType === option.id ? colors.primary : colors.card,
                        borderColor: selectedIDType === option.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedIDType(option.id as IDType);
                      setFrontImage(null);
                    }}
                  >
                    <IconSymbol
                      name={option.icon}
                      size={24}
                      color={selectedIDType === option.id ? '#fff' : colors.icon}
                    />
                    <ThemedText
                      style={[
                        styles.idTypeLabel,
                        { color: selectedIDType === option.id ? '#fff' : colors.text },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Front Image Upload */}
              {selectedIDType && (
                <View style={styles.uploadSection}>
                  <ThemedText style={[styles.uploadTitle, { color: colors.text }]}>
                    Upload Front Side
                  </ThemedText>

                  <TouchableOpacity
                    style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => pickImage(setFrontImage)}
                  >
                    {frontImage ? (
                      <Image source={{ uri: frontImage }} style={styles.uploadedImage} />
                    ) : (
                      <>
                        <IconSymbol name="camera.fill" size={28} color={colors.icon} />
                        <ThemedText style={[styles.uploadBoxText, { color: colors.icon }]}>
                          Front Side
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !canContinueIndividual || isSubmitting ? 0.5 : 1,
                  },
                ]}
                onPress={handleIndividualContinue}
                disabled={!canContinueIndividual || isSubmitting}
              >
                <ThemedText style={styles.buttonText}>
                  {isSubmitting ? 'Saving...' : 'Continue'}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          {/* ── BUSINESS: RDB Certificate ── */}
          {sellerType === 'company' && (
            <>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol name="building.2.fill" size={48} color={colors.primary} />
              </View>

              <ThemedText type="defaultSemiBold" style={styles.title}>
                Business Verification
              </ThemedText>

              <ThemedText style={[styles.description, { color: colors.icon }]}>
                Upload your RDB (Rwanda Development Board) business registration certificate.
              </ThemedText>

              <View style={styles.uploadSection}>
                <ThemedText style={[styles.uploadTitle, { color: colors.text }]}>
                  RDB Certificate
                </ThemedText>

                <TouchableOpacity
                  style={[
                    styles.uploadBoxLarge,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => pickImage(setRdbCertificate)}
                >
                  {rdbCertificate ? (
                    <Image source={{ uri: rdbCertificate }} style={styles.uploadedImage} />
                  ) : (
                    <>
                      <IconSymbol name="arrow.up.doc" size={32} color={colors.icon} />
                      <ThemedText style={[styles.uploadBoxText, { color: colors.icon, marginTop: 10 }]}>
                        Tap to upload certificate
                      </ThemedText>
                      <ThemedText style={[styles.uploadBoxSubText, { color: colors.icon }]}>
                        JPG, PNG accepted
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                {rdbCertificate && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setRdbCertificate(null)}
                  >
                    <IconSymbol name="trash" size={14} color="#EF4444" />
                    <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {submitError ? (
                <ThemedText style={[styles.errorText, { color: '#DC2626' }]}>
                  {submitError}
                </ThemedText>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !canSubmitBusiness || isSubmitting ? 0.5 : 1,
                  },
                ]}
                onPress={handleBusinessSubmit}
                disabled={!canSubmitBusiness || isSubmitting}
              >
                <ThemedText style={styles.buttonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webHeader: {
    paddingHorizontal: 400,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  idTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  idTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  idTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  uploadSection: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadBox: {
    width: 160,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadBoxLarge: {
    width: '100%',
    maxWidth: 320,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadBoxText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  uploadBoxSubText: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  removeBtnText: {
    fontSize: 13,
    color: '#EF4444',
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    maxWidth: 320,
  },
});
