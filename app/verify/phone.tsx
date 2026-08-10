import { StyleSheet, TextInput, ScrollView, View, TouchableOpacity, Platform, Image, Modal, FlatList, KeyboardAvoidingView, Text } from 'react-native';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import {  } from 'react-native';
import { countryData } from '@/lib/Phonenumbercodes';
import { isWeb } from '@/lib/platform';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setVerificationDraft } from '@/lib/verificationDraft';
import { sendPhoneOtpViaEmail, verifyPhoneOtp } from '@/lib/api-verifications';
import { getAuthUser } from '@/lib/userPreference';

interface CountryData {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  maxLength: number;
}

export default function PhoneVerificationScreen() {
  const colorScheme = useResolvedTheme();
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = isWeb && width >= 768;
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(countryData[0]); // Rwanda default
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryData;
    const query = searchQuery.toLowerCase();
    return countryData.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSendOTP = async () => {
    if (phoneNumber.length < selectedCountry.maxLength) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const normalizedPhone = `${selectedCountry.dialCode}${phoneNumber}`.replace(/\s+/g, '');
      await sendPhoneOtpViaEmail(normalizedPhone);
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const normalizedPhone = `${selectedCountry.dialCode}${phoneNumber}`.replace(/\s+/g, '');
      await verifyPhoneOtp(normalizedPhone, otpCode);

      // Get seller type from auth user to determine next screen
      const user = await getAuthUser();
      const sellerType = (user?.sellerType as 'individual' | 'company') || 'individual';

      await setVerificationDraft({
        phoneNumber: normalizedPhone,
        phoneVerified: true,
        sellerType,
      });

      // Business sellers go to id screen (RDB cert), individual go to id screen (ID front)
      router.push('/verify/id');
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCountry = (country: CountryData) => {
    setSelectedCountry(country);
    setPhoneNumber('');
    setSearchQuery('');
    setShowCountryPicker(false);
    setError('');
  };

  const renderCountryItem = ({ item }: { item: CountryData }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        { 
          backgroundColor: selectedCountry.code === item.code ? `${colors.primary}15` : colors.card,
          borderColor: selectedCountry.code === item.code ? colors.primary : colors.border 
        }
      ]}
      onPress={() => selectCountry(item)}
    >
      <Image source={{ uri: item.flag }} style={styles.countryFlag} />
      <ThemedText style={[styles.countryName, { color: colors.text }]}>{item.name}</ThemedText>
      <ThemedText style={[styles.countryDialCode, { color: colors.icon }]}>{item.dialCode}</ThemedText>
      {selectedCountry.code === item.code && (
        <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, isDesktopWeb && styles.webHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Phone Verification</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.progressStepText}>1</ThemedText>
          </View>
          <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.border }]}>
            <ThemedText style={[styles.progressStepText, { color: colors.icon }]}>2</ThemedText>
          </View>
          <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.border }]}>
            <ThemedText style={[styles.progressStepText, { color: colors.icon }]}>3</ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <IconSymbol name="phone.fill" size={48} color={colors.primary} />
          </View>
          
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {step === 'phone' ? 'Enter Your Phone Number' : 'Enter Verification Code'}
          </ThemedText>
          
          <ThemedText style={[styles.description, { color: colors.icon }]}>
            {step === 'phone' 
              ? 'We will send a verification code to your email as a fallback to confirm your identity.'
              : `Enter the 6-digit code sent to your email`
            }
          </ThemedText>

          {step === 'phone' ? (
            <View style={styles.inputContainer}>
              <View style={[styles.phoneInputWrapper, { backgroundColor: colors.card, borderColor: error ? '#ef4444' : colors.border }]}>
                <TouchableOpacity 
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(true)}
                  disabled={isLoading}
                >
                  <Image source={{ uri: selectedCountry.flag }} style={styles.selectedFlag} />
                  <ThemedText style={[styles.countryCode, { color: colors.text }]}>{selectedCountry.dialCode}</ThemedText>
                  <IconSymbol name="chevron.down" size={14} color={colors.icon} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TextInput
                  style={[styles.phoneInput, { color: colors.text }]}
                  placeholder="Phone number"
                  placeholderTextColor={colors.icon}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setError('');
                  }}
                  maxLength={selectedCountry.maxLength}
                  editable={!isLoading}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: phoneNumber.length < selectedCountry.maxLength || isLoading ? 0.6 : 1 }]}
                onPress={handleSendOTP}
                disabled={phoneNumber.length < selectedCountry.maxLength || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'Send Code'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <View style={[styles.otpContainer, { backgroundColor: colors.card, borderColor: error ? '#ef4444' : colors.border }]}>
                <TextInput
                  style={[styles.otpInput, { color: colors.text, letterSpacing: 8, fontSize: 18 }]}
                  placeholder="000000"
                  placeholderTextColor={colors.icon}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(text) => {
                    setOtpCode(text);
                    setError('');
                  }}
                  autoFocus
                  editable={!isLoading}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: otpCode.length < 6 || isLoading ? 0.6 : 1 }]}
                onPress={handleVerifyOTP}
                disabled={otpCode.length < 6 || isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton}
                onPress={() => {
                  setStep('phone');
                  setOtpCode('');
                  setError('');
                }}
                disabled={isLoading}
              >
                <ThemedText style={[styles.resendText, { color: colors.primary }]}>
                  Change phone number
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText type="defaultSemiBold" style={styles.modalTitle}>Select Country</ThemedText>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.icon} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search country or code..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.countryList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    paddingTop: 32,
    paddingBottom: 100,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
    marginTop: 24,
  },
  title: {
    fontSize: 22,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 320,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFlag: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
  },
  otpContainer: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',
    width: 120,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  countryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  countryFlag: {
    width: 32,
    height: 22,
    borderRadius: 3,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  countryDialCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
  },
});
