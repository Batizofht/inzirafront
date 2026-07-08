import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, Image } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { isWeb } from '@/lib/platform';
import { setSellerVerificationStatus } from '@/lib/userPreference';
import { getVerificationDraft, clearVerificationDraft } from '@/lib/verificationDraft';
import { submitSellerVerification } from '@/lib/api-verifications';

export default function SelfieVerificationScreen() {
  const colorScheme = useResolvedTheme();
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelfieImage(asset.uri);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelfieImage(asset.uri);
    }
  };

  const handleComplete = async () => {
    if (!selfieImage) return;
    setSubmitError('');
    setIsProcessing(true);

    try {
      const draft = await getVerificationDraft();
      if (!draft.phoneNumber || !draft.idType || !draft.idFrontImage) {
        throw new Error('Verification data is incomplete. Please restart verification process.');
      }

      await submitSellerVerification({
        phoneNumber: draft.phoneNumber,
        phoneVerified: Boolean(draft.phoneVerified),
        idType: draft.idType,
        idFrontImage: draft.idFrontImage,
        selfieImage,
      });

      await setSellerVerificationStatus('pending');
      await clearVerificationDraft();

      setIsProcessing(false);
      setIsComplete(true);
      setTimeout(() => {
        router.push('/(tabs)/profile');
      }, 1500);
    } catch (error: any) {
      setIsProcessing(false);
      setSubmitError(error?.message || 'Failed to submit verification. Please try again.');
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Selfie Verification</ThemedText>
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
            <IconSymbol name="checkmark" size={16} color="#fff" />
          </View>
          <View style={[styles.progressLine, { backgroundColor: colors.primary }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.progressStepText}>3</ThemedText>
          </View>
        </View>

        {!isComplete ? (
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol name="person.fill" size={48} color={colors.primary} />
            </View>
            
            <ThemedText type="defaultSemiBold" style={styles.title}>
              Take a Selfie
            </ThemedText>
            
            <ThemedText style={[styles.description, { color: colors.icon }]}>
              Please take a clear selfie to verify your identity matches your ID document.
            </ThemedText>

            {/* Guidelines */}
            <View style={[styles.guidelinesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={[styles.guidelinesTitle, { color: colors.text }]}>
                Guidelines:
              </ThemedText>
              <View style={styles.guidelineItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                <ThemedText style={[styles.guidelineText, { color: colors.icon }]}>
                  Face the camera directly
                </ThemedText>
              </View>
              <View style={styles.guidelineItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                <ThemedText style={[styles.guidelineText, { color: colors.icon }]}>
                  Ensure good lighting
                </ThemedText>
              </View>
              <View style={styles.guidelineItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                <ThemedText style={[styles.guidelineText, { color: colors.icon }]}>
                  Remove glasses if possible
                </ThemedText>
              </View>
              <View style={styles.guidelineItem}>
                <IconSymbol name="checkmark.circle.fill" size={16} color={colors.primary} />
                <ThemedText style={[styles.guidelineText, { color: colors.icon }]}>
                  Keep a neutral expression
                </ThemedText>
              </View>
            </View>

            {/* Selfie Preview */}
            {selfieImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
                <TouchableOpacity
                  style={[styles.retakeButton, { borderColor: colors.border }]}
                  onPress={() => setSelfieImage(null)}
                >
                  <IconSymbol name="arrow.counterclockwise" size={16} color={colors.text} />
                  <ThemedText style={[styles.retakeText, { color: colors.text }]}>
                    Retake
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraOptions}>
                <TouchableOpacity
                  style={[styles.cameraButton, { backgroundColor: colors.primary }]}
                  onPress={takeSelfie}
                >
                  <IconSymbol name="camera.fill" size={28} color="#fff" />
                  <ThemedText style={styles.cameraButtonText}>Take Selfie</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.galleryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={pickFromLibrary}
                >
                  <IconSymbol name="photo" size={24} color={colors.icon} />
                  <ThemedText style={[styles.galleryButtonText, { color: colors.text }]}>
                    Choose from Gallery
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[
                styles.primaryButton, 
                { 
                  backgroundColor: colors.primary, 
                  opacity: !selfieImage || isProcessing ? 0.5 : 1 
                }
              ]}
              onPress={handleComplete}
              disabled={!selfieImage || isProcessing}
            >
              <ThemedText style={styles.buttonText}>
                {isProcessing ? 'Verifying...' : 'Complete Verification'}
              </ThemedText>
            </TouchableOpacity>
            {submitError ? (
              <ThemedText style={[styles.errorText, { color: '#DC2626' }]}> 
                {submitError}
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <View style={styles.content}>
            <View style={[styles.successIcon, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol name="checkmark.seal.fill" size={64} color={colors.primary} />
            </View>
            
            <ThemedText type="defaultSemiBold" style={styles.title}>
              Verification Submitted
            </ThemedText>

            
            
            <ThemedText style={[styles.description, { color: colors.icon }]}> 
              Your verification is now pending review. You will be notified once your seller account is approved.
            </ThemedText>
          </View>
        )}
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
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
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
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  guidelinesCard: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guidelineText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  cameraOptions: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginBottom: 32,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 12,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  selfiePreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '500',
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
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    maxWidth: 360,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});
