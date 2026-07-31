import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useColorScheme as useRNColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PaymentPlanOption = {
  id: string;
  name: string;
  price: number;
};

export type PaymentModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber: string, planId?: string) => Promise<void>;
  title: string;
  description: string;
  amount: number;
  currency?: string;
  defaultPhoneNumber?: string;
  initialPlanId?: string;
  plans?: PaymentPlanOption[];
};

export function PaymentModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  amount,
  currency = 'RWF',
  defaultPhoneNumber = '',
  initialPlanId,
  plans,
}: PaymentModalProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';

  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    initialPlanId ?? plans?.[0]?.id
  );

  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    card: isDark ? '#2C2C2E' : '#F5F5F5',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    border: isDark ? '#3A3A3C' : '#E5E5E5',
    primary: '#007AFF',
    danger: '#FF3B30',
  };

  React.useEffect(() => {
    if (visible && defaultPhoneNumber) {
      setPhoneNumber(defaultPhoneNumber);
    }
  }, [visible, defaultPhoneNumber]);

  useEffect(() => {
    if (visible) {
      setSelectedPlanId(initialPlanId ?? plans?.[0]?.id);
    }
    // Only reset the plan choice when the modal opens, not on every plans/initialPlanId re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
  const displayAmount = selectedPlan ? selectedPlan.price : amount;

  const handleConfirm = async () => {
    if (!phoneNumber.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please enter your phone number');
      }
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(phoneNumber, selectedPlanId);
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="card-outline" size={32} color={colors.primary} />
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>

          {/* Plan Selector */}
          {plans && plans.length > 0 && (
            <View style={styles.planRow}>
              {plans.map((plan) => {
                const selected = plan.id === selectedPlanId;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? `${colors.primary}15` : colors.card,
                      },
                    ]}
                    onPress={() => setSelectedPlanId(plan.id)}
                    disabled={isProcessing}
                  >
                    <Text style={[styles.planName, { color: selected ? colors.primary : colors.text }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planPrice, { color: selected ? colors.primary : colors.textSecondary }]}>
                      {formatAmount(plan.price)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Amount */}
          <View style={[styles.amountContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              Amount to Pay
            </Text>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatAmount(displayAmount)}
            </Text>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Mobile Money Phone Number
            </Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="078xxxxxxx"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                editable={!isProcessing}
                maxLength={10}
              />
            </View>
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              You will receive a payment prompt on your phone
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: colors.primary },
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isProcessing || !phoneNumber.trim()}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  planName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  inputHint: {
    fontSize: 13,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {

  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
