import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createGuestPurchaseRequest } from '@/lib/api-contact-requests';
import { setAuthSession, type AuthUser } from '@/lib/userPreference';
import { startConversation } from '@/lib/api-messages';
import { isWeb } from '@/lib/platform';

interface GuestPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleTitle: string;
  /**
   * Known details for a signed-in buyer whose profile is missing a phone.
   * Prefilled and locked so they only have to supply what's actually absent.
   */
  prefill?: { fullName?: string | null; email?: string | null; phone?: string | null };
}

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  /** Submission failures that belong to no single field. */
  form?: string;
}

interface SellerContact {
  name: string;
  phone: string;
  email: string;
}

export function GuestPurchaseModal({
  visible,
  onClose,
  vehicleId,
  vehicleTitle,
  prefill,
}: GuestPurchaseModalProps) {
  const theme = useResolvedTheme();
  const colors = Colors[theme];

  const [formData, setFormData] = useState<FormData>({
    fullName: prefill?.fullName ?? '',
    email: prefill?.email ?? '',
    phone: prefill?.phone ?? '',
    message: '',
  });

  // Identity comes from the signed-in account; only the gaps stay editable.
  const lockedName = Boolean(prefill?.fullName);
  const lockedEmail = Boolean(prefill?.email);

  // The modal mounts before the profile resolves, so sync once it arrives.
  useEffect(() => {
    if (!prefill) return;
    setFormData((prev) => ({
      ...prev,
      fullName: prefill.fullName ?? prev.fullName,
      email: prefill.email ?? prev.email,
      phone: prev.phone || (prefill.phone ?? ''),
    }));
  }, [prefill?.fullName, prefill?.email, prefill?.phone]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sellerContact, setSellerContact] = useState<SellerContact | null>(null);
  const [isNewAccount, setIsNewAccount] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[0-9\s\-()]{8,}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await createGuestPurchaseRequest({
        vehicleId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim() || undefined,
      });

      if (response.status === 1) {
        // The backend creates a real account for this email and hands back a
        // session token. That token used to be dropped on the floor, which left
        // the buyer signed out on a device that had just been given an account -
        // so every messaging and notification endpoint (all auth-only) refused
        // them, and their single email was the only channel they ever got.
        // Adopting the session is what makes the reply thread reachable.
        const { token, user } = response.data;
        if (token && user) {
          await setAuthSession(token, user as AuthUser);

          // The signed-in Buy Now path opens a conversation alongside the
          // contact request; the guest path never did, so there was no thread
          // for the seller's reply to land in.
          try {
            await startConversation(
              vehicleId,
              formData.message.trim() ||
                `Hi, I'm interested in ${vehicleTitle}. Is it still available?`,
            );
          } catch (convErr) {
            // A missing thread must not fail the purchase - the request itself
            // already reached the seller.
            console.warn('Guest conversation could not be opened:', convErr);
          }
        }

        setSellerContact(response.data.sellerContact);
        setIsNewAccount(Boolean(response.data.isNewAccount));
        setShowSuccess(true);
      } else {
        // A non-1 status still resolves, so without this the modal would sit
        // there doing nothing and look like the button was dead.
        setErrors({ form: response.message || 'Failed to submit request' });
      }
    } catch (error: any) {
      console.error('Guest purchase error:', error);
      const message = error?.message || 'Failed to submit request';
      // Not a Full Name problem — attaching it there labelled every API and
      // network failure as a validation error on the first field.
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: prefill?.fullName ?? '',
      email: prefill?.email ?? '',
      phone: prefill?.phone ?? '',
      message: '',
    });
    setErrors({});
    setShowSuccess(false);
    setSellerContact(null);
    setIsNewAccount(false);
    onClose();
  };

  const renderSuccessState = () => (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: `${colors.primary}20` }]}>
        <IconSymbol name="checkmark.circle.fill" size={48} color={colors.primary} />
      </View>

      <ThemedText type="title" style={styles.successTitle}>
        Request Sent Successfully!
      </ThemedText>

      <ThemedText style={[styles.successSubtitle, { color: colors.icon }]}>
        {sellerContact
          ? "Here's how to contact the seller:"
          : "You've already sent a request for this vehicle. The seller has your details and will be in touch."}
      </ThemedText>

      {sellerContact && (
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contactRow}>
            <IconSymbol name="person.fill" size={20} color={colors.primary} />
            <View style={styles.contactTextContainer}>
              <ThemedText style={[styles.contactLabel, { color: colors.icon }]}>Seller Name</ThemedText>
              <ThemedText type="defaultSemiBold">{sellerContact.name}</ThemedText>
            </View>
          </View>

          <View style={styles.contactRow}>
            <IconSymbol name="phone.fill" size={20} color={colors.primary} />
            <View style={styles.contactTextContainer}>
              <ThemedText style={[styles.contactLabel, { color: colors.icon }]}>Phone</ThemedText>
              <ThemedText type="defaultSemiBold">{sellerContact.phone}</ThemedText>
            </View>
          </View>

          <View style={styles.contactRow}>
            <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
            <View style={styles.contactTextContainer}>
              <ThemedText style={[styles.contactLabel, { color: colors.icon }]}>Email</ThemedText>
              <ThemedText type="defaultSemiBold">{sellerContact.email}</ThemedText>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
        <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
        <ThemedText style={[styles.infoText, { color: colors.text }]}>
          {isNewAccount
            ? "We've also sent this information to your email along with your login credentials."
            : "We've also sent this information to your email."}
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleClose}>
        <ThemedText style={styles.buttonText}>Close</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderFormState = () => (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <ThemedText type="title" style={styles.modalTitle}>
          Contact Seller
        </ThemedText>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
        Interested in {vehicleTitle}? Fill in your details to get the seller's contact information.
      </ThemedText>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Full Name *</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: colors.card, 
                borderColor: errors.fullName ? '#EF4444' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Enter your full name"
            placeholderTextColor={colors.icon}
            value={formData.fullName}
            onChangeText={(text) => {
              setFormData({ ...formData, fullName: text });
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
            editable={!isSubmitting && !lockedName}
          />
          {errors.fullName && (
            <ThemedText style={styles.errorText}>{errors.fullName}</ThemedText>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Email *</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: colors.card, 
                borderColor: errors.email ? '#EF4444' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="your.email@example.com"
            placeholderTextColor={colors.icon}
            value={formData.email}
            onChangeText={(text) => {
              setFormData({ ...formData, email: text });
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isSubmitting && !lockedEmail}
          />
          {errors.email && (
            <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Phone *</ThemedText>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: colors.card, 
                borderColor: errors.phone ? '#EF4444' : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="+250 XXX XXX XXX"
            placeholderTextColor={colors.icon}
            value={formData.phone}
            onChangeText={(text) => {
              setFormData({ ...formData, phone: text });
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            keyboardType="phone-pad"
            editable={!isSubmitting}
          />
          {errors.phone && (
            <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Message (Optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Add a message for the seller..."
            placeholderTextColor={colors.icon}
            value={formData.message}
            onChangeText={(text) => setFormData({ ...formData, message: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        {errors.form && (
          <View style={styles.formErrorBox}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
            <ThemedText style={styles.formErrorText}>{errors.form}</ThemedText>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: isSubmitting ? 0.6 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Get Seller Contact</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      {/* This form asks for a phone number and a message, both of which sat
          under the Android keyboard because the modal had no keyboard handling
          at all. */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
            isWeb && styles.webModalContainer,
          ]}>
          {showSuccess ? renderSuccessState() : renderFormState()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  webModalContainer: {
    maxWidth: 500,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -4,
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444415',
    borderColor: '#EF444440',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  button: {
    padding: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  contactCard: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 20,
    gap: 20,
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactTextContainer: {
    flex: 1,
    gap: 4,
  },
  contactLabel: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 24,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
