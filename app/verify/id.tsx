import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, Image } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { router } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { isWeb } from '@/lib/platform';
import { setVerificationDraft } from '@/lib/verificationDraft';

type IDType = 'national_id' | 'passport' | 'driving_license' | null;

export default function IDVerificationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  
  const [selectedIDType, setSelectedIDType] = useState<IDType>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const idOptions = [
    { id: 'national_id', label: 'National ID', icon: 'person.fill' as const },
    { id: 'passport', label: 'Passport', icon: 'book.fill' as const },
    { id: 'driving_license', label: 'Driving License', icon: 'car.fill' as const },
  ];

  const pickImage = async (side: 'front' | 'back') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const imageValue = asset.uri;
      if (side === 'front') {
        setFrontImage(imageValue);
      } else {
        setBackImage(imageValue);
      }
    }
  };

  const handleContinue = async () => {
    if (!selectedIDType || !frontImage) return;
    setIsUploading(true);
    try {
      await setVerificationDraft({
        idType: selectedIDType,
        idFrontImage: frontImage,
        idBackImage: needsBackImage ? (backImage || undefined) : undefined,
      });

      setTimeout(() => {
        setIsUploading(false);
        router.push('/verify/selfie');
      }, 300);
    } catch {
      setIsUploading(false);
    }
  };

  const needsBackImage = selectedIDType === 'national_id' || selectedIDType === 'driving_license';
  const canContinue = selectedIDType && frontImage && (!needsBackImage || backImage);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>ID Verification</ThemedText>
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
          <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.border }]}>
            <ThemedText style={[styles.progressStepText, { color: colors.icon }]}>3</ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <IconSymbol name="person.fill" size={48} color={colors.primary} />
          </View>
          
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Verify Your Identity
          </ThemedText>
          
          <ThemedText style={[styles.description, { color: colors.icon }]}>
            Select your ID type and upload clear photos of your document.
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
                  }
                ]}
                onPress={() => {
                  setSelectedIDType(option.id as IDType);
                  setFrontImage(null);
                  setBackImage(null);
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
                    { color: selectedIDType === option.id ? '#fff' : colors.text }
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload Section */}
          {selectedIDType && (
            <View style={styles.uploadSection}>
              <ThemedText style={[styles.uploadTitle, { color: colors.text }]}>
                Upload Document Photos
              </ThemedText>

              <View style={styles.uploadRow}>
                {/* Front Side */}
                <TouchableOpacity
                  style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => pickImage('front')}
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

                {/* Back Side (if needed) */}
                {needsBackImage && (
                  <TouchableOpacity
                    style={[styles.uploadBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => pickImage('back')}
                  >
                    {backImage ? (
                      <Image source={{ uri: backImage }} style={styles.uploadedImage} />
                    ) : (
                      <>
                        <IconSymbol name="camera.fill" size={28} color={colors.icon} />
                        <ThemedText style={[styles.uploadBoxText, { color: colors.icon }]}>
                          Back Side
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {selectedIDType === 'passport' && (
                <ThemedText style={[styles.passportNote, { color: colors.icon }]}>
                  For passport, only the photo page is required.
                </ThemedText>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              { 
                backgroundColor: colors.primary, 
                opacity: !canContinue || isUploading ? 0.5 : 1 
              }
            ]}
            onPress={handleContinue}
            disabled={!canContinue || isUploading}
          >
            <ThemedText style={styles.buttonText}>
              {isUploading ? 'Uploading...' : 'Continue'}
            </ThemedText>
          </TouchableOpacity>
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
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  uploadBox: {
    width: 140,
    height: 100,
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
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  passportNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
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
});
