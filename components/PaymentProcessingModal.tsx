import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useColorScheme as useRNColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PaymentProcessingModalProps = {
  visible: boolean;
  status: 'processing' | 'success' | 'failed';
  message?: string;
  onDismiss?: () => void;
};

export function PaymentProcessingModal({
  visible,
  status,
  message,
  onDismiss,
}: PaymentProcessingModalProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: null,
          color: colors.warning,
          title: 'Processing Payment',
          description: message || 'Please approve the payment on your phone...',
        };
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success,
          title: 'Payment Successful',
          description: message || 'Your subscription has been activated!',
        };
      case 'failed':
        return {
          icon: 'close-circle' as const,
          color: colors.error,
          title: 'Payment Failed',
          description: message || 'Payment was not completed. Please try again.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Icon or Spinner */}
          <View style={styles.iconContainer}>
            {status === 'processing' ? (
              <ActivityIndicator size="large" color={config.color} />
            ) : (
              <Ionicons name={config.icon!} size={64} color={config.color} />
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {config.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {config.description}
          </Text>

          {/* Progress dots for processing */}
          {status === 'processing' && (
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, { backgroundColor: config.color }]} />
              <View style={[styles.dot, { backgroundColor: config.color }]} />
              <View style={[styles.dot, { backgroundColor: config.color }]} />
            </View>
          )}

          {/* Cancel option — lets the user back out of a stuck/pending payment */}
          {status === 'processing' && onDismiss && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
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
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
